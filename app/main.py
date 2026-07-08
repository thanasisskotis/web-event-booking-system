from fastapi import FastAPI

from app.routers import admin, auth

app = FastAPI(title="Event Booking System")

app.include_router(auth.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}
