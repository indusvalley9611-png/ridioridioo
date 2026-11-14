"""NEXORA RIDE - Auth Router (Powered by Twilio).

Endpoints:
- POST /api/v1/auth/send-otp: Dispatches real SMS OTP via Twilio
- POST /api/v1/auth/verify-otp: Verifies 6-digit code and returns authenticated session
"""

from fastapi import APIRouter, HTTPException, status
try:
    from app.schemas.auth import (
        SendOtpRequest,
        SendOtpResponse,
        VerifyOtpRequest,
        VerifyOtpResponse,
    )
    from app.services.twilio_service import twilio_service
    from app.config import settings
except ImportError:
    from backend.app.schemas.auth import (
        SendOtpRequest,
        SendOtpResponse,
        VerifyOtpRequest,
        VerifyOtpResponse,
    )
    from backend.app.services.twilio_service import twilio_service
    from backend.app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication & Twilio"])


@router.post("/send-otp", response_model=SendOtpResponse)
def send_otp(payload: SendOtpRequest):
    """Dispatch a 6-digit verification code to the user's phone via Twilio SMS."""
    phone = payload.phone_number.strip()
    if not phone or len(phone) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid phone number.",
        )

    result = twilio_service.send_verification_otp(phone)

    if not result.get("success"):
        # If Twilio fails (e.g. unverified trial recipient), return graceful message
        return SendOtpResponse(
            success=False,
            phone=result.get("phone", phone),
            message=result.get("error", "Failed to dispatch SMS."),
            dev_otp=result.get("dev_otp"),
        )

    return SendOtpResponse(
        success=True,
        phone=result["phone"],
        message="Verification code sent successfully via SMS.",
        expires_in_seconds=result.get("expires_in_seconds", 300),
        message_sid=result.get("message_sid"),
        dev_otp=result.get("dev_otp"),
    )


@router.post("/verify-otp", response_model=VerifyOtpResponse)
def verify_otp(payload: VerifyOtpRequest):
    """Verify the 6-digit OTP code submitted by the user."""
    phone = payload.phone_number.strip()
    code = payload.otp_code.strip()

    is_valid = twilio_service.verify_otp(phone, code)

    # Allow master test code "999999" in development
    if not is_valid and settings.ENVIRONMENT != "production" and code == "999999":
        is_valid = True

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please try again.",
        )

    # Return authenticated customer identity
    return VerifyOtpResponse(
        verified=True,
        customer_id=settings.DEMO_CUSTOMER_ID,
        name=settings.DEMO_CUSTOMER_NAME,
        phone=phone,
        token=f"nexora_session_{int(settings.DEMO_CUSTOMER_ID[-2:] if settings.DEMO_CUSTOMER_ID[-2:].isdigit() else 1):04d}",
        message="Phone number successfully verified.",
    )
