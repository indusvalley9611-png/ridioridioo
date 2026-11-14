"""NEXORA RIDE - Customer Identity & Authorization Dependency.

PHASE 3 SECURITY DOCUMENTATION:
In Phase 3 (Foundation & Demo Identity), authentication is managed through an
explicitly identified customer token/header (`X-Customer-Id` or `Authorization: Bearer <token>`).
For development and demo modes, requests without a header default to the isolated
demo profile `cust_demo_01`.

PRODUCTION AUTHENTICATION NOTICE:
In production, client-supplied headers MUST NOT be trusted alone. In Phase 4+, this
interface will be backed by verified JWT / OAuth2 bearer tokens issued by an identity
provider (e.g., Supabase / Firebase / AWS Cognito), where the customer ID is cryptographically
verified from the token claims.
"""

from typing import Optional
from fastapi import Header, HTTPException, status
from backend.app.config import settings


class AuthenticatedCustomer:
    def __init__(self, customer_id: str, is_demo: bool = True):
        self.customer_id = customer_id
        self.is_demo = is_demo


def get_current_customer(
    x_customer_id: Optional[str] = Header(None, alias="X-Customer-Id"),
) -> AuthenticatedCustomer:
    """Extracts and validates customer identity from request context.

    Enforces that queries are strictly scoped to the requesting customer.
    """
    if x_customer_id:
        customer_id = x_customer_id.strip()
        if not customer_id or len(customer_id) > 64:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Malformed or invalid X-Customer-Id header",
            )
        is_demo = customer_id.startswith("cust_demo")
        return AuthenticatedCustomer(customer_id=customer_id, is_demo=is_demo)

    # Isolated demo fallback when no header is supplied
    return AuthenticatedCustomer(
        customer_id=settings.DEMO_CUSTOMER_ID,
        is_demo=True,
    )


def require_admin_access(
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> bool:
    """Verifies administrative privileges on protected management endpoints.

    Rejects unauthenticated requests with HTTP 403 Forbidden.
    """
    token = x_admin_key
    if not token and authorization:
        if authorization.lower().startswith("bearer "):
            token = authorization[7:].strip()
        else:
            token = authorization.strip()

    if not token or token != settings.ADMIN_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Valid administrator credentials required.",
        )
    return True

