from motor.motor_asyncio import AsyncIOMotorClient
from config.settings import settings
from typing import Optional

class Database:
    client: Optional[AsyncIOMotorClient] = None

db = Database()

async def get_database():
    if db.client is None:
        raise RuntimeError("MongoDB client is not connected. Call connect_to_mongo() before accessing the database.")
    return db.client[settings.DATABASE_NAME]

async def connect_to_mongo():
    db.client = AsyncIOMotorClient(settings.MONGO_URI)
    # Create indexes
    database = db.client[settings.DATABASE_NAME]
    
    # Users indexes
    await database.users.create_index("email", unique=True)
    await database.users.create_index("google_id", unique=True)
    
    # Expenses indexes
    await database.expenses.create_index([("user_id", 1), ("date", -1)])
    await database.expenses.create_index("category")
    
    # Groups indexes
    await database.groups.create_index("owner_id")
    await database.groups.create_index("members")
    
    # AI insights indexes
    await database.ai_insights.create_index([("user_id", 1), ("created_at", -1)])

async def close_mongo_connection():
    if db.client is not None:
        db.client.close()
        db.client = None