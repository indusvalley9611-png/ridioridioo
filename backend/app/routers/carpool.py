"""Carpool (BlaBlaCar-style) endpoints."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from backend.app.schemas.carpool import (
    CarpoolRideCreate,
    CarpoolBookRequest,
    CarpoolTicketResponse,
)

router = APIRouter(prefix="/api/v1/carpool", tags=["Carpool"])

# In-memory storage for carpools (with pre-seeded popular Indian corridors)
CARPOOL_RIDES = [
    {
        "id": "cpr-001",
        "origin_city": "Bangalore",
        "origin_spot": "Silk Board Junction",
        "destination_city": "Chennai",
        "destination_spot": "Koyambedu CMBT",
        "date": "2026-10-27",
        "departure_time": "06:30 AM",
        "available_seats": 2,
        "price_per_seat": 450.0,
        "driver_name": "Vikram Sharma",
        "driver_rating": 4.9,
        "driver_chattiness": "BlaBla",
        "car": "Hyundai Creta - White",
        "ac": True,
        "max_two_in_back": True,
        "status": "active",
        "passengers": [],
    },
    {
        "id": "cpr-002",
        "origin_city": "Mumbai",
        "origin_spot": "Vashi Toll Plaza",
        "destination_city": "Pune",
        "destination_spot": "Wakad Bridge",
        "date": "2026-10-27",
        "departure_time": "07:30 AM",
        "available_seats": 3,
        "price_per_seat": 290.0,
        "driver_name": "Rahul Kulkarni",
        "driver_rating": 4.95,
        "driver_chattiness": "BlaBlaBla",
        "car": "Honda City - Silver",
        "ac": True,
        "max_two_in_back": True,
        "status": "active",
        "passengers": [],
    },
]

CARPOOL_BOOKINGS = []


@router.get("/rides")
def search_carpool_rides(
    origin: Optional[str] = Query(None, description="Origin city or landmark"),
    destination: Optional[str] = Query(None, description="Destination city or landmark"),
    seats: int = Query(1, ge=1, le=4),
):
    """Search available carpool rides matching origin and destination."""
    results = []
    orig_q = origin.strip().lower() if origin else ""
    dest_q = destination.strip().lower() if destination else ""

    for ride in CARPOOL_RIDES:
        if ride["available_seats"] < seats or ride["status"] != "active":
            continue

        match_orig = not orig_q or (orig_q in ride["origin_city"].lower() or orig_q in ride["origin_spot"].lower())
        match_dest = not dest_q or (dest_q in ride["destination_city"].lower() or dest_q in ride["destination_spot"].lower())

        if match_orig and match_dest:
            results.append(ride)

    # Fallback to returning all active rides with enough seats if no exact filter matched
    if not results and (orig_q or dest_q):
        results = [r for r in CARPOOL_RIDES if r["available_seats"] >= seats and r["status"] == "active"]

    return {"rides": results, "total": len(results)}


@router.post("/rides", status_code=status.HTTP_201_CREATED)
def publish_carpool_ride(payload: CarpoolRideCreate):
    """Publish a new carpool ride offering empty seats."""
    ride_id = f"cpr-{uuid.uuid4().hex[:6]}"
    new_ride = {
        "id": ride_id,
        "origin_city": payload.origin_city,
        "origin_spot": payload.origin_spot,
        "destination_city": payload.destination_city,
        "destination_spot": payload.destination_spot,
        "date": payload.date,
        "departure_time": payload.departure_time,
        "available_seats": payload.available_seats,
        "price_per_seat": payload.price_per_seat,
        "driver_name": "Demo Driver",
        "driver_rating": 5.0,
        "driver_chattiness": "BlaBla",
        "car": f"{payload.car_make} {payload.car_model} - {payload.car_color}",
        "ac": payload.ac,
        "max_two_in_back": payload.max_two_in_back,
        "status": "active",
        "notes": payload.notes,
        "passengers": [],
    }
    CARPOOL_RIDES.insert(0, new_ride)
    return new_ride


@router.post("/rides/{ride_id}/book", response_model=CarpoolTicketResponse)
def book_carpool_seats(ride_id: str, payload: CarpoolBookRequest):
    """Book 1 or more seats on an existing carpool ride."""
    target_ride = next((r for r in CARPOOL_RIDES if r["id"] == ride_id), None)
    if not target_ride:
        raise HTTPException(status_code=404, detail="Carpool ride not found.")

    if target_ride["available_seats"] < payload.seats:
        raise HTTPException(
            status_code=400,
            detail=f"Only {target_ride['available_seats']} seats available on this ride.",
        )

    target_ride["available_seats"] -= payload.seats
    booking_id = f"bkg-{uuid.uuid4().hex[:6]}"
    booking_code = f"BLA-{uuid.uuid4().int % 90000 + 10000}"

    ticket = {
        "booking_id": booking_id,
        "booking_code": booking_code,
        "ride_id": ride_id,
        "passenger_name": payload.passenger_name,
        "seats_booked": payload.seats,
        "total_amount": target_ride["price_per_seat"] * payload.seats,
        "currency": "INR",
        "status": "confirmed",
        "booked_at": datetime.now(timezone.utc),
    }
    CARPOOL_BOOKINGS.append(ticket)
    return ticket
