"use client";

import React from "react";

interface ChartProps {
  data: { hour: string; amount: number }[];
}

export default function DashboardChart({ data }: ChartProps) {
  if (!data || data.length === 0) return null;

  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const width = 1000;
  const height = 200;
  const padding = 40;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - (d.amount / maxAmount) * (height - padding * 2) - padding;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(" L ")}`;
  const areaData = `${pathData} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

  return (
    <div className="w-full h-full relative" style={{ minHeight: "200px" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>

        {/* Linhas de grade horizontal */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1={padding}
            y1={height - padding - p * (height - padding * 2)}
            x2={width - padding}
            y2={height - padding - p * (height - padding * 2)}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Área preenchida */}
        <path d={areaData} fill="url(#gradient)" />

        {/* Linha do gráfico */}
        <path
          d={pathData}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pontos */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
          const y = height - (d.amount / maxAmount) * (height - padding * 2) - padding;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill="white"
              stroke="var(--accent)"
              strokeWidth="2"
            />
          );
        })}

        {/* Labels X */}
        {data.map((d, i) => {
          if (i % 2 !== 0) return null;
          const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
          return (
            <text
              key={i}
              x={x}
              y={height - 5}
              textAnchor="middle"
              fill="var(--text-muted)"
              fontSize="12"
            >
              {d.hour}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
