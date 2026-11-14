"""Tests for Twilio OTP & Emergency SOS Integration."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_send_otp_success():
    """Verify that send-otp returns success and registers an OTP code."""
    response = client.post(
        "/api/v1/auth/send-otp",
        json={"phone_number": "9876543210"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "+919876543210" in data["phone"]
    assert "dev_otp" in data
    assert len(data["dev_otp"]) == 6


def test_verify_otp_flow():
    """Verify end-to-end send-otp followed by verify-otp."""
    # 1. Send OTP to fresh test phone
    test_phone = "9876543211"
    send_res = client.post(
        "/api/v1/auth/send-otp",
        json={"phone_number": test_phone},
    )
    assert send_res.status_code == 200
    otp_code = send_res.json()["dev_otp"]

    # 2. Verify with wrong OTP -> fails
    bad_res = client.post(
        "/api/v1/auth/verify-otp",
        json={"phone_number": test_phone, "otp_code": "000000"},
    )
    assert bad_res.status_code == 400

    # 3. Verify with correct OTP -> succeeds
    good_res = client.post(
        "/api/v1/auth/verify-otp",
        json={"phone_number": test_phone, "otp_code": otp_code},
    )
    assert good_res.status_code == 200
    verify_data = good_res.json()
    assert verify_data["verified"] is True
    assert "token" in verify_data
    assert verify_data["name"] == "Gokul R."


def test_send_otp_rate_limiting():
    """Verify rate-limiting prevents immediate repeated OTP dispatch to same number."""
    phone = "9844112233"
    # First request succeeds
    r1 = client.post("/api/v1/auth/send-otp", json={"phone_number": phone})
    assert r1.status_code == 200
    assert r1.json()["success"] is True

    # Immediate second request is rate-limited
    r2 = client.post("/api/v1/auth/send-otp", json={"phone_number": phone})
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2["success"] is False
    assert "wait" in data2["message"].lower()


def test_sos_alert():
    """Verify that SOS emergency alert triggers correctly."""
    response = client.post(
        "/api/v1/safety/sos-alert",
        json={
            "emergency_contact_phone": "+919876543210",
            "rider_name": "Gokul R.",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "trip_id": "TRIP-TEST-001",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "maps_url" in data
    assert "12.97160" in data["maps_url"]
