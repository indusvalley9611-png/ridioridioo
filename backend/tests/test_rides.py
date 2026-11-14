"""Comprehensive tests for NEXORA RIDE Phase 3 Rides API."""

from backend.app.models.booking import Booking, BookingStatus


def test_health_check(client):
    """Test health check endpoint."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "NEXORA RIDE" in data["service"]


def test_create_booking_success(client):
    """Test valid booking creation."""
    payload = {
        "pickup": {
            "name": "MG Road Metro Station",
            "address": "MG Road, Bengaluru 560001",
            "latitude": 12.9758,
            "longitude": 77.6045,
            "is_demo": True,
        },
        "destination": {
            "name": "Indiranagar 100ft Road",
            "address": "100 Feet Rd, Indiranagar, Bengaluru 560038",
            "latitude": 12.9784,
            "longitude": 77.6408,
            "is_demo": True,
        },
        "ride_category": "bike",
        "estimated_distance_km": 4.5,
        "estimated_duration_minutes": 15,
        "estimated_fare_min": 75,
        "estimated_fare_max": 95,
        "currency": "INR",
    }

    res = client.post("/api/v1/rides", json=payload, headers={"X-Customer-Id": "cust_demo_01"})
    assert res.status_code == 201
    data = res.json()
    assert data["id"].startswith("ride_")
    assert data["customer_id"] == "cust_demo_01"
    assert data["status"] == "requested"  # Initial state is requested, no fabricated captain
    assert data["ride_category"] == "bike"
    assert data["estimated_fare_min"] == 75
    assert data["estimated_fare_max"] == 95
    assert data["currency"] == "INR"


def test_create_booking_invalid_coordinates(client):
    """Test that out-of-bounds coordinates are rejected."""
    payload = {
        "pickup": {
            "name": "Invalid Place",
            "address": "Nowhere",
            "latitude": 120.0,  # Invalid (> 90)
            "longitude": 77.6045,
        },
        "destination": {
            "name": "Valid Place",
            "address": "Somewhere",
            "latitude": 12.9784,
            "longitude": 77.6408,
        },
        "ride_category": "auto",
        "estimated_distance_km": 5.0,
        "estimated_fare_min": 50,
        "estimated_fare_max": 70,
    }

    res = client.post("/api/v1/rides", json=payload)
    assert res.status_code == 422


def test_create_booking_identical_coordinates(client):
    """Test that identical pickup and destination coordinates are rejected."""
    payload = {
        "pickup": {
            "name": "Point A",
            "address": "Address A",
            "latitude": 12.9758,
            "longitude": 77.6045,
        },
        "destination": {
            "name": "Point A Again",
            "address": "Address A Again",
            "latitude": 12.9758,
            "longitude": 77.6045,
        },
        "ride_category": "bike",
        "estimated_distance_km": 0.0,
        "estimated_fare_min": 30,
        "estimated_fare_max": 30,
    }

    res = client.post("/api/v1/rides", json=payload)
    assert res.status_code == 422


def test_create_booking_invalid_category(client):
    """Test that unsupported categories are rejected."""
    payload = {
        "pickup": {
            "name": "MG Road",
            "address": "MG Road",
            "latitude": 12.9758,
            "longitude": 77.6045,
        },
        "destination": {
            "name": "Indiranagar",
            "address": "Indiranagar",
            "latitude": 12.9784,
            "longitude": 77.6408,
        },
        "ride_category": "helicopter",  # Invalid
        "estimated_distance_km": 5.0,
        "estimated_fare_min": 50,
        "estimated_fare_max": 70,
    }

    res = client.post("/api/v1/rides", json=payload)
    assert res.status_code == 422


def test_create_booking_invalid_fare_range(client):
    """Test that fare_min > fare_max is rejected."""
    payload = {
        "pickup": {
            "name": "MG Road",
            "address": "MG Road",
            "latitude": 12.9758,
            "longitude": 77.6045,
        },
        "destination": {
            "name": "Indiranagar",
            "address": "Indiranagar",
            "latitude": 12.9784,
            "longitude": 77.6408,
        },
        "ride_category": "auto",
        "estimated_distance_km": 5.0,
        "estimated_fare_min": 150,
        "estimated_fare_max": 100,  # Invalid: min > max
    }

    res = client.post("/api/v1/rides", json=payload)
    assert res.status_code == 422


def test_idempotency_duplicate_prevention(client):
    """Test that repeating submission with same idempotency key does not create duplicates."""
    payload = {
        "pickup": {
            "name": "MG Road",
            "address": "MG Road",
            "latitude": 12.9758,
            "longitude": 77.6045,
        },
        "destination": {
            "name": "Indiranagar",
            "address": "Indiranagar",
            "latitude": 12.9784,
            "longitude": 77.6408,
        },
        "ride_category": "cab",
        "estimated_distance_km": 6.0,
        "estimated_fare_min": 120,
        "estimated_fare_max": 160,
    }

    headers = {"X-Customer-Id": "cust_demo_01", "Idempotency-Key": "idem_token_abc_123"}

    # First request creates booking
    res1 = client.post("/api/v1/rides", json=payload, headers=headers)
    assert res1.status_code == 201
    ride_id_1 = res1.json()["id"]

    # Second request with identical idempotency key returns existing booking
    res2 = client.post("/api/v1/rides", json=payload, headers=headers)
    assert res2.status_code == 201
    ride_id_2 = res2.json()["id"]

    assert ride_id_1 == ride_id_2

    # Check that database has only 1 record
    list_res = client.get("/api/v1/rides", headers={"X-Customer-Id": "cust_demo_01"})
    assert list_res.json()["total"] == 1


def test_customer_authorization_isolation(client):
    """Test that Customer A cannot view or list Customer B's bookings."""
    payload = {
        "pickup": {
            "name": "MG Road",
            "address": "MG Road",
            "latitude": 12.9758,
            "longitude": 77.6045,
        },
        "destination": {
            "name": "Indiranagar",
            "address": "Indiranagar",
            "latitude": 12.9784,
            "longitude": 77.6408,
        },
        "ride_category": "bike",
        "estimated_distance_km": 4.0,
        "estimated_fare_min": 60,
        "estimated_fare_max": 80,
    }

    # Customer A creates a booking
    res_a = client.post("/api/v1/rides", json=payload, headers={"X-Customer-Id": "cust_user_A"})
    assert res_a.status_code == 201
    ride_id_a = res_a.json()["id"]

    # Customer B attempts to get Customer A's booking by ID -> 403 Forbidden
    res_b_get = client.get(f"/api/v1/rides/{ride_id_a}", headers={"X-Customer-Id": "cust_user_B"})
    assert res_b_get.status_code == 403
    assert "not authorized" in res_b_get.json()["detail"].lower()

    # Customer B lists rides -> Customer A's ride is NOT in Customer B's list
    res_b_list = client.get("/api/v1/rides", headers={"X-Customer-Id": "cust_user_B"})
    assert res_b_list.status_code == 200
    assert res_b_list.json()["total"] == 0


def test_cancel_eligible_booking(client):
    """Test cancellation of an eligible 'requested' booking."""
    payload = {
        "pickup": {
            "name": "MG Road",
            "address": "MG Road",
            "latitude": 12.9758,
            "longitude": 77.6045,
        },
        "destination": {
            "name": "Indiranagar",
            "address": "Indiranagar",
            "latitude": 12.9784,
            "longitude": 77.6408,
        },
        "ride_category": "auto",
        "estimated_distance_km": 5.0,
        "estimated_fare_min": 70,
        "estimated_fare_max": 90,
    }

    headers = {"X-Customer-Id": "cust_demo_01"}
    res = client.post("/api/v1/rides", json=payload, headers=headers)
    ride_id = res.json()["id"]

    # Cancel ride
    cancel_res = client.post(
        f"/api/v1/rides/{ride_id}/cancel",
        json={"reason": "Plans changed"},
        headers=headers,
    )
    assert cancel_res.status_code == 200
    data = cancel_res.json()
    assert data["status"] == "cancelled"
    assert data["cancelled_at"] is not None
    assert data["cancellation_reason"] == "Plans changed"


def test_reject_already_cancelled_booking(client):
    """Test that cancelling an already-cancelled booking is rejected with 400 Bad Request."""
    payload = {
        "pickup": {
            "name": "MG Road",
            "address": "MG Road",
            "latitude": 12.9758,
            "longitude": 77.6045,
        },
        "destination": {
            "name": "Indiranagar",
            "address": "Indiranagar",
            "latitude": 12.9784,
            "longitude": 77.6408,
        },
        "ride_category": "cab",
        "estimated_distance_km": 5.0,
        "estimated_fare_min": 100,
        "estimated_fare_max": 140,
    }

    headers = {"X-Customer-Id": "cust_demo_01"}
    res = client.post("/api/v1/rides", json=payload, headers=headers)
    ride_id = res.json()["id"]

    # First cancel succeeds
    client.post(f"/api/v1/rides/{ride_id}/cancel", headers=headers)

    # Second cancel fails
    res_second = client.post(f"/api/v1/rides/{ride_id}/cancel", headers=headers)
    assert res_second.status_code == 400
    assert "already cancelled" in res_second.json()["detail"].lower()


def test_reject_completed_booking_cancellation(client, db_session):
    """Test that cancelling a completed ride is rejected."""
    # Insert completed ride directly into DB
    completed_ride = Booking(
        id="ride_completed_123",
        customer_id="cust_demo_01",
        pickup_name="A",
        pickup_address="A",
        pickup_latitude=12.9,
        pickup_longitude=77.6,
        destination_name="B",
        destination_address="B",
        destination_latitude=12.95,
        destination_longitude=77.65,
        ride_category="bike",
        estimated_distance_km=3.0,
        estimated_fare_min=45,
        estimated_fare_max=65,
        currency="INR",
        status=BookingStatus.COMPLETED.value,
    )
    db_session.add(completed_ride)
    db_session.commit()

    headers = {"X-Customer-Id": "cust_demo_01"}
    res = client.post("/api/v1/rides/ride_completed_123/cancel", headers=headers)
    assert res.status_code == 400
    assert "completed" in res.json()["detail"].lower()


def test_reject_unauthorized_cancellation(client):
    """Test that Customer B cannot cancel Customer A's ride."""
    payload = {
        "pickup": {
            "name": "A",
            "address": "A",
            "latitude": 12.9,
            "longitude": 77.6,
        },
        "destination": {
            "name": "B",
            "address": "B",
            "latitude": 12.95,
            "longitude": 77.65,
        },
        "ride_category": "bike",
        "estimated_distance_km": 2.0,
        "estimated_fare_min": 35,
        "estimated_fare_max": 50,
    }

    res_a = client.post("/api/v1/rides", json=payload, headers={"X-Customer-Id": "cust_A"})
    ride_id = res_a.json()["id"]

    # Customer B attempts to cancel Customer A's ride
    res_b = client.post(f"/api/v1/rides/{ride_id}/cancel", headers={"X-Customer-Id": "cust_B"})
    assert res_b.status_code == 403
