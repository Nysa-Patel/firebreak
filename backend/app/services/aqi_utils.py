from app.models.schemas import AqiCategory

# EPA AQI breakpoints (https://www.airnow.gov/aqi/aqi-basics/)
_BREAKPOINTS: list[tuple[int, int, AqiCategory]] = [
    (0, 50, "good"),
    (51, 100, "moderate"),
    (101, 150, "unhealthy_sensitive"),
    (151, 200, "unhealthy"),
    (201, 300, "very_unhealthy"),
    (301, 10_000, "hazardous"),
]


def aqi_to_category(aqi: int) -> AqiCategory:
    for lo, hi, category in _BREAKPOINTS:
        if lo <= aqi <= hi:
            return category
    return "hazardous"
