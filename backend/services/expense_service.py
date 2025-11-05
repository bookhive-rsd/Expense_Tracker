# backend/services/expense_service.py
"""Expense-related business logic"""
from database.mongo import get_database

class ExpenseService:
    async def calculate_total(self, user_id, start_date, end_date):
        """Calculate total expenses for period"""
        db = await get_database()
        pipeline = [
            {"$match": {
                "user_id": user_id,
                "date": {"$gte": start_date, "$lte": end_date}
            }},
            {"$group": {
                "_id": None,
                "total": {"$sum": "$amount"}
            }}
        ]
        result = await db.expenses.aggregate(pipeline).to_list(1)
        return result[0]["total"] if result else 0