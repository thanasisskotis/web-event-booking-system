from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import admin, auth, events, bookings, messages, recommendations

app = FastAPI(title="Event Booking System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serves uploaded event photos at GET /uploads/<filename>, matching the URL
# shape built in PhotoOut.from_orm_photo (schemas/event.py).
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(events.router)
app.include_router(bookings.router)
app.include_router(messages.router)
app.include_router(recommendations.router)


@app.get("/health")
def health():
    return {"status": "ok"}
