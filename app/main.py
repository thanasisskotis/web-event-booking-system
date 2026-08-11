from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.routers import admin, auth, events, bookings, messages, recommendations

app = FastAPI(title="Event Booking System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://localhost:5173", "https://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Χωρίς αυτό, ένα unhandled exception (π.χ. IntegrityError απο τη ΒΔ) προσπερνά
# το CORSMiddleware στο δρόμο της εξόδου -> ο browser βλέπει response ΧΩΡΙΣ
# Access-Control-Allow-Origin header και το εμφανίζει ως "Network Error" αντί
# για το πραγματικό status code, ακόμα κι αν ο server απάντησε κανονικά (φαίνεται
# στο uvicorn log ως 500, όχι στον browser). Έτσι κάθε unhandled exception
# επιστρέφει σαν κανονική JSON response, που περνάει σωστά μέσα απο το CORS
# middleware.
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
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
