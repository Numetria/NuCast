import requests
from fastapi import APIRouter

router = APIRouter()

def fetch_weather_data(lat, lon):
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,relative_humidity_2m"
    response = requests.get(url)
    data = response.json()
    return data

@router.get("/weather/{lat}/{lon}")
def get_weather(lat: float, lon: float):
    data = fetch_weather_data(lat, lon)
    hourly = data.get("hourly", {})
    times = hourly.get("time", [])
    temps = hourly.get("temperature_2m", [])
    return [
        {"date": t, "temperature_2m": v}
        for t, v in zip(times, temps)
    ]

@router.get("/sunrise-sunset/{lat}/{lon}/{date}")
def get_sunrise_sunset(lat: float, lon: float, date: str):
    url = f"https://api.sunrise-sunset.org/json?lat={lat}&lng={lon}&date={date}&formatted=0"
    response = requests.get(url)
    data = response.json()
    return {
        "sunrise": data["results"]["sunrise"],
        "sunset": data["results"]["sunset"],
    }
