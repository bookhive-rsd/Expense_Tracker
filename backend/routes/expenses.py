from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId

from database.mongo import get_database
from models.schemas import ExpenseCreate, Expense, ExpenseInDB, UserInDB, CategoryEnum
from routes.auth import get_current_user
from services.ai_service import AIService

router = APIRouter()

@router.post("/", response_model=ExpenseInDB)
async def create_expense(
    expense: ExpenseCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    db = await get_database()
    ai_service = AIService()
    
    # Predict category if not provided
    if not expense.category:
        predicted_category = await ai_service.predict_category(expense.item_name)
        expense.category = predicted_category
    
    # Get AI suggestions for the item
    ai_suggestions = await ai_service.get_item_suggestions(
        expense.item_name,
        expense.category,
        expense.amount
    )
    
    expense_dict = expense.dict()
    expense_dict["user_id"] = current_user.id
    expense_dict["predicted_category"] = expense.category
    expense_dict["ai_suggestions"] = ai_suggestions
    expense_dict["created_at"] = datetime.utcnow()
    
    # If it's a group expense, also add to group
    if expense.is_group_expense and expense.group_id:
        try:
            if not ObjectId.is_valid(expense.group_id):
                raise HTTPException(status_code=400, detail=f"Invalid group_id format: {expense.group_id}")
            
            group = await db.groups.find_one({"_id": ObjectId(expense.group_id)})
            
            if not group:
                raise HTTPException(status_code=404, detail="Group not found")
            
            is_owner = str(group["owner_id"]) == current_user.id
            is_member = any(m["user_id"] == current_user.id for m in group.get("members", []))
            
            if not (is_owner or is_member):
                raise HTTPException(status_code=403, detail="Not a member of this group")
            
            # Calculate splits
            splits = {}
            num_members = len(group["members"]) + 1  # +1 for owner
            
            if expense.split_equally:
                per_person = expense.amount / num_members
                splits[group["owner_id"]] = per_person
                for member in group["members"]:
                    splits[member["user_id"]] = per_person
            else:
                splits = expense.custom_splits or {}
            
            # Save expense first
            result = await db.expenses.insert_one(expense_dict)
            expense_id = str(result.inserted_id)
            
            # Add expense to group
            group_expense = {
                "description": expense.item_name,
                "total_amount": expense.amount,
                "paid_by": current_user.id,
                "paid_by_name": current_user.name,
                "split_type": "equal" if expense.split_equally else "custom",
                "splits": splits,
                "date": expense.date,
                "category": expense.category,
                "expense_id": expense_id
            }
            
            # Update group balances - who owes whom
            balances = group.get("balances", {})
            for user_id, amount in splits.items():
                if user_id != current_user.id:  # Everyone except payer owes the payer
                    if user_id not in balances:
                        balances[user_id] = {}
                    current_owed = balances[user_id].get(current_user.id, 0)
                    balances[user_id][current_user.id] = current_owed + amount
            
            # Add to group
            await db.groups.update_one(
                {"_id": ObjectId(expense.group_id)},
                {
                    "$push": {"expenses": group_expense},
                    "$set": {"balances": balances}
                }
            )
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error adding expense to group: {e}")
    else:
        result = await db.expenses.insert_one(expense_dict)
        expense_id = str(result.inserted_id)
    
    created_expense = await db.expenses.find_one({"_id": ObjectId(expense_id)})
    created_expense["_id"] = str(created_expense["_id"])
    created_expense["id"] = str(created_expense["_id"])
    
    return created_expense

@router.get("/", response_model=List[ExpenseInDB])
async def get_expenses(
    skip: int = 0,
    limit: int = 100,
    category: Optional[CategoryEnum] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    db = await get_database()
    
    query = {"user_id": current_user.id}
    
    if category:
        query["category"] = category
    
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["date"] = {"$gte": start_date}
    elif end_date:
        query["date"] = {"$lte": end_date}
    
    if search:
        query["$or"] = [
            {"item_name": {"$regex": search, "$options": "i"}},
            {"notes": {"$regex": search, "$options": "i"}}
        ]
    
    cursor = db.expenses.find(query).sort("date", -1).skip(skip).limit(limit)
    expenses = await cursor.to_list(length=limit)
    
    # Also get group expenses where user is a member
    groups = await db.groups.find({
        "$or": [
            {"owner_id": current_user.id},
            {"members.user_id": current_user.id},
            {"members.email": current_user.email}
        ]
    }).to_list(length=100)
    
    group_ids = [str(g["_id"]) for g in groups]
    
    if group_ids:
        group_expense_query = {
            "is_group_expense": True,
            "group_id": {"$in": group_ids},
            "user_id": {"$ne": current_user.id}
        }
        
        if category:
            group_expense_query["category"] = category
        if "date" in query:
            group_expense_query["date"] = query["date"]
        if search and "$or" in query:
            group_expense_query["$or"] = query["$or"]
        
        group_expenses = await db.expenses.find(group_expense_query).sort("date", -1).to_list(length=100)
        
        for exp in group_expenses:
            exp["is_member_view"] = True
            
            group_id = exp.get('group_id')
            if group_id:
                try:
                    group = await db.groups.find_one({"_id": ObjectId(group_id)})
                    if group:
                        for group_exp in group.get('expenses', []):
                            if group_exp.get('expense_id') == str(exp['_id']):
                                user_share = group_exp.get('splits', {}).get(current_user.id, 0)
                                exp["user_share"] = user_share
                                exp["paid_by_name"] = group_exp.get("paid_by_name", "Member")
                                break
                except:
                    pass
        
        expenses.extend(group_expenses)
        expenses.sort(key=lambda x: x.get('date', datetime.min), reverse=True)
    
    result = []
    for expense in expenses[:limit]:
        expense_id = str(expense["_id"])
        expense["_id"] = expense_id
        expense["id"] = expense_id
        result.append(expense)
    
    return result

@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    db = await get_database()
    
    expense = await db.expenses.find_one({
        "_id": ObjectId(expense_id),
        "user_id": current_user.id
    })
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # If it's a group expense, remove from group and recalculate balances
    if expense.get('is_group_expense') and expense.get('group_id'):
        try:
            group_id = expense.get('group_id')
            
            # Get the group to find the expense details
            group = await db.groups.find_one({"_id": ObjectId(group_id)})
            if group:
                # Find the expense being deleted
                deleted_expense_splits = None
                deleted_expense_paid_by = None
                
                for group_exp in group.get('expenses', []):
                    if group_exp.get('expense_id') == expense_id:
                        deleted_expense_splits = group_exp.get('splits', {})
                        deleted_expense_paid_by = group_exp.get('paid_by')
                        break
                
                # Remove expense from group's expenses array
                await db.groups.update_one(
                    {"_id": ObjectId(group_id)},
                    {"$pull": {"expenses": {"expense_id": expense_id}}}
                )
                
                # Recalculate balances by subtracting the deleted expense's contribution
                if deleted_expense_splits and deleted_expense_paid_by:
                    balances = group.get('balances', {})
                    
                    # Subtract the amounts that were owed for this expense
                    for user_id, amount in deleted_expense_splits.items():
                        if user_id != deleted_expense_paid_by:
                            if user_id in balances and deleted_expense_paid_by in balances[user_id]:
                                current_owed = balances[user_id][deleted_expense_paid_by]
                                new_owed = current_owed - amount
                                
                                if new_owed <= 0.01:  # Remove if essentially zero
                                    del balances[user_id][deleted_expense_paid_by]
                                    if not balances[user_id]:  # Remove user key if no debts
                                        del balances[user_id]
                                else:
                                    balances[user_id][deleted_expense_paid_by] = new_owed
                    
                    await db.groups.update_one(
                        {"_id": ObjectId(group_id)},
                        {"$set": {"balances": balances}}
                    )
                
                print(f"Removed expense {expense_id} from group {group_id} and updated balances")
        except Exception as e:
            print(f"Error removing from group: {e}")
    
    # Delete the expense
    result = await db.expenses.delete_one({
        "_id": ObjectId(expense_id),
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    return {"message": "Expense deleted successfully"}

@router.get("/summary/totals")
async def get_expense_totals(
    period: str = Query("monthly", regex="^(daily|weekly|monthly|quarterly|yearly)$"),
    current_user: UserInDB = Depends(get_current_user)
):
    db = await get_database()
    now = datetime.utcnow()
    
    period_map = {
        "daily": now - timedelta(days=1),
        "weekly": now - timedelta(weeks=1),
        "monthly": now - timedelta(days=30),
        "quarterly": now - timedelta(days=90),
        "yearly": now - timedelta(days=365)
    }
    
    start_date = period_map[period]
    
    # Get personal (non-group) expenses only
    personal_expenses = await db.expenses.find({
        "user_id": current_user.id,
        "date": {"$gte": start_date},
        "$or": [
            {"is_group_expense": {"$exists": False}},
            {"is_group_expense": False}
        ]
    }).to_list(length=10000)
    
    # Get groups user is part of
    groups = await db.groups.find({
        "$or": [
            {"owner_id": current_user.id},
            {"members.user_id": current_user.id}
        ]
    }).to_list(length=100)
    
    # Calculate totals by category
    category_totals = {}
    
    # Add personal expenses
    for expense in personal_expenses:
        category = expense.get('category', 'other')
        if category not in category_totals:
            category_totals[category] = {"total": 0, "count": 0}
        
        category_totals[category]["total"] += expense.get('amount', 0)
        category_totals[category]["count"] += 1
    
    # Add user's share from group expenses
    for group in groups:
        for group_exp in group.get('expenses', []):
            expense_date = group_exp.get('date')
            if expense_date and expense_date >= start_date:
                user_share = group_exp.get('splits', {}).get(current_user.id, 0)
                if user_share > 0:
                    category = group_exp.get('category', 'other')
                    if category not in category_totals:
                        category_totals[category] = {"total": 0, "count": 0}
                    category_totals[category]["total"] += user_share
                    category_totals[category]["count"] += 1
    
    final_results = [
        {"_id": cat, "total": data["total"], "count": data["count"]}
        for cat, data in category_totals.items()
    ]
    final_results.sort(key=lambda x: x["total"], reverse=True)
    
    total_amount = sum(item["total"] for item in final_results)
    
    return {
        "period": period,
        "total_amount": total_amount,
        "by_category": final_results
    }

@router.get("/{expense_id}", response_model=ExpenseInDB)
async def get_expense(
    expense_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    db = await get_database()
    expense = await db.expenses.find_one({
        "_id": ObjectId(expense_id),
        "user_id": current_user.id
    })
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    expense["_id"] = str(expense["_id"])
    return ExpenseInDB(**expense)

@router.put("/{expense_id}", response_model=ExpenseInDB)
async def update_expense(
    expense_id: str,
    expense_update: ExpenseCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    db = await get_database()
    
    existing_expense = await db.expenses.find_one({
        "_id": ObjectId(expense_id),
        "user_id": current_user.id
    })
    
    if not existing_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    update_dict = expense_update.dict(exclude_unset=True)
    
    await db.expenses.update_one(
        {"_id": ObjectId(expense_id)},
        {"$set": update_dict}
    )
    
    updated_expense = await db.expenses.find_one({"_id": ObjectId(expense_id)})
    updated_expense["_id"] = str(updated_expense["_id"])
    
    return ExpenseInDB(**updated_expense)
