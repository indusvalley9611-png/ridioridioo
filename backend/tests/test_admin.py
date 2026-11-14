"""Tests for Protected Administrative API Endpoints."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.config import settings

client = TestClient(app)


def test_admin_endpoints_require_authentication():
    """Unauthenticated requests must be rejected with HTTP 403 Forbidden."""
    # 1. Analytics
    res_analytics = client.get("/api/v1/admin/analytics")
    assert res_analytics.status_code == 403

    # 2. Pending KYC Queue
    res_kyc = client.get("/api/v1/admin/kyc-pending")
    assert res_kyc.status_code == 403

    # 3. KYC Approval
    res_approve = client.post("/api/v1/admin/kyc-approve/drv_101")
    assert res_approve.status_code == 403


def test_admin_endpoints_allow_valid_admin_key():
    """Requests presenting valid X-Admin-Key header must succeed."""
    headers = {"X-Admin-Key": settings.ADMIN_SECRET_KEY}

    res_analytics = client.get("/api/v1/admin/analytics", headers=headers)
    assert res_analytics.status_code == 200
    assert "metrics" in res_analytics.json()

    res_kyc = client.get("/api/v1/admin/kyc-pending", headers=headers)
    assert res_kyc.status_code == 200
    assert "drivers" in res_kyc.json()


def test_admin_endpoints_reject_invalid_key():
    """Requests presenting wrong admin key must be rejected with HTTP 403 Forbidden."""
    headers = {"X-Admin-Key": "wrong_attacker_secret"}
    res = client.get("/api/v1/admin/analytics", headers=headers)
    assert res.status_code == 403
