import React from 'react';
import Svg, { Line, Circle, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';
import { DestinyMatrix } from '../services/destinyMatrix';

const S = 300; // viewBox size
const C = S / 2;
const R = 118;  // outer radius (straight square points)
const RD = R;   // diagonal points radius

interface Props {
  matrix: DestinyMatrix;
  color?: string;
  height?: number;
}

/** Renders the Destiny Matrix as a glowing octagram with arcana numbers. */
export default function DestinyMatrixChart({ matrix, color = '#a78bfa', height = 300 }: Props) {
  // Straight square: left, top, right, bottom.
  const P = {
    left: { x: C - R, y: C, v: matrix.day },
    top: { x: C, y: C - R, v: matrix.month },
    right: { x: C + R, y: C, v: matrix.year },
    bottom: { x: C, y: C + R, v: matrix.purpose },
  };
  // Diagonal square corners (offset 45°).
  const d = RD * Math.SQRT1_2;
  const D = {
    tl: { x: C - d, y: C - d, v: matrix.topLeft },
    tr: { x: C + d, y: C - d, v: matrix.topRight },
    br: { x: C + d, y: C + d, v: matrix.bottomRight },
    bl: { x: C - d, y: C + d, v: matrix.bottomLeft },
  };

  const node = (x: number, y: number, v: number, big = false) => (
    <React.Fragment key={`${x}-${y}`}>
      <Circle cx={x} cy={y} r={big ? 26 : 20} fill="url(#nodeGlow)" opacity={0.9} />
      <Circle cx={x} cy={y} r={big ? 20 : 16} fill="#1a1a3e" stroke={color} strokeWidth={big ? 2.5 : 1.5} />
      <SvgText x={x} y={y + (big ? 6 : 5)} fontSize={big ? 20 : 16} fontWeight="bold" fill="#f1f5f9" textAnchor="middle">
        {v}
      </SvgText>
    </React.Fragment>
  );

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${S} ${S}`}>
      <Defs>
        <RadialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Straight square */}
      <Line x1={P.left.x} y1={P.left.y} x2={P.top.x} y2={P.top.y} stroke={color} strokeWidth={1} opacity={0.45} />
      <Line x1={P.top.x} y1={P.top.y} x2={P.right.x} y2={P.right.y} stroke={color} strokeWidth={1} opacity={0.45} />
      <Line x1={P.right.x} y1={P.right.y} x2={P.bottom.x} y2={P.bottom.y} stroke={color} strokeWidth={1} opacity={0.45} />
      <Line x1={P.bottom.x} y1={P.bottom.y} x2={P.left.x} y2={P.left.y} stroke={color} strokeWidth={1} opacity={0.45} />

      {/* Diagonal square */}
      <Line x1={D.tl.x} y1={D.tl.y} x2={D.tr.x} y2={D.tr.y} stroke="#7dd3fc" strokeWidth={1} opacity={0.35} />
      <Line x1={D.tr.x} y1={D.tr.y} x2={D.br.x} y2={D.br.y} stroke="#7dd3fc" strokeWidth={1} opacity={0.35} />
      <Line x1={D.br.x} y1={D.br.y} x2={D.bl.x} y2={D.bl.y} stroke="#7dd3fc" strokeWidth={1} opacity={0.35} />
      <Line x1={D.bl.x} y1={D.bl.y} x2={D.tl.x} y2={D.tl.y} stroke="#7dd3fc" strokeWidth={1} opacity={0.35} />

      {/* Axes through center */}
      <Line x1={P.left.x} y1={P.left.y} x2={P.right.x} y2={P.right.y} stroke={color} strokeWidth={0.75} opacity={0.25} />
      <Line x1={P.top.x} y1={P.top.y} x2={P.bottom.x} y2={P.bottom.y} stroke={color} strokeWidth={0.75} opacity={0.25} />

      {/* Nodes */}
      {node(D.tl.x, D.tl.y, D.tl.v)}
      {node(D.tr.x, D.tr.y, D.tr.v)}
      {node(D.br.x, D.br.y, D.br.v)}
      {node(D.bl.x, D.bl.y, D.bl.v)}
      {node(P.left.x, P.left.y, P.left.v)}
      {node(P.top.x, P.top.y, P.top.v)}
      {node(P.right.x, P.right.y, P.right.v)}
      {node(P.bottom.x, P.bottom.y, P.bottom.v)}
      {node(C, C, matrix.center, true)}
    </Svg>
  );
}
