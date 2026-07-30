"use client";

import { RISK_LEVEL_COLOR, RISK_LEVEL_LABEL } from "@/lib/display";

const LEVELS = ["low", "moderate", "high", "very_high"] as const;
type Level = (typeof LEVELS)[number];

const WIDTH = 200;
const HEIGHT = 120;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT - 8;
const RADIUS = 88;
const NEEDLE_LENGTH = 74;

function polarToCartesian(angleDeg: number, radius: number) {
  const angleRad = (Math.PI / 180) * angleDeg;
  return {
    x: CENTER_X + radius * Math.cos(angleRad),
    y: CENTER_Y - radius * Math.sin(angleRad),
  };
}

function arcPath(startAngle: number, endAngle: number, radius: number) {
  const start = polarToCartesian(startAngle, radius);
  const end = polarToCartesian(endAngle, radius);
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${radius} ${radius} 0 0 0 ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

// Semicircle, 180deg at left (low) down to 0deg at right (very_high), split
// into 4 equal 45deg segments.
const SEGMENTS: { level: Level; start: number; end: number }[] = [
  { level: "low", start: 180, end: 135 },
  { level: "moderate", start: 135, end: 90 },
  { level: "high", start: 90, end: 45 },
  { level: "very_high", start: 45, end: 0 },
];

// Needle is drawn pointing straight up (math-angle 90deg) and animated via
// an actual CSS `rotate()` on the same <g>, not recomputed coordinates --
// only a real transform change on a stable element gives the browser
// something to interpolate/transition between.
function rotationForLevel(level: Level): number {
  const index = LEVELS.indexOf(level);
  const targetAngle = 180 - (index + 0.5) * 45; // center of this level's segment
  return 90 - targetAngle; // CSS rotate() is clockwise-positive; our angles are counterclockwise-positive
}

export function RiskDial({ level }: { level: Level }) {
  const color = RISK_LEVEL_COLOR[level];
  const rotation = rotationForLevel(level);
  const needleTipUp = { x: CENTER_X, y: CENTER_Y - NEEDLE_LENGTH };

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} role="img" aria-label={`Risk level: ${RISK_LEVEL_LABEL[level]}`}>
        {SEGMENTS.map((seg) => (
          <path
            key={seg.level}
            d={arcPath(seg.start, seg.end, RADIUS)}
            fill="none"
            stroke={RISK_LEVEL_COLOR[seg.level]}
            strokeWidth={14}
            strokeLinecap="butt"
            opacity={seg.level === level ? 1 : 0.35}
            style={{ transition: "opacity 0.4s ease" }}
          />
        ))}

        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: `${CENTER_X}px ${CENTER_Y}px`,
            transition: "transform 0.6s cubic-bezier(0.34, 1.4, 0.64, 1)",
          }}
        >
          <line
            x1={CENTER_X}
            y1={CENTER_Y}
            x2={needleTipUp.x}
            y2={needleTipUp.y}
            stroke="var(--text-primary)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </g>
        <circle cx={CENTER_X} cy={CENTER_Y} r={6} fill="var(--text-primary)" />
      </svg>
      <p className="font-semibold -mt-2" style={{ fontSize: 20, color, transition: "color 0.4s ease" }}>
        {RISK_LEVEL_LABEL[level]}
      </p>
    </div>
  );
}
