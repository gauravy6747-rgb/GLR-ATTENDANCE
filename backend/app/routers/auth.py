from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    verify_password,
    create_access_token,
    get_current_user,
    set_auth_cookie,
    clear_auth_cookie
)
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse

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
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "employee_id": user.employee_id,
        "face_enrolled": user.face_enrolled
    }


@router.post("/logout")
def logout(response: Response):
    clear_auth_cookie(response)
    return {"message": "Logged out successfully"}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "employee_id": current_user.employee_id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "face_enrolled": current_user.face_enrolled
    }