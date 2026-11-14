"""NEXORA RIDE - Booking Pydantic Validation Schemas."""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, model_validator, ConfigDict


class LocationSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Location display name")
    address: str = Field(..., min_length=1, max_length=500, description="Full formatted address")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180")
    is_demo: bool = Field(default=False, description="Flag indicating simulated or demo data")


class CreateBookingRequest(BaseModel):
    pickup: LocationSchema
    destination: LocationSchema
    ride_category: Literal["bike", "auto", "cab"]
    estimated_distance_km: float = Field(..., gt=0.0, description="Estimated trip distance in km")
    estimated_duration_minutes: Optional[int] = Field(None, ge=1, description="Estimated duration in minutes")
    estimated_fare_min: int = Field(..., ge=1, description="Minimum estimated fare in INR")
    estimated_fare_max: int = Field(..., ge=1, description="Maximum estimated fare in INR")
    currency: Literal["INR"] = "INR"
    idempotency_key: Optional[str] = Field(None, max_length=128, description="Client idempotency key")

    @model_validator(mode="after")
    def validate_trip(self):
        # 1. Fare min must not exceed fare max
        if self.estimated_fare_min > self.estimated_fare_max:
            raise ValueError("estimated_fare_min cannot be greater than estimated_fare_max")

        # 2. Pickup and destination coordinates should not be practically identical
        lat_diff = abs(self.pickup.latitude - self.destination.latitude)
        lon_diff = abs(self.pickup.longitude - self.destination.longitude)
        if lat_diff < 0.0001 and lon_diff < 0.0001:
            raise ValueError("Pickup and destination coordinates cannot be identical")

        return self


class CancelBookingRequest(BaseModel):
    reason: Optional[str] = Field(
        default="Customer requested cancellation",
        max_length=255,
        description="Reason for cancellation",
    )


class BookingResponse(BaseModel):
    id: str
    customer_id: str
    pickup: LocationSchema
    destination: LocationSchema
    ride_category: str
    estimated_distance_km: float
    estimated_duration_minutes: Optional[int]
    estimated_fare_min: int
    estimated_fare_max: int
    currency: str
    status: str
    created_at: datetime
    updated_at: datetime
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class BookingListResponse(BaseModel):
    bookings: list[BookingResponse]
    total: int
