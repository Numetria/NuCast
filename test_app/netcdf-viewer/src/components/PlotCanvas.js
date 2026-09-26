import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

function PlotCanvas({ data, variable, suggestedPlot }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!data || !ref.current) return;
    ref.current.innerHTML = '';

    const width = 700;
    const height = 500;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };

    const svg = d3
      .select(ref.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const title = `${variable.label || variable.name}${variable.units ? ` (${variable.units})` : ''}`;
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text(title);

    const plotType = suggestedPlot || variable.suggested_plot;

    if (plotType === 'map' || plotType === 'heatmap') {
      render2D(svg, data, width, height, margin);
    } else {
      render1D(svg, data, width, height, margin);
    }
  }, [data, variable, suggestedPlot]);

  return <div className="plot-canvas" ref={ref} />;
}

function render2D(svg, data, width, height, margin) {
  const values = data.values;
  if (!Array.isArray(values) || values.length === 0) return;

  const ny = values.length;
  const nx = Array.isArray(values[0]) ? values[0].length : 1;

  const flat = ny === 1 || nx === 1
    ? [].concat(...values)
    : [].concat(...values);

  const numeric = flat.filter((v) => typeof v === 'number' && !isNaN(v));
  const min = d3.min(numeric) || 0;
  const max = d3.max(numeric) || 1;

  const colorScale = d3.scaleSequential(d3.interpolateViridis).domain([min, max]);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const cellW = innerWidth / nx;
  const cellH = innerHeight / ny;

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const matrix = ny === 1 ? [values] : values;
  for (let i = 0; i < ny; i++) {
    for (let j = 0; j < nx; j++) {
      const v = matrix[i] && matrix[i][j];
      if (typeof v === 'number' && !isNaN(v)) {
        g.append('rect')
          .attr('x', j * cellW)
          .attr('y', i * cellH)
          .attr('width', cellW)
          .attr('height', cellH)
          .attr('fill', colorScale(v));
      }
    }
  }

  // Color legend
  const legendG = svg.append('g')
    .attr('transform', `translate(${width - 40},${margin.top})`);
  const legendScale = d3.scaleLinear().domain([min, max]).range([innerHeight, 0]);
  const legendAxis = d3.axisRight(legendScale).ticks(5);
  legendG.append('g').call(legendAxis);
  const legendGradient = legendG.append('defs')
    .append('linearGradient')
    .attr('id', 'legendGrad')
    .attr('x1', '0%').attr('y1', '0%')
    .attr('x2', '0%').attr('y2', '100%');
  legendGradient.append('stop').attr('offset', '0%').attr('stop-color', colorScale(max));
  legendGradient.append('stop').attr('offset', '100%').attr('stop-color', colorScale(min));
  legendG.append('rect')
    .attr('x', -15)
    .attr('width', 15)
    .attr('height', innerHeight)
    .attr('fill', 'url(#legendGrad)');
}

function render1D(svg, data, width, height, margin) {
  const values = data.values;
  if (!Array.isArray(values)) return;

  const flat = [].concat(...values);
  const numeric = flat.filter((v) => typeof v === 'number' && !isNaN(v));
  if (numeric.length === 0) return;

  const min = d3.min(numeric);
  const max = d3.max(numeric);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const xScale = d3.scaleLinear().domain([0, flat.length - 1]).range([0, innerWidth]);
  const yScale = d3.scaleLinear().domain([min, max]).range([innerHeight, 0]);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  g.append('g').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(xScale));
  g.append('g').call(d3.axisLeft(yScale));

  const line = d3.line()
    .x((d, i) => xScale(i))
    .y((d) => yScale(d));

  g.append('path')
    .datum(flat)
    .attr('fill', 'none')
    .attr('stroke', 'steelblue')
    .attr('stroke-width', 1.5)
    .attr('d', line);
}

export default PlotCanvas;
