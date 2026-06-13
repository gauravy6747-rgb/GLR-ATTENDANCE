from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    verify_password,
    create_access_token,
    get_current_user,
    set_auth_cookie,
    clear_auth_cookie,
    create_reset_token,
    verify_reset_token,
    hash_password
)
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest
)
from app.utils.email import send_reset_password_email
import os

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/login", response_model=TokenResponse)
def login(
    login_data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.email == login_data.email
    ).first()

    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="User account is inactive"
        )

    token = create_access_token(data={
        "user_id": str(user.id),
        "role": user.role,
        "employee_id": user.employee_id
    })

    set_auth_cookie(response, token)

    return {
        "id": str(user.id),
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "employee_id": user.employee_id,
        "face_enrolled": user.face_enrolled,
        "saturday_policy": user.saturday_policy
    }


@router.post("/logout")
def logout(response: Response):
    clear_auth_cookie(response)
    return {"message": "Logged out successfully"}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "employee_id": current_user.employee_id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "face_enrolled": current_user.face_enrolled,
        "saturday_policy": current_user.saturday_policy
    }


@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == payload.email).first()
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail="This email address is not registered in our system."
        )
        
    token = create_reset_token(str(user.id))
    
    # Dynamically extract origin/referer from request headers
    origin = request.headers.get("origin")
    if origin:
        frontend_url = origin.rstrip("/")
    else:
        referer = request.headers.get("referer")
        if referer:
            from urllib.parse import urlparse
            parsed_uri = urlparse(referer)
            frontend_url = f"{parsed_uri.scheme}://{parsed_uri.netloc}"
        else:
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
            
    reset_link = f"{frontend_url}/reset-password?token={token}"
    
    success = send_reset_password_email(user.email, reset_link)
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to send the email. Please check your SMTP configuration, app password, or try again later."
        )
        
    return {"message": "A password reset link has been sent to your email address."}


@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    user_id = verify_reset_token(payload.token)
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    
    return {"message": "Password reset successful. You can now log in with your new password."}