from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from google.oauth2 import id_token
from google.auth.transport import requests
from datetime import datetime, timedelta
from pydantic import BaseModel
import jwt
from typing import Optional
from bson import ObjectId

from config.settings import settings
from database.mongo import get_database
from models.schemas import User, UserInDB

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class GoogleLoginRequest(BaseModel):
    token: str

async def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    db = await get_database()
    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    
    user["_id"] = str(user["_id"])
    return UserInDB(**user)

@router.post("/google-login")
async def google_login(request: GoogleLoginRequest):
    try:
        # Verify Google token with increased clock skew for development
        idinfo = id_token.verify_oauth2_token(
            request.token, 
            requests.Request(), 
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=60  # Allow 60 seconds for development
        )
        
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')
        
        google_id = idinfo['sub']
        email = idinfo['email']
        name = idinfo.get('name', '')
        picture = idinfo.get('picture', '')
        
        db = await get_database()
        
        # Check if user exists
        user = await db.users.find_one({"email": email})
        
        if not user:
            # Create new user
            new_user = User(
                email=email,
                google_id=google_id,
                name=name,
                profile_pic=picture
            )
            result = await db.users.insert_one(new_user.dict())
            user = await db.users.find_one({"_id": result.inserted_id})
        
        # Create JWT token
        access_token = await create_access_token(data={"sub": email})
        
        user["_id"] = str(user["_id"])
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserInDB(**user).dict()
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.get("/me")
async def get_me(current_user: UserInDB = Depends(get_current_user)):
    return current_user
