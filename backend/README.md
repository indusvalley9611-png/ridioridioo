# NEXORA RIDE — Backend API (FastAPI + PostgreSQL / SQLite)

Backend service for the **NEXORA RIDE** Indian urban ride-booking platform.

## Architecture

- **Framework**: Python 3.12+, FastAPI
- **Database**: PostgreSQL (Production) with SQLite (Local zero-config fallback)
- **ORM**: SQLAlchemy 2.x
- **Migrations**: Alembic
- **Validation**: Pydantic v2
- **Testing**: Pytest + FastAPI TestClient

---

## Directory Structure

```
backend/
├── alembic/                      # Database migrations
│   ├── versions/
│   │   └── 001_create_bookings_table.py
│   └── env.py
├── alembic.ini                   # Alembic configuration
├── app/
│   ├── config.py                 # Pydantic Settings
│   ├── database.py               # SQLAlchemy Engine & SessionLocal
│   ├── auth.py                   # Customer identity & authorization
│   ├── models/
│   │   └── booking.py            # Booking ORM model
│   ├── schemas/
│   │   └── booking.py            # Pydantic request & response schemas
│   ├── routers/
│   │   ├── health.py             # Health check endpoint
│   │   └── rides.py              # Rides REST endpoints
│   └── main.py                   # FastAPI application
├── tests/
│   ├── conftest.py               # Test DB fixtures
│   └── test_rides.py             # Unit & integration test suite
├── .env.example                  # Environment configuration template
└── requirements.txt              # Python dependencies
```

---

## Quickstart

### 1. Set Up Environment

```bash
# From workspace root
cd backend

# Create & activate virtual environment (Windows PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Copy environment template
copy .env.example .env
```

### 2. Run Database Migrations

```bash
.\venv\Scripts\alembic.exe upgrade head
```

### 3. Start the Server

```bash
# Starts development server on http://0.0.0.0:8000
.\venv\Scripts\uvicorn.exe backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation will be available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

---

## Mobile Client Networking Guide

Android mobile devices cannot reach your development machine using `http://localhost:8000`:

1. **Android Emulator**:
   - Use `http://10.0.2.2:8000`
   - Android emulators route `10.0.2.2` directly to the host machine's loopback interface.

2. **Physical Android Device (over Wi-Fi / LAN)**:
   - Connect phone to the same Wi-Fi network as your computer.
   - Find your computer's local IP (e.g. run `ipconfig` on Windows; look for IPv4 Address such as `192.168.1.15`).
   - Use `http://192.168.1.15:8000`.

3. **Web Browser / Desktop**:
   - Use `http://127.0.0.1:8000`.

---

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Basic service health status without secrets |
| `POST` | `/api/v1/rides` | Create a new ride booking (supports `Idempotency-Key` header) |
| `GET` | `/api/v1/rides` | List bookings belonging to the requesting customer |
| `GET` | `/api/v1/rides/{ride_id}` | Retrieve single booking details (customer-authorized) |
| `POST` | `/api/v1/rides/{ride_id}/cancel` | Cancel an eligible booking |

---

## Running Automated Tests

```bash
# Run pytest from the repository root:
.\backend\venv\Scripts\pytest.exe -v backend/tests
```

All 12 backend test cases verify:
- Valid booking creation and initial `requested` lifecycle state.
- Rejection of out-of-range coordinates.
- Rejection of identical pickup and drop coordinates.
- Rejection of invalid ride categories.
- Rejection of inverted fare ranges.
- Idempotency key duplicate submission prevention.
- Customer authorization isolation (Customer A cannot access Customer B's records).
- Cancellation of eligible bookings.
- Rejection of cancelling completed or already-cancelled bookings.
- Rejection of unauthorized cancellations.
