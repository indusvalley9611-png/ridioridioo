"""Unit tests for Carpool (BlaBlaCar-style) endpoints."""

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_search_carpool_rides():
    """Verify search returns list of carpool rides."""
    response = client.get("/api/v1/carpool/rides?origin=Bangalore&destination=Chennai")
    assert response.status_code == 200
    data = response.json()
    assert "rides" in data
    assert len(data["rides"]) >= 1
    ride = data["rides"][0]
    assert "driver_chattiness" in ride
    assert "price_per_seat" in ride


def test_publish_carpool_ride():
    """Verify publishing a carpool ride."""
    payload = {
        "origin_city": "Hyderabad",
        "origin_spot": "Gachibowli ORR Junction",
        "destination_city": "Vijayawada",
        "destination_spot": "Benz Circle",
        "date": "2026-10-28",
        "departure_time": "06:00 AM",
        "available_seats": 3,
        "price_per_seat": 420.0,
        "car_make": "Skoda",
        "car_model": "Slavia",
        "car_color": "Candy White",
        "ac": True,
        "max_two_in_back": True,
    }
    response = client.post("/api/v1/carpool/rides", json=payload)
    assert response.status_code == 201
    ride = response.json()
    assert ride["origin_city"] == "Hyderabad"
    assert ride["destination_city"] == "Vijayawada"
    assert ride["available_seats"] == 3


def test_book_carpool_seats():
    """Verify seat booking flow on carpool ride."""
    # First search for a ride
    search_res = client.get("/api/v1/carpool/rides")
    ride_id = search_res.json()["rides"][0]["id"]
    seats_before = search_res.json()["rides"][0]["available_seats"]

    booking_payload = {
        "seats": 1,
        "passenger_name": "Rohan Deshmukh",
        "passenger_phone": "+919876543210",
    }
    book_res = client.post(f"/api/v1/carpool/rides/{ride_id}/book", json=booking_payload)
    assert book_res.status_code == 200
    ticket = book_res.json()
    assert ticket["status"] == "confirmed"
    assert ticket["seats_booked"] == 1
    assert "BLA-" in ticket["booking_code"]
