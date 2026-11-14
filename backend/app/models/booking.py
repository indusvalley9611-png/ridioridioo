"""NEXORA RIDE - Booking SQLAlchemy Model."""

import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    DateTime,
    Index,
)
from backend.app.database import Base


class BookingStatus(str, enum.Enum):
    REQUESTED = "requested"
    SEARCHING = "searching"
    ASSIGNED = "assigned"
    ARRIVING = "arriving"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_MATCH = "no_match"


class RideCategoryEnum(str, enum.Enum):
    BIKE = "bike"
    AUTO = "auto"
    CAB = "cab"


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(String(64), primary_key=True, index=True)
    customer_id = Column(String(64), nullable=False, index=True)

    # Pickup Location
    pickup_name = Column(String(255), nullable=False)
    pickup_address = Column(String(500), nullable=False)
    pickup_latitude = Column(Float, nullable=False)
    pickup_longitude = Column(Float, nullable=False)
    pickup_is_demo = Column(Boolean, default=False, nullable=False)

    # Destination Location
    destination_name = Column(String(255), nullable=False)
    destination_address = Column(String(500), nullable=False)
    destination_latitude = Column(Float, nullable=False)
    destination_longitude = Column(Float, nullable=False)
    destination_is_demo = Column(Boolean, default=False, nullable=False)

    # Vehicle Category & Fare
    ride_category = Column(String(32), nullable=False)
    estimated_distance_km = Column(Float, nullable=False)
    estimated_duration_minutes = Column(Integer, nullable=True)
    estimated_fare_min = Column(Integer, nullable=False)
    estimated_fare_max = Column(Integer, nullable=False)
    currency = Column(String(8), default="INR", nullable=False)

    # Lifecycle State
    status = Column(String(32), default=BookingStatus.REQUESTED.value, nullable=False, index=True)

    # Idempotency Key (to prevent duplicate submissions)
    idempotency_key = Column(String(128), unique=True, index=True, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    cancelled_at = Column(DateTime, nullable=True)
    cancellation_reason = Column(String(255), nullable=True)

    __table_args__ = (
        Index("idx_customer_status", "customer_id", "status"),
    )
