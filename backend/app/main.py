from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import aqi, classify, clean_air, risk, submissions, trend
from scripts.seed_db import seed_clean_air_locations

Base.metadata.create_all(bind=engine)
# Idempotent -- safe to call on every boot. Needed because Render's free tier
# gives no convenient one-off shell against a fresh Postgres instance, so the
# app seeding itself on startup is what makes a first deploy actually work.
seed_clean_air_locations()

app = FastAPI(
    title="Wildfire Smoke Exposure Risk API",
    description="Personal wildfire smoke risk scoring combining CV smoke-density estimation, "
    "live AQI data, and crowd-sourced coverage of monitoring deserts.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to the deployed frontend origin before submission
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(aqi.router)
app.include_router(classify.router)
app.include_router(risk.router)
app.include_router(submissions.router)
app.include_router(clean_air.router)
app.include_router(trend.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
