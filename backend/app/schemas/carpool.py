"""Pydantic schemas for BlaBlaCar-style Carpool functionality."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class CarpoolDriverSchema(BaseModel):
    id: str
    name: str
    rating: float = 4.9
    review_count: int = 24
    experience_level: str = "Experienced"
    chattiness: str = "BlaBla"
    is_id_verified: bool = True
    member_since: str = "2024"


class CarpoolRideCreate(BaseModel):
    origin_city: str = Field(..., min_length=2, max_length=100)
    origin_spot: str = Field(..., min_length=2, max_length=150)
    destination_city: str = Field(..., min_length=2, max_length=100)
    destination_spot: str = Field(..., min_length=2, max_length=150)
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    departure_time: str = Field(..., min_length=4, max_length=20)
    available_seats: int = Field(..., ge=1, le=6)
    price_per_seat: float = Field(..., ge=50, le=5000)
    car_make: str = Field("Honda", max_length=50)
    car_model: str = Field("City", max_length=50)
    car_color: str = Field("White", max_length=30)
    ac: bool = True
    max_two_in_back: bool = True
    notes: Optional[str] = None


class CarpoolBookRequest(BaseModel):
    seats: int = Field(1, ge=1, le=4)
    passenger_name: str = Field(..., min_length=2, max_length=80)
    passenger_phone: str = Field(..., min_length=10, max_length=15)


class CarpoolTicketResponse(BaseModel):
    booking_id: str
    booking_code: str
    ride_id: str
    passenger_name: str
    seats_booked: int
    total_amount: float
    currency: str = "INR"
    status: str
    booked_at: datetime
