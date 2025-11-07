from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel

from database.mongo import get_database
from models.schemas import Group, GroupInDB, GroupExpense, GroupMember, UserInDB
from routes.auth import get_current_user

router = APIRouter()

class GroupCreateRequest(BaseModel):
    name: str
    members: List[GroupMember] = []

@router.post("/", response_model=GroupInDB)
async def create_group(
    request: GroupCreateRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Create a new expense group"""
    db = await get_database()
    
    print(f"Creating group: {request.name}")
    print(f"Members received: {request.members}")
    
    # Process members and try to find matching users by email
    processed_members = []
    for member in request.members:
        member_dict = {
            "name": member.name,
            "email": member.email,
            "user_id": member.user_id
        }
        
        print(f"Processing member: {member_dict}")
        
        # Try to find user by email in database
        existing_user = await db.users.find_one({"email": member.email})
        if existing_user:
            # Use actual user_id if found
            member_dict["user_id"] = str(existing_user["_id"])
            print(f"Found existing user for {member.email}: {member_dict['user_id']}")
        else:
            print(f"No user found for {member.email}, using temp ID")
        
        processed_members.append(member_dict)
    
    group_dict = {
        "name": request.name,
        "owner_id": current_user.id,
        "members": processed_members,
        "expenses": [],
        "balances": {},
        "created_at": datetime.utcnow()
    }
    
    print(f"Inserting group: {group_dict}")
    
    result = await db.groups.insert_one(group_dict)
    created_group = await db.groups.find_one({"_id": result.inserted_id})
    
    print(f"Group created: {created_group}")
    
    created_group["id"] = str(created_group["_id"])
    created_group["_id"] = str(created_group["_id"])
    
    return created_group

@router.get("/", response_model=List[GroupInDB])
async def get_user_groups(
    current_user: UserInDB = Depends(get_current_user)
):
    """Get all groups user is part of (as owner or member)"""
    db = await get_database()
    
    print(f"Fetching groups for user: {current_user.id}, email: {current_user.email}")
    
    # Find groups where user is owner OR member
    cursor = db.groups.find({
        "$or": [
            {"owner_id": current_user.id},
            {"members.user_id": current_user.id},
            {"members.email": current_user.email}
        ]
    }).sort("created_at", -1)
    
    groups = await cursor.to_list(length=100)
    
    print(f"Found {len(groups)} groups")
    
    result = []
    for group in groups:
        group["id"] = str(group["_id"])
        group["_id"] = str(group["_id"])
        print(f"Group: {group.get('name')}, ID: {group['id']}, Members: {len(group.get('members', []))}")
        result.append(group)
    
    return result

@router.get("/{group_id}", response_model=GroupInDB)
async def get_group(
    group_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get specific group details"""
    db = await get_database()
    
    group = await db.groups.find_one({"_id": ObjectId(group_id)})
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user has access
    is_owner = group["owner_id"] == current_user.id
    is_member = any(m["user_id"] == current_user.id for m in group.get("members", []))
    
    if not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Access denied")
    
    group["_id"] = str(group["_id"])
    return GroupInDB(**group)

@router.post("/{group_id}/expenses")
async def add_group_expense(
    group_id: str,
    expense: GroupExpense,
    current_user: UserInDB = Depends(get_current_user)
):
    """Add expense to group and calculate splits"""
    db = await get_database()
    
    group = await db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Verify user is in group
    is_member = (
        group["owner_id"] == current_user.id or
        any(m["user_id"] == current_user.id for m in group.get("members", []))
    )
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    expense_dict = expense.dict()
    
    # Calculate splits if equal split
    if expense.split_type == "equal":
        num_members = len(group["members"]) + 1  # +1 for owner
        per_person = expense.total_amount / num_members
        
        splits = {group["owner_id"]: per_person}
        for member in group["members"]:
            splits[member["user_id"]] = per_person
        
        expense_dict["splits"] = splits
    
    # Update balances
    balances = group.get("balances", {})
    paid_by = expense.paid_by
    
    for user_id, amount in expense_dict["splits"].items():
        if user_id != paid_by:
            # This person owes the payer
            if user_id not in balances:
                balances[user_id] = {}
            
            current_owed = balances[user_id].get(paid_by, 0)
            balances[user_id][paid_by] = current_owed + amount
    
    # Add expense and update group
    await db.groups.update_one(
        {"_id": ObjectId(group_id)},
        {
            "$push": {"expenses": expense_dict},
            "$set": {"balances": balances}
        }
    )
    
    return {"message": "Expense added successfully", "expense": expense_dict}

@router.post("/{group_id}/settle")
async def settle_balance(
    group_id: str,
    from_user: str,
    to_user: str,
    amount: float,
    current_user: UserInDB = Depends(get_current_user)
):
    """Record a settlement between two users"""
    db = await get_database()
    
    group = await db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    balances = group.get("balances", {})
    
    if from_user in balances and to_user in balances[from_user]:
        current_owed = balances[from_user][to_user]
        new_balance = current_owed - amount
        
        if new_balance <= 0:
            del balances[from_user][to_user]
        else:
            balances[from_user][to_user] = new_balance
        
        await db.groups.update_one(
            {"_id": ObjectId(group_id)},
            {"$set": {"balances": balances}}
        )
        
        return {"message": "Settlement recorded", "remaining_balance": max(0, new_balance)}
    
    raise HTTPException(status_code=400, detail="No balance to settle")

@router.get("/{group_id}/summary")
async def get_group_summary(
    group_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get group expense summary"""
    db = await get_database()
    
    group = await db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    expenses = group.get("expenses", [])
    total_spent = sum(e["total_amount"] for e in expenses)
    
    # Calculate per-person totals
    user_totals = {}
    for expense in expenses:
        for user_id, amount in expense["splits"].items():
            user_totals[user_id] = user_totals.get(user_id, 0) + amount
    
    return {
        "group_name": group["name"],
        "total_expenses": len(expenses),
        "total_amount": total_spent,
        "balances": group.get("balances", {}),
        "user_totals": user_totals
    }
