"use client";

import { degreesToCardinal } from "@/lib/wind";

type Props = {
  degrees: number;
  speed: number;
};

export default function WindCompass({ degrees, speed }: Props) {
  const cardinal = degreesToCardinal(degrees);

  return (
    <div className="rounded-2xl bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-5 shadow-sm flex flex-col items-center">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
        Direccion del Viento
      </h3>
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Circulo exterior */}
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity={0.2}
          />
          {/* Marcas cardinales */}
          {["N", "E", "S", "O"].map((dir, i) => {
            const angle = i * 90 - 90;
            const rad = (angle * Math.PI) / 180;
            const x = 50 + 38 * Math.cos(rad);
            const y = 50 + 38 * Math.sin(rad);
            return (
              <text
                key={dir}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="8"
                fontWeight="bold"
                fill="currentColor"
                opacity={0.5}
              >
                {dir}
              </text>
            );
          })}
          {/* Flecha */}
          <g transform={`rotate(${degrees}, 50, 50)`}>
            <line
              x1="50" y1="50" x2="50" y2="18"
              stroke="#f97316"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <polygon
              points="50,12 46,22 54,22"
              fill="#f97316"
            />
            <circle cx="50" cy="50" r="3" fill="#f97316" />
          </g>
        </svg>
      </div>
      <div className="mt-2 text-center">
        <span className="text-2xl font-bold">{cardinal}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">({degrees}°)</span>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {speed} km/h
      </div>
    </div>
  );
}
