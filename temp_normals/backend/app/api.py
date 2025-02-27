from fastapi import APIRouter, HTTPException
import requests_cache
import pandas as pd
from retry_requests import retry
import openmeteo_requests
import requests

router = APIRouter()

# Setup the Open-Meteo API client with cache and retry on error
cache_session = requests_cache.CachedSession('.cache', expire_after=3600)
retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
openmeteo = openmeteo_requests.Client(session=retry_session)

@router.get("/weather/{latitude}/{longitude}")
async def get_weather(latitude: float, longitude: float):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": "temperature_2m"
    }
    try:
        responses = openmeteo.weather_api(url, params=params)
        response = responses[0]
        hourly = response.Hourly()
        hourly_temperature_2m = hourly.Variables(0).ValuesAsNumpy()
        hourly_data = {
            "date": pd.date_range(
                start=pd.to_datetime(hourly.Time(), unit="s", utc=True),
                end=pd.to_datetime(hourly.TimeEnd(), unit="s", utc=True),
                freq=pd.Timedelta(seconds=hourly.Interval()),
                inclusive="left"
            ),
            "temperature_2m": hourly_temperature_2m
        }
        hourly_dataframe = pd.DataFrame(data=hourly_data)
        return hourly_dataframe.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sunrise-sunset/{latitude}/{longitude}/{date}")
async def get_sunrise_sunset(latitude: float, longitude: float, date: str):
    url = f"https://api.sunrise-sunset.org/json?lat={latitude}&lng={longitude}&date={date}&formatted=0"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        return {
            "sunrise": data["results"]["sunrise"],
            "sunset": data["results"]["sunset"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))