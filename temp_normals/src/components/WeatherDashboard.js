import React, { useState, useEffect } from 'react';
import Plot from './Plot';
import Map from './Map';
import axios from 'axios';

const WeatherDashboard = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [metarData, setMetarData] = useState(null);
  const latitude = 40.7128; // Example latitude for New York
  const longitude = -74.0060; // Example longitude for New York
  const station = "KJFK"; // Example METAR station

  useEffect(() => {
    const fetchWeatherData = async () => {
      const weatherResponse = await axios.get(`/weather/${latitude}/${longitude}`);
      setWeatherData(weatherResponse.data);
    };

    const fetchMetarData = async () => {
      const metarResponse = await axios.get(`/metar/${station}`);
      setMetarData(metarResponse.data);
    };

    fetchWeatherData();
    fetchMetarData();
  }, []);

  return (
    <div className="weather-dashboard">
      <div className="left-panel">
        <Plot weatherData={weatherData} />
      </div>
      <div className="right-panel">
        <Map latitude={latitude} longitude={longitude} station={station} />
      </div>
    </div>
  );
};

export default WeatherDashboard;