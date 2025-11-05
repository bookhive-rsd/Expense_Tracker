from fastapi import APIRouter, Depends, Query
from datetime import datetime, timedelta
from typing import List, Optional, Any, Dict

from database.mongo import get_database
from models.schemas import UserInDB
from routes.auth import get_current_user

router = APIRouter()

@router.get("/trends")
async def get_spending_trends(
    period: str = Query("monthly", regex="^(weekly|monthly|yearly)$"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get spending trends over time"""
    db = await get_database()
    now = datetime.utcnow()
    
    # Determine date range and grouping
    if period == "weekly":
        start_date = now - timedelta(weeks=12)
        group_format = "%Y-W%U"  # Year-Week
    elif period == "monthly":
        start_date = now - timedelta(days=365)
        group_format = "%Y-%m"  # Year-Month
    else:  # yearly
        start_date = now - timedelta(days=365 * 5)
        group_format = "%Y"  # Year
    
    pipeline = [
        {"$match": {
            "user_id": current_user.id,
            "date": {"$gte": start_date}
        }},
        {"$group": {
            "_id": {
                "$dateToString": {
                    "format": group_format,
                    "date": "$date"
                }
            },
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    results = await db.expenses.aggregate(pipeline).to_list(length=1000)
    
    return {
        "period": period,
        "trends": results
    }

@router.get("/category-breakdown")
async def get_category_breakdown(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get expense breakdown by category"""
    db = await get_database()
    
    # Use a plain dict to avoid strict static typing issues when assigning non-string values
    query: Dict[str, Any] = {"user_id": current_user.id}
    
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()
    
    query["date"] = {"$gte": start_date, "$lte": end_date}
    
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$category",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1},
            "avg": {"$avg": "$amount"}
        }},
        {"$sort": {"total": -1}}
    ]
    
    results = await db.expenses.aggregate(pipeline).to_list(length=100)
    
    total_amount = sum(r["total"] for r in results)
    
    # Calculate percentages
    for result in results:
        result["percentage"] = (result["total"] / total_amount * 100) if total_amount > 0 else 0
    
    return {
        "period": {
            "start": start_date,
            "end": end_date
        },
        "total_amount": total_amount,
        "categories": results
    }

@router.get("/top-expenses")
async def get_top_expenses(
    limit: int = 10,
    period: str = "monthly",
    current_user: UserInDB = Depends(get_current_user)
):
    """Get top expenses"""
    db = await get_database()
    now = datetime.utcnow()
    
    period_map = {
        "weekly": now - timedelta(weeks=1),
        "monthly": now - timedelta(days=30),
        "yearly": now - timedelta(days=365)
    }
    
    start_date = period_map.get(period, period_map["monthly"])
    
    cursor = db.expenses.find({
        "user_id": current_user.id,
        "date": {"$gte": start_date}
    }).sort("amount", -1).limit(limit)
    
    expenses = await cursor.to_list(length=limit)
    
    for expense in expenses:
        expense["_id"] = str(expense["_id"])
    
    return {
        "period": period,
        "top_expenses": expenses
    }

@router.get("/payment-methods")
async def get_payment_methods_breakdown(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get breakdown by payment method"""
    db = await get_database()
    
    # query = {"user_id": current_user.id}
    query: Dict[str, Any] = {"user_id": current_user.id}
    
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()
    
    query["date"] = {"$gte": start_date, "$lte": end_date}
    
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$payment_type",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"total": -1}}
    ]
    
    results = await db.expenses.aggregate(pipeline).to_list(length=100)
    
    return {
        "payment_methods": results
    }

@router.get("/budget-progress")
async def get_budget_progress(
    current_user: UserInDB = Depends(get_current_user)
):
    """Get budget utilization progress"""
    db = await get_database()
    
    # Get user's budget goals
    budgets = await db.budgets.find({"user_id": current_user.id}).to_list(length=100)
    
    results = []
    
    for budget in budgets:
        period = budget.get("period", "monthly")
        category = budget.get("category")
        budget_amount = budget.get("amount", 0)
        
        # Calculate date range
        now = datetime.utcnow()
        if period == "weekly":
            start_date = now - timedelta(weeks=1)
        else:  # monthly
            start_date = now - timedelta(days=30)
        
        # Calculate current spending
        query = {
            "user_id": current_user.id,
            "date": {"$gte": start_date}
        }
        
        if category:
            query["category"] = category
        
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": None,
                "total": {"$sum": "$amount"}
            }}
        ]
        
        result = await db.expenses.aggregate(pipeline).to_list(length=1)
        current_spending = result[0]["total"] if result else 0
        
        percentage = (current_spending / budget_amount * 100) if budget_amount > 0 else 0
        
        results.append({
            "budget_id": str(budget["_id"]),
            "period": period,
            "category": category,
            "budget_amount": budget_amount,
            "current_spending": current_spending,
            "remaining": budget_amount - current_spending,
            "percentage": percentage,
            "status": "exceeded" if percentage > 100 else "warning" if percentage > 80 else "good"
        })
    
    return {"budgets": results}

@router.get("/recurring-expenses")
async def get_recurring_expenses_analysis(
    current_user: UserInDB = Depends(get_current_user)
):
    """Analyze recurring expenses"""
    db = await get_database()
    
    # Get all expenses from last 90 days
    start_date = datetime.utcnow() - timedelta(days=90)
    
    expenses = await db.expenses.find({
        "user_id": current_user.id,
        "date": {"$gte": start_date}
    }).to_list(length=10000)
    
    # Group by item name to find recurring patterns
    item_frequency = {}
    for expense in expenses:
        item = expense.get("item_name", "").lower()
        if item:
            if item not in item_frequency:
                item_frequency[item] = {
                    "count": 0,
                    "total_amount": 0,
                    "avg_amount": 0,
                    "dates": []
                }
            
            item_frequency[item]["count"] += 1
            item_frequency[item]["total_amount"] += expense.get("amount", 0)
            item_frequency[item]["dates"].append(expense.get("date"))
    
    # Find items that appear 3+ times (potentially recurring)
    recurring = []
    for item, data in item_frequency.items():
        if data["count"] >= 3:
            data["avg_amount"] = data["total_amount"] / data["count"]
            data["item_name"] = item
            del data["dates"]  # Remove dates from response
            recurring.append(data)
    
    # Sort by total amount
    recurring.sort(key=lambda x: x["total_amount"], reverse=True)
    
    return {
        "recurring_expenses": recurring[:20]  # Top 20
    }