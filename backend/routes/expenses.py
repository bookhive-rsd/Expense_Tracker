from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Any, Dict
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
    
    result = await db.expenses.insert_one(expense_dict)
    created_expense = await db.expenses.find_one({"_id": result.inserted_id})
    if created_expense is None:
        # Fallback: construct a created_expense from the inserted data if the find returned None
        created_expense = expense_dict.copy()
        created_expense["_id"] = str(result.inserted_id)
    else:
        created_expense["_id"] = str(created_expense["_id"])
    
    return ExpenseInDB(**created_expense)

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
    query: Dict[str, Any] = {"user_id": current_user.id}
    
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
    
    for expense in expenses:
        expense["_id"] = str(expense["_id"])
    
    return [ExpenseInDB(**expense) for expense in expenses]

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
    
    updated_expense = await db.expenses.find_one({"_id": ObjectId(expense_id), "user_id": current_user.id})
    if not updated_expense:
        raise HTTPException(status_code=404, detail="Expense not found after update")
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