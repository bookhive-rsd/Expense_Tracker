from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

class CategoryEnum(str, Enum):
    FOOD = "food"
    TRAVEL = "travel"
    SHOPPING = "shopping"
    ENTERTAINMENT = "entertainment"
    HEALTH = "health"
    UTILITIES = "utilities"
    RENT = "rent"
    EDUCATION = "education"
    OTHER = "other"

class PaymentTypeEnum(str, Enum):
    CASH = "cash"
    UPI = "upi"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    NET_BANKING = "net_banking"

class UserSettings(BaseModel):
    language: str = "en"
    currency: str = "INR"
    dark_mode: bool = False
    email_notifications: bool = True
    push_notifications: bool = True
    weekly_report: bool = True
    monthly_report: bool = True
    yearly_report: bool = True

class User(BaseModel):
    email: EmailStr
    google_id: str
    name: str
    profile_pic: Optional[str] = None
    settings: UserSettings = UserSettings()
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserInDB(User):
    id: str = Field(alias="_id")

class ExpenseCreate(BaseModel):
    item_name: str
    amount: float
    category: Optional[CategoryEnum] = None
    payment_type: PaymentTypeEnum
    date: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None
    image_url: Optional[str] = None
    location: Optional[str] = None

class Expense(ExpenseCreate):
    user_id: str
    predicted_category: Optional[CategoryEnum] = None
    ai_suggestions: Optional[Dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ExpenseInDB(Expense):
    id: str = Field(alias="_id")

class GroupMember(BaseModel):
    user_id: str
    name: str
    email: str

class GroupExpense(BaseModel):
    description: str
    total_amount: float
    paid_by: str
    split_type: str = "equal"  # equal or custom
    splits: Dict[str, float]  # user_id: amount
    date: datetime = Field(default_factory=datetime.utcnow)
    category: Optional[CategoryEnum] = None

class Group(BaseModel):
    name: str
    owner_id: str
    members: List[GroupMember]
    expenses: List[GroupExpense] = []
    balances: Dict[str, Dict[str, float]] = {}  # who owes whom
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GroupInDB(Group):
    id: str = Field(alias="_id")

class BudgetGoal(BaseModel):
    period: str = "monthly"  # weekly, monthly
    amount: float
    category: Optional[CategoryEnum] = None
    start_date: datetime = Field(default_factory=datetime.utcnow)

class AIInsight(BaseModel):
    user_id: str
    insight_type: str  # spending_pattern, prediction, savings_tip, health_tip
    title: str
    description: str
    data: Optional[Dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChatMessage(BaseModel):
    message: str
    context: Optional[Dict] = None

class RecurringExpense(BaseModel):
    user_id: str
    item_name: str
    amount: float
    category: CategoryEnum
    payment_type: PaymentTypeEnum
    frequency: str  # daily, weekly, monthly
    next_due_date: datetime
    auto_create: bool = True
    active: bool = True