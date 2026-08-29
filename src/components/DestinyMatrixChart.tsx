import React from 'react';
import Svg, { Line, Circle, Text as SvgText, Defs, RadialGradient, Stop, G } from 'react-native-svg';
import { DestinyMatrix, PositionKey } from '../services/destinyMatrix';

const S = 380; // viewBox
const C = S / 2;
const ROUT = 142; // outer octagram points
const RIN = 76;   // inner points
const AGE_R = ROUT + 20;

export interface MatrixNodeSelection {
  value: number;
  position: PositionKey;
  active: boolean;
}

interface Props {
  matrix: DestinyMatrix;
  height?: number;
  onNodePress?: (sel: MatrixNodeSelection) => void;
  selectedValue?: number | null;
}

// Direction (degrees, math convention CCW from +x) -> point at radius R.
const at = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: C + r * Math.cos(rad), y: C - r * Math.sin(rad) };
};

const VIOLET = '#a78bfa';
const ROSE = '#fda4af';
const BLUE = '#7dd3fc';
const GREEN = '#6BCB77';
const GOLD = '#fcd34d';

/** Clean, organized, interactive Destiny Matrix octagram with age timeline. */
export default function DestinyMatrixChart({ matrix, height = 380, onNodePress, selectedValue }: Props) {
  const m = matrix;

  // 8 outer octagram points with the age each corner represents.
  const outer = [
    { deg: 180, v: m.day,         pos: 'character' as PositionKey,    age: 0 },
    { deg: 135, v: m.topLeft,     pos: 'energyLine' as PositionKey,   age: 10 },
    { deg: 90,  v: m.month,       pos: 'innerTalents' as PositionKey, age: 20 },
    { deg: 45,  v: m.topRight,    pos: 'energyLine' as PositionKey,   age: 30 },
    { deg: 0,   v: m.year,        pos: 'outerTalents' as PositionKey, age: 40 },
    { deg: 315, v: m.bottomRight, pos: 'energyLine' as PositionKey,   age: 50 },
    { deg: 270, v: m.purpose,     pos: 'purpose' as PositionKey,      age: 60 },
    { deg: 225, v: m.bottomLeft,  pos: 'energyLine' as PositionKey,   age: 70 },
  ].map((o) => ({ ...o, ...at(o.deg, ROUT) }));

  const byDeg = (d: number) => outer.find((o) => o.deg === d)!;

  // 8 inner points: cross (axes) + generation (diagonals).
  // innerRight == money (E+C), innerBottom == relationships (E+D).
  const inner = [
    { ...at(180, RIN), v: m.innerLeft,      pos: 'balance' as PositionKey,       ring: BLUE },
    { ...at(90, RIN),  v: m.innerTop,       pos: 'balance' as PositionKey,       ring: BLUE },
    { ...at(0, RIN),   v: m.innerRight,     pos: 'money' as PositionKey,         ring: GOLD, emoji: '💰' },
    { ...at(270, RIN), v: m.innerBottom,    pos: 'relationships' as PositionKey, ring: ROSE, emoji: '❤️' },
    { ...at(135, RIN), v: m.genTopLeft,     pos: 'ancestral' as PositionKey,     ring: GREEN },
    { ...at(45, RIN),  v: m.genTopRight,    pos: 'ancestral' as PositionKey,     ring: GREEN },
    { ...at(315, RIN), v: m.genBottomRight, pos: 'ancestral' as PositionKey,     ring: GREEN },
    { ...at(225, RIN), v: m.genBottomLeft,  pos: 'ancestral' as PositionKey,     ring: GREEN },
  ];

  const edge = (a: { x: number; y: number }, b: { x: number; y: number }, stroke = VIOLET, w = 1, o = 0.35) => (
    <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={w} opacity={o} />
  );

  const node = (
    p: { x: number; y: number; v: number; pos: PositionKey; emoji?: string },
    ring: string,
    size: 'sm' | 'md' | 'lg',
  ) => {
    const r = size === 'lg' ? 23 : size === 'sm' ? 14 : 18;
    const fs = size === 'lg' ? 20 : size === 'sm' ? 12 : 15;
    const selected = selectedValue === p.v;
    return (
      <G key={`${p.x.toFixed(1)}-${p.y.toFixed(1)}-${p.v}`} onPress={() => onNodePress?.({ value: p.v, position: p.pos, active: true })}>
        <Circle cx={p.x} cy={p.y} r={r + 5} fill="url(#g)" opacity={0.8} />
        <Circle cx={p.x} cy={p.y} r={r} fill="#1a1a3e" stroke={selected ? GOLD : ring} strokeWidth={selected ? 3 : 1.6} />
        <SvgText x={p.x} y={p.y + fs * 0.34} fontSize={fs} fontWeight="bold" fill="#f1f5f9" textAnchor="middle">{p.v}</SvgText>
        {p.emoji ? <SvgText x={p.x + r - 2} y={p.y - r + 4} fontSize={12} textAnchor="middle">{p.emoji}</SvgText> : null}
        <Circle cx={p.x} cy={p.y} r={r + 7} fill="transparent" />
      </G>
    );
  };

  const L = byDeg(180), T = byDeg(90), R = byDeg(0), B = byDeg(270);
  const TL = byDeg(135), TR = byDeg(45), BR = byDeg(315), BL = byDeg(225);

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${S} ${S}`}>
      <Defs>
        <RadialGradient id="g" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={VIOLET} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={VIOLET} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Cardinal diamond + diagonal square = the 8-point star outline */}
      {edge(L, T)}{edge(T, R)}{edge(R, B)}{edge(B, L)}
      {edge(TL, TR)}{edge(TR, BR)}{edge(BR, BL)}{edge(BL, TL)}
      {/* Axes */}
      {edge(L, R, VIOLET, 0.75, 0.18)}{edge(T, B, VIOLET, 0.75, 0.18)}
      {/* Generation lines through center: male (violet), female (rose) */}
      {edge(TL, BR, VIOLET, 1.5, 0.55)}
      {edge(TR, BL, ROSE, 1.5, 0.55)}

      {/* Age timeline: corner ages (0..70) + mid-edge sub-marks (5..75) */}
      {outer.map((o) => {
        const a = at(o.deg, AGE_R);
        return <SvgText key={`age-${o.age}`} x={a.x} y={a.y + 3} fontSize={11} fontWeight="bold" fill="#94a3b8" textAnchor="middle">{o.age}</SvgText>;
      })}
      {[157.5, 112.5, 67.5, 22.5, 337.5, 292.5, 247.5, 202.5].map((deg, i) => {
        const a = at(deg, AGE_R);
        const age = 5 + i * 10;
        return <SvgText key={`sub-${age}`} x={a.x} y={a.y + 2} fontSize={8} fill="#475569" textAnchor="middle">{age}</SvgText>;
      })}

      {/* Inner nodes */}
      {inner.map((p) => node(p, p.ring, 'sm'))}
      {/* Outer nodes */}
      {outer.map((p) => node(p, VIOLET, 'md'))}
      {/* Center */}
      {node({ x: C, y: C, v: m.center, pos: 'center' }, GOLD, 'lg')}
    </Svg>
  );
}
