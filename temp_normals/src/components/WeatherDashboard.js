import React, { useState, useEffect } from 'react';
import Plot from './Plot';
import Map from './Map';
import axios from 'axios';

const WeatherDashboard = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [sunriseSunsetData, setSunriseSunsetData] = useState([]);
  const latitude = 28.0836; // Latitude for Melbourne, Florida
  const longitude = -80.6081; // Longitude for Melbourne, Florida

  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        const weatherResponse = await axios.get(`http://localhost:8000/weather/${latitude}/${longitude}`);
        setWeatherData(weatherResponse.data);

        // Fetch sunrise and sunset times for the next 5 days
        const now = new Date();
        const sunriseSunsetPromises = [];
        for (let i = 0; i < 5; i++) {
          const date = new Date(now);
          date.setDate(now.getDate() + i);
          const formattedDate = date.toISOString().split('T')[0];
          sunriseSunsetPromises.push(
            axios.get(`http://localhost:8000/sunrise-sunset/${latitude}/${longitude}/${formattedDate}`)
          );
        }
        const sunriseSunsetResponses = await Promise.all(sunriseSunsetPromises);
        setSunriseSunsetData(sunriseSunsetResponses.map(response => response.data));
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchWeatherData();
  }, [latitude, longitude]);

  return (
    <div className="weather-dashboard" style={{ display: 'flex' }}>
      <div className="left-panel" style={{ flex: 1 }}>
        <Plot weatherData={weatherData} sunriseSunsetData={sunriseSunsetData} latitude={latitude} longitude={longitude} />
      </div>
      <div className="right-panel" style={{ flex: 1 }}>
        <Map latitude={latitude} longitude={longitude} />
      </div>
    </div>
  );
};

export default WeatherDashboard;