from typing import Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
import urllib.request

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User, UserLoginHistory
from app.schemas.token import Token

router = APIRouter()

def get_location_from_ip(ip: str) -> str:
    \"\"\"
    Simple IP to Location resolver using ip-api.com.
    Returns 'City, Country' or 'Unknown'.
    \"\"\"
    if not ip or ip in ['127.0.0.1', 'localhost', '::1']:
        return \"Local Network\"
    
    try:
        # Using a short timeout to not block login
        with urllib.request.urlopen(f\"http://ip-api.com/json/{ip}\", timeout=2) as response:
            data = json.load(response)
            if data.get(\"status\") == \"success\":
                return f\"{data.get('city', 'Unknown')}, {data.get('country', 'Unknown')}\"
    except Exception as e:
        print(f\"Location lookup failed: {e}\")
    
    return \"Не определено\"

@router.post(\"/login/access-token\", response_model=Token)
async def login_access_token(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
    x_client_location: Optional[str] = Header(None, alias=\"X-Client-Location\")
) -> Any:
    \"\"\"
    OAuth2 compatible token login, get an access token for future requests
    \"\"\"
    # Authenticate user
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalars().first()

    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail=\"Incorrect email or password\")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail=\"Inactive user\")
    
    # Log login history
    try:
        forwarded = request.headers.get(\"x-forwarded-for\")
        ip = forwarded.split(\",\")[0].strip() if forwarded else (
            request.client.host if request.client else None
        )
        ua = request.headers.get(\"user-agent\")
        
        # Determine location: Use header if present, else fallback to IP lookup
        final_location = x_client_location
        if not final_location or final_location == \"undefined\":
            final_location = get_location_from_ip(ip)

        login_history = UserLoginHistory(
            user_id=user.id,
            ip_address=ip,
            location=final_location,
            user_agent=ua,
            login_at=datetime.utcnow()
        )
        db.add(login_history)
        await db.commit()
    except Exception:
        pass # Don't break login if logging fails

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        \"access_token\": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        \"token_type\": \"bearer\",
    }

