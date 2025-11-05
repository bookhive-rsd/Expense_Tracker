from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta
from typing import List
import asyncio

from database.mongo import get_database
from services.email_service import EmailService
from services.ai_service import AIService

class CronService:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.email_service = EmailService()
        self.ai_service = AIService()
    
    def start(self):
        """Start all scheduled jobs"""
        
        # Weekly report - Every Monday at 9 AM
        self.scheduler.add_job(
            self.send_weekly_reports,
            CronTrigger(day_of_week='mon', hour=9, minute=0),
            id='weekly_reports',
            name='Send Weekly Reports'
        )
        
        # Monthly report - First day of month at 9 AM
        self.scheduler.add_job(
            self.send_monthly_reports,
            CronTrigger(day=1, hour=9, minute=0),
            id='monthly_reports',
            name='Send Monthly Reports'
        )
        
        # Yearly report - January 1st at 9 AM
        self.scheduler.add_job(
            self.send_yearly_reports,
            CronTrigger(month=1, day=1, hour=9, minute=0),
            id='yearly_reports',
            name='Send Yearly Reports'
        )
        
        # Budget alerts - Daily at 6 PM
        self.scheduler.add_job(
            self.check_budget_alerts,
            CronTrigger(hour=18, minute=0),
            id='budget_alerts',
            name='Check Budget Alerts'
        )
        
        # Recurring expenses - Daily at 8 AM
        self.scheduler.add_job(
            self.create_recurring_expenses,
            CronTrigger(hour=8, minute=0),
            id='recurring_expenses',
            name='Create Recurring Expenses'
        )
        
        self.scheduler.start()
        print("Cron jobs started successfully")
    
    async def send_weekly_reports(self):
        """Send weekly expense reports to users"""
        print(f"Running weekly reports job at {datetime.utcnow()}")
        
        db = await get_database()
        
        # Get all users with weekly reports enabled
        users = await db.users.find({
            "settings.weekly_report": True,
            "settings.email_notifications": True
        }).to_list(length=10000)
        
        for user in users:
            try:
                await self._send_report(user, "weekly")
            except Exception as e:
                print(f"Error sending weekly report to {user['email']}: {e}")
    
    async def send_monthly_reports(self):
        """Send monthly expense reports to users"""
        print(f"Running monthly reports job at {datetime.utcnow()}")
        
        db = await get_database()
        
        users = await db.users.find({
            "settings.monthly_report": True,
            "settings.email_notifications": True
        }).to_list(length=10000)
        
        for user in users:
            try:
                await self._send_report(user, "monthly")
            except Exception as e:
                print(f"Error sending monthly report to {user['email']}: {e}")
    
    async def send_yearly_reports(self):
        """Send yearly expense reports to users"""
        print(f"Running yearly reports job at {datetime.utcnow()}")
        
        db = await get_database()
        
        users = await db.users.find({
            "settings.yearly_report": True,
            "settings.email_notifications": True
        }).to_list(length=10000)
        
        for user in users:
            try:
                await self._send_report(user, "yearly")
            except Exception as e:
                print(f"Error sending yearly report to {user['email']}: {e}")
    
    async def _send_report(self, user: dict, period: str):
        """Generate and send expense report"""
        db = await get_database()
        user_id = str(user["_id"])
        
        # Calculate date range
        now = datetime.utcnow()
        if period == "weekly":
            start_date = now - timedelta(weeks=1)
        elif period == "monthly":
            start_date = now - timedelta(days=30)
        else:  # yearly
            start_date = now - timedelta(days=365)
        
        # Get expenses for period
        expenses = await db.expenses.find({
            "user_id": user_id,
            "date": {"$gte": start_date}
        }).to_list(length=10000)
        
        if not expenses:
            return  # No expenses to report
        
        # Calculate totals by category
        pipeline = [
            {"$match": {
                "user_id": user_id,
                "date": {"$gte": start_date}
            }},
            {"$group": {
                "_id": "$category",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }},
            {"$sort": {"total": -1}}
        ]
        
        by_category = await db.expenses.aggregate(pipeline).to_list(length=100)
        total_amount = sum(cat["total"] for cat in by_category)
        
        # Get AI insights
        expenses_dict = [
            {
                "item_name": e.get("item_name"),
                "amount": e.get("amount"),
                "category": e.get("category"),
                "date": e.get("date")
            }
            for e in expenses
        ]
        
        insights = await self.ai_service.analyze_spending_patterns(
            expenses_dict,
            user.get("settings", {})
        )
        
        # Generate and send email
        currency = user.get("settings", {}).get("currency", "INR")
        html_content = self.email_service.generate_expense_report_html(
            user_name=user.get("name", "User"),
            period=period,
            total_amount=total_amount,
            expenses_by_category=by_category,
            insights=insights,
            currency=currency
        )
        
        subject = f"Your {period.capitalize()} Expense Report"
        self.email_service.send_email(
            recipient=user["email"],
            subject=subject,
            html_content=html_content
        )
        
        print(f"Sent {period} report to {user['email']}")
    
    async def check_budget_alerts(self):
        """Check budgets and send alerts"""
        print(f"Running budget alerts check at {datetime.utcnow()}")
        
        db = await get_database()
        
        # Get all active budgets
        budgets = await db.budgets.find({}).to_list(length=10000)
        
        for budget in budgets:
            try:
                user_id = budget["user_id"]
                budget_amount = budget["amount"]
                category = budget.get("category")
                period = budget.get("period", "monthly")
                
                # Get user
                user = await db.users.find_one({"_id": user_id})
                if not user or not user.get("settings", {}).get("email_notifications"):
                    continue
                
                # Calculate date range
                now = datetime.utcnow()
                if period == "weekly":
                    start_date = now - timedelta(weeks=1)
                else:  # monthly
                    start_date = now - timedelta(days=30)
                
                # Calculate current spending
                query = {
                    "user_id": user_id,
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
                
                # Check if alert needed (80% or 100% threshold)
                percentage = (current_spending / budget_amount * 100) if budget_amount > 0 else 0
                
                if percentage >= 80 and percentage < 100:
                    # Send warning
                    self.email_service.send_budget_alert(
                        recipient=user["email"],
                        user_name=user.get("name", "User"),
                        budget_amount=budget_amount,
                        current_spending=current_spending,
                        percentage=percentage,
                        currency=user.get("settings", {}).get("currency", "INR")
                    )
                elif percentage >= 100:
                    # Send exceeded alert
                    self.email_service.send_budget_alert(
                        recipient=user["email"],
                        user_name=user.get("name", "User"),
                        budget_amount=budget_amount,
                        current_spending=current_spending,
                        percentage=percentage,
                        currency=user.get("settings", {}).get("currency", "INR")
                    )
                
            except Exception as e:
                print(f"Error checking budget alert: {e}")
    
    async def create_recurring_expenses(self):
        """Create due recurring expenses"""
        print(f"Running recurring expenses check at {datetime.utcnow()}")
        
        db = await get_database()
        now = datetime.utcnow()
        
        # Get all active recurring expenses that are due
        recurring = await db.recurring_expenses.find({
            "active": True,
            "auto_create": True,
            "next_due_date": {"$lte": now}
        }).to_list(length=1000)
        
        for rec in recurring:
            try:
                # Create expense
                expense_data = {
                    "user_id": rec["user_id"],
                    "item_name": rec["item_name"],
                    "amount": rec["amount"],
                    "category": rec["category"],
                    "payment_type": rec["payment_type"],
                    "date": now,
                    "notes": f"Auto-created recurring expense",
                    "created_at": now
                }
                
                await db.expenses.insert_one(expense_data)
                
                # Update next due date
                frequency = rec.get("frequency", "monthly")
                if frequency == "daily":
                    next_due = now + timedelta(days=1)
                elif frequency == "weekly":
                    next_due = now + timedelta(weeks=1)
                else:  # monthly
                    next_due = now + timedelta(days=30)
                
                await db.recurring_expenses.update_one(
                    {"_id": rec["_id"]},
                    {"$set": {"next_due_date": next_due}}
                )
                
                print(f"Created recurring expense: {rec['item_name']}")
                
            except Exception as e:
                print(f"Error creating recurring expense: {e}")
    
    def stop(self):
        """Stop the scheduler"""
        self.scheduler.shutdown()
        print("Cron jobs stopped")

# Global instance
cron_service = CronService()