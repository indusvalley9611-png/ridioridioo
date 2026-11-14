"""NEXORA RIDE - Web Administration & Business Analytics Router.

Provides authorized admin staff with:
1. SaaS Business Analytics (MRR, ARR, Conversion, MAU)
2. Driver KYC & Identity Document Moderation
3. Subscription Plan & Price Configuration
4. Safety & Dispute Incident Monitoring
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
import time

try:
    from app.auth import require_admin_access
except ImportError:
    from backend.app.auth import require_admin_access

router = APIRouter(
    prefix="/admin",
    tags=["Admin Dashboard"],
    dependencies=[Depends(require_admin_access)],
)

# Mock Drivers KYC Queue
_DRIVER_KYC_QUEUE = [
    {
        "driver_id": "drv_101",
        "full_name": "Arun Kumar",
        "phone": "+919443211223",
        "dl_number": "KA-01-20190034120",
        "dl_expiry": "2034-05-18",
        "aadhaar_last4": "4912",
        "vehicle_rc": "KA 05 MN 1892",
        "vehicle_model": "Maruti Brezza (Petrol)",
        "status": "pending",
        "submitted_at": "2026-10-28T14:20:00Z",
    },
    {
        "driver_id": "drv_102",
        "full_name": "Priya Sundaram",
        "phone": "+919840155667",
        "dl_number": "TN-07-20200088211",
        "dl_expiry": "2032-11-20",
        "aadhaar_last4": "3341",
        "vehicle_rc": "TN 07 BE 5543",
        "vehicle_model": "Tata Nexon EV (Electric)",
        "status": "pending",
        "submitted_at": "2026-10-29T09:15:00Z",
    },
]


@router.get("/analytics")
def get_business_analytics():
    """Retrieve Core Platform Analytics & Operational Metrics."""
    total_users = 4850
    total_rides = 3920
    completion_rate = 97.8

    return {
        "metrics": {
            "total_registered_users": total_users,
            "monthly_active_users": total_rides,
            "funnel": {
                "ride_completion_rate_percentage": completion_rate,
            },
            "safety_overview": {
                "sos_triggers_past_30d": 1,
                "resolved_complaints": 14,
                "pending_disputes": 0,
            },
        }
    }


@router.get("/kyc-pending")
def list_pending_driver_verifications():
    """List drivers awaiting identity, DL, and vehicle registration review."""
    pending = [d for d in _DRIVER_KYC_QUEUE if d["status"] == "pending"]
    return {"pending_count": len(pending), "drivers": pending}


@router.post("/kyc-approve/{driver_id}")
def approve_driver_kyc(driver_id: str):
    """Admin action to approve a driver's DL and vehicle for carpooling."""
    driver = next((d for d in _DRIVER_KYC_QUEUE if d["driver_id"] == driver_id), None)
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Driver ID {driver_id} not found in KYC queue",
        )

    driver["status"] = "verified"
    driver["verified_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    return {
        "success": True,
        "message": f"Driver {driver['full_name']} successfully approved.",
        "driver": driver,
    }
