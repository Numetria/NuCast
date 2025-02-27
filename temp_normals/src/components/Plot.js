import React from 'react';
import { Line } from 'react-chartjs-2';

const Plot = ({ weatherData }) => {
  if (!weatherData) {
    return <div>Loading...</div>;
  }

  const data = {
    labels: weatherData.hourly.time,
    datasets: [
      {
        label: 'Current Temperature',
        data: weatherData.hourly.temperature_2m,
        borderColor: 'rgba(75,192,192,1)',
        fill: false,
      },
    ],
  };

  return <Line data={data} />;
};

export default Plot;