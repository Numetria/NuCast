import React from 'react';

const Map = ({ latitude, longitude }) => {
  const iframeSrc = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=m/s&zoom=8&overlay=wind&product=ecmwf&level=surface&lat=${latitude}&lon=${longitude}&detailLat=${latitude}&detailLon=${longitude}&marker=true&pressure=true&message=true`;

  return (
    <iframe
      width="650"
      height="450"
      src={iframeSrc}
      frameborder="0"
      title="Weather Map"
    ></iframe>
  );
};

export default Map;