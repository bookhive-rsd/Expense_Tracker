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
            # Verify group_id is a valid ObjectId
            if not ObjectId.is_valid(expense.group_id):
                raise HTTPException(status_code=400, detail=f"Invalid group_id format: {expense.group_id}")
            
            # Verify user has access to the group
            group = await db.groups.find_one({"_id": ObjectId(expense.group_id)})
            
            if not group:
                raise HTTPException(status_code=404, detail="Group not found")
            
            # Check if user is owner or member
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
            
            # Add expense to group
            group_expense = {
                "description": expense.item_name,
                "total_amount": expense.amount,
                "paid_by": current_user.id,
                "split_type": "equal" if expense.split_equally else "custom",
                "splits": splits,
                "date": expense.date,
                "category": expense.category,
                "expense_id": None  # Will be set after creating personal expense
            }
            
            # Update group balances
            balances = group.get("balances", {})
            for user_id, amount in splits.items():
                if user_id != current_user.id:
                    if user_id not in balances:
                        balances[user_id] = {}
                    current_owed = balances[user_id].get(current_user.id, 0)
                    balances[user_id][current_user.id] = current_owed + amount
            
            # Save expense first
            result = await db.expenses.insert_one(expense_dict)
            expense_id = str(result.inserted_id)
            
            # Update group expense with expense_id
            group_expense["expense_id"] = expense_id
            
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
            # Continue anyway - expense is saved even if group update fails
    else:
        # Regular personal expense
        result = await db.expenses.insert_one(expense_dict)
        expense_id = str(result.inserted_id)
    
    created_expense = await db.expenses.find_one({"_id": ObjectId(expense_id)})
    created_expense["_id"] = str(created_expense["_id"])
    created_expense["id"] = str(created_expense["_id"])  # Add id field
    
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
    
    result = []
    for expense in expenses:
        expense_id = str(expense["_id"])
        expense["_id"] = expense_id
        expense["id"] = expense_id  # Add id field explicitly
        result.append(expense)
    
    return result

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

@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    db = await get_database()
    
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
    
    pipeline = [
        {"$match": {
            "user_id": current_user.id,
            "date": {"$gte": start_date}
        }},
        {"$group": {
            "_id": "$category",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"total": -1}}
    ]
    
    results = await db.expenses.aggregate(pipeline).to_list(length=100)
    
    total_amount = sum(item["total"] for item in results)
    
    return {
        "period": period,
        "total_amount": total_amount,
        "by_category": results
    }
