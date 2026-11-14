"""NEXORA RIDE - 24x7 Safety & Twilio Emergency Dispatch Router."""

from fastapi import APIRouter, HTTPException, status
try:
    from app.schemas.auth import SosAlertRequest, SosAlertResponse
    from app.services.twilio_service import twilio_service
except ImportError:
    from backend.app.schemas.auth import SosAlertRequest, SosAlertResponse
    from backend.app.services.twilio_service import twilio_service

router = APIRouter(prefix="/safety", tags=["24x7 Safety & SOS"])


@router.post("/sos-alert", response_model=SosAlertResponse)
def trigger_sos_alert(payload: SosAlertRequest):
    """Dispatch real-time emergency SMS alert with live GPS coordinates via Twilio."""
    if not payload.emergency_contact_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Emergency contact phone number is required.",
        )

    result = twilio_service.send_emergency_sos(
        to_phone=payload.emergency_contact_phone,
        rider_name=payload.rider_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        trip_id=payload.trip_id,
    )

    if not result.get("success"):
        return SosAlertResponse(
            success=False,
            message=result.get("error", "Emergency alert failed to dispatch."),
            maps_url=result.get("maps_url"),
        )

    return SosAlertResponse(
        success=True,
        message="Emergency SOS dispatched successfully via Twilio SMS to trusted contact.",
        maps_url=result.get("maps_url"),
    )
