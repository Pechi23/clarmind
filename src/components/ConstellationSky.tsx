import React, { useMemo } from 'react';
import Svg, { Circle, Line, Defs, RadialGradient, Stop } from 'react-native-svg';
import { MeditationSession } from '../types';
import { ZodiacSign } from '../constants/zodiac';
import { CONSTELLATIONS } from '../constants/constellations';
import { getRuns, countConstellations } from '../services/skyLogic';

export { getRuns, countConstellations };

const W = 360;
const H = 460;
const MARGIN = 28;

interface Props {
  sessions: MeditationSession[];
  zodiac: ZodiacSign;
  width?: number;
  height?: number;
}

// Deterministic PRNG so the sky is stable across renders/days
const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export default function ConstellationSky({ sessions, zodiac, width = W, height = H }: Props) {
  const { ambient, stars, constellations } = useMemo(() => {
    // Faint ambient dust — always present so the sky has depth
    const ambient = Array.from({ length: 46 }, (_, i) => ({
      x: MARGIN / 2 + rand(i * 3 + 1) * (W - MARGIN),
      y: MARGIN / 2 + rand(i * 7 + 2) * (H - MARGIN),
      r: 0.6 + rand(i * 11 + 3) * 0.9,
    }));

    const runs = getRuns(sessions);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastRun = runs[runs.length - 1];
    const activeDates = new Set(
      lastRun && (lastRun.includes(today) || lastRun.includes(yesterday)) ? lastRun : []
    );

    // One star per session
    const stars = sessions.map((s, i) => ({
      x: MARGIN + rand(i * 13 + 5) * (W - MARGIN * 2),
      y: MARGIN + rand(i * 17 + 9) * (H - MARGIN * 2),
      r: 1.6 + rand(i * 23 + 4) * 1.6,
      bright: activeDates.has(s.date),
    }));

    // Each completed 7-day block forms the user's zodiac constellation
    const total = countConstellations(sessions);
    const shape = CONSTELLATIONS[zodiac];
    const constellations = Array.from({ length: total }, (_, c) => {
      const size = 96;
      const cx = MARGIN + size / 2 + rand(c * 31 + 6) * (W - size - MARGIN * 2);
      const cy = MARGIN + size / 2 + rand(c * 37 + 8) * (H - size - MARGIN * 2);
      const pts = shape.points.map(([px, py]) => ({
        x: cx - size / 2 + px * size,
        y: cy - size / 2 + py * size,
      }));
      return { pts, edges: shape.edges };
    });

    return { ambient, stars, constellations };
  }, [sessions, zodiac]);

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <RadialGradient id="starGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#f1f5f9" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#f1f5f9" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="constGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#a78bfa" stopOpacity="0.95" />
          <Stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {ambient.map((a, i) => (
        <Circle key={`a${i}`} cx={a.x} cy={a.y} r={a.r} fill="#94a3b8" opacity={0.16} />
      ))}

      {stars.map((s, i) => (
        <React.Fragment key={`s${i}`}>
          <Circle cx={s.x} cy={s.y} r={s.r * 3.2} fill="url(#starGlow)" opacity={s.bright ? 0.55 : 0.18} />
          <Circle cx={s.x} cy={s.y} r={s.r} fill="#f1f5f9" opacity={s.bright ? 1 : 0.45} />
        </React.Fragment>
      ))}

      {constellations.map((c, ci) => (
        <React.Fragment key={`c${ci}`}>
          {c.edges.map(([a, b], ei) => (
            <Line
              key={`l${ci}-${ei}`}
              x1={c.pts[a].x} y1={c.pts[a].y}
              x2={c.pts[b].x} y2={c.pts[b].y}
              stroke="#a78bfa" strokeWidth={1} opacity={0.55}
            />
          ))}
          {c.pts.map((p, pi) => (
            <React.Fragment key={`p${ci}-${pi}`}>
              <Circle cx={p.x} cy={p.y} r={9} fill="url(#constGlow)" opacity={0.6} />
              <Circle cx={p.x} cy={p.y} r={2.6} fill="#c4b5fd" />
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </Svg>
  );
}
