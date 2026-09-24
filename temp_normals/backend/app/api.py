import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def fetch_weather_data(lat, lon):
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,relative_humidity_2m"
    response = requests.get(url)
    data = response.json()
    return data

@app.get("/weather/{lat}/{lon}")
def get_weather(lat: float, lon: float):
    data = fetch_weather_data(lat, lon)
    return data

@app.get("/sunrise-sunset/{lat}/{lon}/{date}")
def get_sunrise_sunset(lat: float, lon: float, date: str):
    url = f"https://api.sunrise-sunset.org/json?lat={lat}&lng={lon}&date={date}"
    response = requests.get(url)
    data = response.json()
    return data["results"]