import React from 'react';
import Svg, { Line, Circle, Text as SvgText, Defs, RadialGradient, Stop, G } from 'react-native-svg';
import { DestinyMatrix, PositionKey } from '../services/destinyMatrix';

const S = 360; // viewBox
const C = S / 2;
const ROUT = 132; // outer octagram points
const RIN = 68;   // inner points
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

/** Rich, interactive Destiny Matrix octagram with inner nodes, edges and ages. */
export default function DestinyMatrixChart({ matrix, height = 360, onNodePress, selectedValue }: Props) {
  const m = matrix;

  // Outer octagram points (with the age each corner represents).
  const outer = {
    left:        { ...at(180, ROUT), v: m.day,        pos: 'character' as PositionKey,  age: 0,  ageDeg: 180 },
    topLeft:     { ...at(135, ROUT), v: m.topLeft,    pos: 'energyLine' as PositionKey, age: 10, ageDeg: 135 },
    top:         { ...at(90, ROUT),  v: m.month,      pos: 'innerTalents' as PositionKey, age: 20, ageDeg: 90 },
    topRight:    { ...at(45, ROUT),  v: m.topRight,   pos: 'energyLine' as PositionKey, age: 30, ageDeg: 45 },
    right:       { ...at(0, ROUT),   v: m.year,       pos: 'outerTalents' as PositionKey, age: 40, ageDeg: 0 },
    bottomRight: { ...at(315, ROUT), v: m.bottomRight,pos: 'energyLine' as PositionKey, age: 50, ageDeg: 315 },
    bottom:      { ...at(270, ROUT), v: m.purpose,    pos: 'purpose' as PositionKey,    age: 60, ageDeg: 270 },
    bottomLeft:  { ...at(225, ROUT), v: m.bottomLeft, pos: 'energyLine' as PositionKey, age: 70, ageDeg: 225 },
  };

  // Inner points on the axes (balance) and diagonals (ancestral).
  const inner = {
    left:   { ...at(180, RIN), v: m.innerLeft,      pos: 'balance' as PositionKey },
    top:    { ...at(90, RIN),  v: m.innerTop,       pos: 'balance' as PositionKey },
    right:  { ...at(0, RIN),   v: m.innerRight,     pos: 'balance' as PositionKey },
    bottom: { ...at(270, RIN), v: m.innerBottom,    pos: 'balance' as PositionKey },
    tl:     { ...at(135, RIN), v: m.genTopLeft,     pos: 'ancestral' as PositionKey },
    tr:     { ...at(45, RIN),  v: m.genTopRight,    pos: 'ancestral' as PositionKey },
    br:     { ...at(315, RIN), v: m.genBottomRight, pos: 'ancestral' as PositionKey },
    bl:     { ...at(225, RIN), v: m.genBottomLeft,  pos: 'ancestral' as PositionKey },
  };

  // Heart & money nodes near the center.
  const heart = { ...at(238, 40), v: m.relationships, pos: 'relationships' as PositionKey };
  const money = { ...at(-15, 46), v: m.money, pos: 'money' as PositionKey };

  const edge = (a: { x: number; y: number }, b: { x: number; y: number }, stroke = VIOLET, w = 1, o = 0.4) => (
    <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={w} opacity={o} />
  );

  const node = (
    p: { x: number; y: number; v: number; pos: PositionKey },
    ring: string,
    size: 'sm' | 'md' | 'lg' = 'md',
    emoji?: string,
  ) => {
    const r = size === 'lg' ? 22 : size === 'sm' ? 13 : 17;
    const fs = size === 'lg' ? 20 : size === 'sm' ? 12 : 15;
    const selected = selectedValue === p.v;
    return (
      <G key={`${p.x.toFixed(1)}-${p.y.toFixed(1)}`} onPress={() => onNodePress?.({ value: p.v, position: p.pos, active: true })}>
        <Circle cx={p.x} cy={p.y} r={r + 6} fill="url(#g)" opacity={0.8} />
        <Circle cx={p.x} cy={p.y} r={r} fill="#1a1a3e" stroke={selected ? GOLD : ring} strokeWidth={selected ? 3 : 1.6} />
        <SvgText x={p.x} y={p.y + fs * 0.34} fontSize={fs} fontWeight="bold" fill="#f1f5f9" textAnchor="middle">{p.v}</SvgText>
        {emoji ? <SvgText x={p.x} y={p.y - r - 3} fontSize={12} textAnchor="middle">{emoji}</SvgText> : null}
        <Circle cx={p.x} cy={p.y} r={r + 8} fill="transparent" />
      </G>
    );
  };

  const O = outer;
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${S} ${S}`}>
      <Defs>
        <RadialGradient id="g" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={VIOLET} stopOpacity="0.45" />
          <Stop offset="100%" stopColor={VIOLET} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Cardinal diamond */}
      {edge(O.left, O.top)}{edge(O.top, O.right)}{edge(O.right, O.bottom)}{edge(O.bottom, O.left)}
      {/* Diagonal square */}
      {edge(O.topLeft, O.topRight, BLUE, 1, 0.35)}{edge(O.topRight, O.bottomRight, BLUE, 1, 0.35)}
      {edge(O.bottomRight, O.bottomLeft, BLUE, 1, 0.35)}{edge(O.bottomLeft, O.topLeft, BLUE, 1, 0.35)}
      {/* Axes through center */}
      {edge(O.left, O.right, VIOLET, 0.75, 0.22)}{edge(O.top, O.bottom, VIOLET, 0.75, 0.22)}
      {/* Generation lines: male (violet) TL-BR, female (rose) TR-BL */}
      {edge(O.topLeft, O.bottomRight, VIOLET, 1.5, 0.6)}
      {edge(O.topRight, O.bottomLeft, ROSE, 1.5, 0.6)}

      {/* Age labels on the perimeter */}
      {Object.values(O).map((p) => {
        const a = at(p.ageDeg, AGE_R);
        return (
          <SvgText key={`age-${p.age}`} x={a.x} y={a.y + 3} fontSize={9} fill="#64748b" textAnchor="middle">{p.age}</SvgText>
        );
      })}

      {/* Inner nodes */}
      {node(inner.left, BLUE, 'sm')}{node(inner.top, BLUE, 'sm')}{node(inner.right, BLUE, 'sm')}{node(inner.bottom, BLUE, 'sm')}
      {node(inner.tl, GREEN, 'sm')}{node(inner.tr, GREEN, 'sm')}{node(inner.br, GREEN, 'sm')}{node(inner.bl, GREEN, 'sm')}
      {/* Heart & money */}
      {node(heart, ROSE, 'sm', '❤️')}
      {node(money, GOLD, 'sm', '💰')}

      {/* Outer nodes */}
      {Object.values(O).map((p) => node(p, VIOLET, 'md'))}

      {/* Center */}
      {node({ x: C, y: C, v: m.center, pos: 'center' }, GOLD, 'lg')}
    </Svg>
  );
}
