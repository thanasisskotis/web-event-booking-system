from fastapi import FastAPI

from app.routers import admin, auth, events, bookings

app = FastAPI(title="Event Booking System")

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(events.router)
app.include_router(bookings.router)


@app.get("/health")
def health():
    return {"status": "ok"}
