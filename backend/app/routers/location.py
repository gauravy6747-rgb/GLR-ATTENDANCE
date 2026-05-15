from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin_or_superadmin
from app.models.user import User
from app.models.company import Location
from app.schemas.location import LocationCreate, LocationResponse

router = APIRouter(
    prefix="/locations",
    tags=["Locations"]
)


@router.post("/", response_model=LocationResponse)
def create_location(
    location: LocationCreate,
    current_user: User = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    new_location = Location(
        name=location.name,
        latitude=location.latitude,
        longitude=location.longitude,
        radius_meters=location.radius_meters
    )

    db.add(new_location)
    db.commit()
    db.refresh(new_location)

    return new_location


@router.get("/", response_model=list[LocationResponse])
def get_locations(
    current_user: User = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    return db.query(Location).filter(
        Location.is_active == True
    ).all()