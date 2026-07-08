from fastapi import FastAPI

from app.routers import admin, auth, events

app = FastAPI(title="Event Booking System")

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(events.router)


@app.get("/health")
def health():
    return {"status": "ok"}
