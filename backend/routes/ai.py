from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta
from typing import Optional

from database.mongo import get_database
from models.schemas import UserInDB, ChatMessage
from models.schemas import CategoryEnum
from routes.auth import get_current_user
from services.ai_service import AIService

router = APIRouter()

@router.post("/chat")
async def chat_with_ai(
    message: ChatMessage,
    current_user: UserInDB = Depends(get_current_user)
):
    """AI chatbot endpoint"""
    ai_service = AIService()
    
    # Get user's recent expenses for context
    db = await get_database()
    recent_expenses = await db.expenses.find(
        {"user_id": current_user.id}
    ).sort("date", -1).limit(10).to_list(length=10)
    
    # Build context
    context = message.context or {}
    context["recent_expenses"] = [
        {
            "item": e.get("item_name"),
            "amount": e.get("amount"),
            "category": e.get("category"),
            "date": e.get("date").strftime("%Y-%m-%d") if e.get("date") else None
        }
        for e in recent_expenses
    ]
    context["user_settings"] = current_user.settings.dict()
    
    response_text = await ai_service.chatbot_response(message.message, context)
    
    return {
        "response": response_text,
        "timestamp": datetime.utcnow()
    }

@router.get("/insights")
async def get_ai_insights(
    period: str = "monthly",
    current_user: UserInDB = Depends(get_current_user)
):
    """Get AI-powered spending insights"""
    db = await get_database()
    ai_service = AIService()
    
    # Get expenses for the period
    now = datetime.utcnow()
    period_map = {
        "weekly": now - timedelta(weeks=1),
        "monthly": now - timedelta(days=30),
        "quarterly": now - timedelta(days=90)
    }
    start_date = period_map.get(period, period_map["monthly"])
    
    expenses = await db.expenses.find({
        "user_id": current_user.id,
        "date": {"$gte": start_date}
    }).to_list(length=1000)
    
    if not expenses:
        return {
            "message": "Not enough data to generate insights",
            "insights": {}
        }
    
    # Convert expenses to dict format
    expenses_dict = [
        {
            "item_name": e.get("item_name"),
            "amount": e.get("amount"),
            "category": e.get("category"),
            "date": e.get("date")
        }
        for e in expenses
    ]
    
    insights = await ai_service.analyze_spending_patterns(
        expenses_dict,
        current_user.settings.dict()
    )
    
    # Store insights in database
    insight_doc = {
        "user_id": current_user.id,
        "insight_type": "spending_analysis",
        "title": f"{period.capitalize()} Spending Analysis",
        "description": insights.get("spending_pattern", ""),
        "data": insights,
        "created_at": datetime.utcnow()
    }
    await db.ai_insights.insert_one(insight_doc)
    
    return {
        "period": period,
        "insights": insights
    }

@router.post("/parse-voice")
async def parse_voice_expense(
    voice_text: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Parse natural language expense input"""
    ai_service = AIService()
    
    parsed_data = await ai_service.parse_voice_input(voice_text)
    
    if not parsed_data:
        raise HTTPException(
            status_code=400,
            detail="Could not parse expense from voice input"
        )
    
    return {
        "parsed_data": parsed_data,
        "original_text": voice_text
    }

@router.get("/suggestions/{item_name}")
async def get_item_suggestions(
    item_name: str,
    category: Optional[str] = None,
    amount: Optional[float] = None,
    current_user: UserInDB = Depends(get_current_user)
):
    ai_service = AIService()
    
    # Convert optional string category to CategoryEnum expected by the service
    def _to_category_enum(cat_str: Optional[str]) -> CategoryEnum:
        # If no category provided, try to find an enum member with value "other" or fall back to first member
        if cat_str is None:
            for m in CategoryEnum:
                if getattr(m, "value", None) == "other":
                    return m
            return next(iter(CategoryEnum))
        # Try direct value conversion, then by name, then fallback to "other" member or first member
        try:
            return CategoryEnum(cat_str)
        except Exception:
            try:
                return CategoryEnum[cat_str.upper()]
            except Exception:
                for m in CategoryEnum:
                    if getattr(m, "value", None) == "other":
                        return m
                return next(iter(CategoryEnum))
    
    cat_enum = _to_category_enum(category)
    
    suggestions = await ai_service.get_item_suggestions(
        item_name,
        cat_enum,
        amount or 0
    )
    
    return suggestions
    return suggestions