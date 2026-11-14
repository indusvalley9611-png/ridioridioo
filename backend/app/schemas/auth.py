"""NEXORA RIDE - Auth & Twilio Schemas."""

from typing import Optional
from pydantic import BaseModel, Field


class SendOtpRequest(BaseModel):
    phone_number: str = Field(..., description="Indian phone number (e.g. +919876543210 or 9876543210)")


class SendOtpResponse(BaseModel):
    success: bool
    phone: str
    message: str
    expires_in_seconds: int = 300
    message_sid: Optional[str] = None
    dev_otp: Optional[str] = None


class VerifyOtpRequest(BaseModel):
    phone_number: str
    otp_code: str = Field(..., min_length=4, max_length=8)


class VerifyOtpResponse(BaseModel):
    verified: bool
    customer_id: str
    name: str
    phone: str
    token: Optional[str] = None
    message: str


class SosAlertRequest(BaseModel):
    emergency_contact_phone: str
    rider_name: str
    latitude: float
    longitude: float
    trip_id: Optional[str] = None


class SosAlertResponse(BaseModel):
    success: bool
    message: str
    maps_url: Optional[str] = None
