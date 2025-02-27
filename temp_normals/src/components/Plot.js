import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { format, parseISO } from 'date-fns';
import { toDate, toZonedTime } from 'date-fns-tz';
import annotationPlugin from 'chartjs-plugin-annotation';

// Register the required components and scales
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale, annotationPlugin);

const Plot = ({ weatherData, sunriseSunsetData, latitude, longitude }) => {
  if (!weatherData || sunriseSunsetData.length === 0) {
    return <div>Loading...</div>;
  }

  // Get the timezone for the given latitude and longitude
  const timeZone = 'America/New_York'; // For Melbourne, Florida

  // Filter data for the next 5 days and convert to local time
  const now = new Date();
  const fiveDaysLater = new Date(now);
  fiveDaysLater.setDate(now.getDate() + 5);
  const filteredData = weatherData.filter(entry => new Date(entry.date) <= fiveDaysLater);

  const tempValues = filteredData.map(entry => entry.temperature_2m);
  const avgTemp = tempValues.reduce((a, b) => a + b, 0) / tempValues.length;

  const data = {
    labels: filteredData.map(entry => toZonedTime(toDate(entry.date), timeZone)),
    datasets: [
      {
        label: 'Current Temperature',
        data: tempValues,
        borderColor: 'rgba(255,0,0,1)',
        backgroundColor: 'rgba(255,0,0,0.2)',
        fill: false,
      },
    ],
  };

  // Generate background color based on sunrise and sunset times
  const backgroundColor = {
    beforeSunrise: 'rgba(0,0,0,0.1)', // Night
    afterSunset: 'rgba(0,0,0,0.1)', // Night
    day: 'rgba(255,255,0,0.1)', // Day
  };

  const sunriseSunsetBackgrounds = sunriseSunsetData.map(({ sunrise, sunset }) => {
    const sunriseTime = toZonedTime(parseISO(sunrise), timeZone);
    const sunsetTime = toZonedTime(parseISO(sunset), timeZone);
    return {
      sunrise: sunriseTime,
      sunset: sunsetTime,
    };
  });

  const backgroundBands = sunriseSunsetBackgrounds.flatMap(({ sunrise, sunset }) => [
    {
      from: new Date(sunrise).getTime(),
      to: new Date(sunset).getTime(),
      color: backgroundColor.day,
    },
    {
      from: new Date(sunset).getTime(),
      to: new Date(sunrise).getTime() + 86400000, // add 24 hours for the next day's sunrise
      color: backgroundColor.beforeSunrise,
    },
  ]);

  const currentTime = new Date();

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Temperature Over Time',
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.raw.toFixed(2)} °C`;
          },
        },
      },
      annotation: {
        annotations: [
          ...backgroundBands.map(band => ({
            type: 'box',
            xMin: band.from,
            xMax: band.to,
            backgroundColor: band.color,
          })),
          {
            type: 'line',
            scaleID: 'x',
            value: currentTime,
            borderColor: 'red',
            borderWidth: 2,
            label: {
              content: 'Current Time',
              enabled: true,
              position: 'center',
            },
          },
        ],
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'hour',
          tooltipFormat: 'PPpp',
          displayFormats: {
            hour: 'ha',
            day: 'MMM d',
          },
        },
        title: {
          display: true,
          text: format(now, 'MMMM dd, yyyy'),
        },
      },
      y: {
        type: 'linear',
        title: {
          display: true,
          text: 'Temperature (°C)',
        },
      },
    },
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <strong>Average Temperature: {avgTemp.toFixed(2)} °C</strong>
      </div>
      <Line data={data} options={options} />
    </div>
  );
};

export default Plot;