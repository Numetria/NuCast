import React, { useState, useEffect } from 'react';
import Plot from './Plot';
import Map from './Map';

const WeatherDashboard = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [sunriseSunsetData, setSunriseSunsetData] = useState([]);
  const latitude = 28.0836; // Latitude for Melbourne, Florida
  const longitude = -80.6081; // Longitude for Melbourne, Florida

  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        // Open-Meteo is CORS-enabled; call it straight from the browser.
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,relative_humidity_2m`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherJson = await weatherResponse.json();
        const times = weatherJson.hourly?.time ?? [];
        const temps = weatherJson.hourly?.temperature_2m ?? [];
        setWeatherData(
          times.map((date, i) => ({ date, temperature_2m: temps[i] }))
        );

        // Sunrise-sunset for the next 5 days.
        const now = new Date();
        const sunriseSunsetPromises = [];
        for (let i = 0; i < 5; i++) {
          const date = new Date(now);
          date.setDate(now.getDate() + i);
          const formattedDate = date.toISOString().split('T')[0];
          sunriseSunsetPromises.push(
            fetch(
              `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&date=${formattedDate}&formatted=0`
            ).then((r) => r.json())
          );
        }
        const responses = await Promise.all(sunriseSunsetPromises);
        setSunriseSunsetData(
          responses
            .filter((r) => r.status === 'OK' && r.results)
            .map((r) => ({ sunrise: r.results.sunrise, sunset: r.results.sunset }))
        );
      } catch (error) {
        console.error('Error fetching data:', error);
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
