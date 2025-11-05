from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

from database.mongo import get_database
from models.schemas import UserInDB, UserSettings, BudgetGoal, RecurringExpense
from routes.auth import get_current_user

router = APIRouter()

@router.put("/preferences")
async def update_user_settings(
    settings: UserSettings,
    current_user: UserInDB = Depends(get_current_user)
):
    """Update user preferences"""
    db = await get_database()
    
    await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": {"settings": settings.dict()}}
    )
    
    return {"message": "Settings updated successfully", "settings": settings}

@router.get("/preferences")
async def get_user_settings(
    current_user: UserInDB = Depends(get_current_user)
):
    """Get user preferences"""
    return current_user.settings

@router.post("/budgets")
async def create_budget_goal(
    budget: BudgetGoal,
    current_user: UserInDB = Depends(get_current_user)
):
    """Create a budget goal"""
    db = await get_database()
    
    budget_dict = budget.dict()
    budget_dict["user_id"] = current_user.id
    
    result = await db.budgets.insert_one(budget_dict)
    budget_dict["_id"] = str(result.inserted_id)
    
    return budget_dict

@router.get("/budgets")
async def get_budget_goals(
    current_user: UserInDB = Depends(get_current_user)
):
    """Get all budget goals"""
    db = await get_database()
    
    budgets = await db.budgets.find({"user_id": current_user.id}).to_list(length=100)
    
    for budget in budgets:
        budget["_id"] = str(budget["_id"])
    
    return {"budgets": budgets}

@router.delete("/budgets/{budget_id}")
async def delete_budget_goal(
    budget_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Delete a budget goal"""
    db = await get_database()
    
    result = await db.budgets.delete_one({
        "_id": ObjectId(budget_id),
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    return {"message": "Budget deleted successfully"}

@router.post("/recurring-expenses")
async def create_recurring_expense(
    recurring: RecurringExpense,
    current_user: UserInDB = Depends(get_current_user)
):
    """Create a recurring expense"""
    db = await get_database()
    
    recurring_dict = recurring.dict()
    recurring_dict["user_id"] = current_user.id
    
    result = await db.recurring_expenses.insert_one(recurring_dict)
    recurring_dict["_id"] = str(result.inserted_id)
    
    return recurring_dict

@router.get("/recurring-expenses")
async def get_recurring_expenses(
    current_user: UserInDB = Depends(get_current_user)
):
    """Get all recurring expenses"""
    db = await get_database()
    
    recurring = await db.recurring_expenses.find({
        "user_id": current_user.id,
        "active": True
    }).to_list(length=100)
    
    for item in recurring:
        item["_id"] = str(item["_id"])
    
    return {"recurring_expenses": recurring}

@router.put("/recurring-expenses/{recurring_id}")
async def toggle_recurring_expense(
    recurring_id: str,
    active: bool,
    current_user: UserInDB = Depends(get_current_user)
):
    """Toggle recurring expense active status"""
    db = await get_database()
    
    result = await db.recurring_expenses.update_one(
        {
            "_id": ObjectId(recurring_id),
            "user_id": current_user.id
        },
        {"$set": {"active": active}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    
    return {"message": "Recurring expense updated"}