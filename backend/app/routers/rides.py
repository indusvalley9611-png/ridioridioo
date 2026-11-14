"""NEXORA RIDE - Rides Booking REST API Router."""

import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models.booking import Booking, BookingStatus
from backend.app.schemas.booking import (
    CreateBookingRequest,
    CancelBookingRequest,
    BookingResponse,
    BookingListResponse,
    LocationSchema,
)
from backend.app.auth import AuthenticatedCustomer, get_current_customer

router = APIRouter(prefix="/api/v1/rides", tags=["Rides"])


def _to_booking_response(b: Booking) -> BookingResponse:
    """Helper to convert ORM model to Pydantic BookingResponse."""
    return BookingResponse(
        id=b.id,
        customer_id=b.customer_id,
        pickup=LocationSchema(
            name=b.pickup_name,
            address=b.pickup_address,
            latitude=b.pickup_latitude,
            longitude=b.pickup_longitude,
            is_demo=b.pickup_is_demo,
        ),
        destination=LocationSchema(
            name=b.destination_name,
            address=b.destination_address,
            latitude=b.destination_latitude,
            longitude=b.destination_longitude,
            is_demo=b.destination_is_demo,
        ),
        ride_category=b.ride_category,
        estimated_distance_km=b.estimated_distance_km,
        estimated_duration_minutes=b.estimated_duration_minutes,
        estimated_fare_min=b.estimated_fare_min,
        estimated_fare_max=b.estimated_fare_max,
        currency=b.currency,
        status=b.status,
        created_at=b.created_at,
        updated_at=b.updated_at,
        cancelled_at=b.cancelled_at,
        cancellation_reason=b.cancellation_reason,
    )


@router.post(
    "",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new ride request",
)
def create_ride(
    payload: CreateBookingRequest,
    db: Session = Depends(get_db),
    customer: AuthenticatedCustomer = Depends(get_current_customer),
    idempotency_key_header: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    """Creates a persistent ride booking request after validating trip and fare data.

    Enforces idempotency to prevent duplicate booking creation.
    """
    idempotency_key = payload.idempotency_key or idempotency_key_header

    # 1. Check idempotency duplicate
    if idempotency_key:
        existing = (
            db.query(Booking)
            .filter(
                Booking.customer_id == customer.customer_id,
                Booking.idempotency_key == idempotency_key,
            )
            .first()
        )
        if existing:
            # Return already created booking without creating duplicate
            return _to_booking_response(existing)

    # 2. Generate unique booking identifier
    ride_id = f"ride_{uuid.uuid4().hex[:12]}"

    # 3. Create persistent record
    booking = Booking(
        id=ride_id,
        customer_id=customer.customer_id,
        pickup_name=payload.pickup.name,
        pickup_address=payload.pickup.address,
        pickup_latitude=payload.pickup.latitude,
        pickup_longitude=payload.pickup.longitude,
        pickup_is_demo=payload.pickup.is_demo,
        destination_name=payload.destination.name,
        destination_address=payload.destination.address,
        destination_latitude=payload.destination.latitude,
        destination_longitude=payload.destination.longitude,
        destination_is_demo=payload.destination.is_demo,
        ride_category=payload.ride_category,
        estimated_distance_km=payload.estimated_distance_km,
        estimated_duration_minutes=payload.estimated_duration_minutes,
        estimated_fare_min=payload.estimated_fare_min,
        estimated_fare_max=payload.estimated_fare_max,
        currency=payload.currency,
        status=BookingStatus.REQUESTED.value,
        idempotency_key=idempotency_key,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.add(booking)
    db.commit()
    db.refresh(booking)

    return _to_booking_response(booking)


@router.get(
    "",
    response_model=BookingListResponse,
    summary="List customer bookings",
)
def list_rides(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (e.g. requested, completed, cancelled)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    customer: AuthenticatedCustomer = Depends(get_current_customer),
):
    """Returns bookings belonging strictly to the authenticated customer."""
    query = db.query(Booking).filter(Booking.customer_id == customer.customer_id)

    if status_filter:
        query = query.filter(Booking.status == status_filter.lower())

    total = query.count()
    records = query.order_by(desc(Booking.created_at)).offset(offset).limit(limit).all()

    return BookingListResponse(
        bookings=[_to_booking_response(b) for b in records],
        total=total,
    )


@router.get(
    "/{ride_id}",
    response_model=BookingResponse,
    summary="Get single ride booking",
)
def get_ride(
    ride_id: str,
    db: Session = Depends(get_db),
    customer: AuthenticatedCustomer = Depends(get_current_customer),
):
    """Retrieves a single booking only if the requesting customer is authorized."""
    booking = db.query(Booking).filter(Booking.id == ride_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ride booking '{ride_id}' not found",
        )

    # Enforce customer-level authorization
    if booking.customer_id != customer.customer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this booking",
        )

    return _to_booking_response(booking)


@router.post(
    "/{ride_id}/cancel",
    response_model=BookingResponse,
    summary="Cancel an eligible ride booking",
)
def cancel_ride(
    ride_id: str,
    payload: CancelBookingRequest = CancelBookingRequest(),
    db: Session = Depends(get_db),
    customer: AuthenticatedCustomer = Depends(get_current_customer),
):
    """Cancels an eligible booking using a validated state transition."""
    booking = db.query(Booking).filter(Booking.id == ride_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ride booking '{ride_id}' not found",
        )

    # Customer authorization check
    if booking.customer_id != customer.customer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to modify this booking",
        )

    # Check status transitions
    if booking.status == BookingStatus.CANCELLED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ride booking is already cancelled",
        )

    if booking.status in (BookingStatus.COMPLETED.value, BookingStatus.IN_PROGRESS.value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel a ride that is '{booking.status}'",
        )

    # Only requested, searching, or arriving can be cancelled
    booking.status = BookingStatus.CANCELLED.value
    booking.cancelled_at = datetime.now(timezone.utc)
    booking.cancellation_reason = payload.reason
    booking.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(booking)

    return _to_booking_response(booking)
