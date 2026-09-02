import React from 'react';
import Svg, { Circle, Line, G, Text as SvgText } from 'react-native-svg';
import { NatalChart } from '../services/birthChart';

const S = 340;
const C = S / 2;
const R_OUT = 158;   // outer edge
const R_SIGN = 140;  // sign glyph ring
const R_IN = 118;    // inner ring (planet ring outer)
const R_PLANET = 100;
const R_ASPECT = 82; // aspect hub

const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

const HARMONIOUS: Record<string, string> = { trine: '#6BCB77', sextile: '#7dd3fc' };
const TENSE: Record<string, string> = { square: '#fda4af', opposition: '#f87171' };

interface Props { chart: NatalChart; height?: number; }

export default function NatalWheel({ chart, height = 340 }: Props) {
  const asc = chart.ascendant ?? 0; // orient Ascendant to the left (9 o'clock)

  // Ecliptic longitude -> screen point (y-down). Ascendant at 180° (left).
  const at = (lon: number, r: number) => {
    const a = (180 + (lon - asc)) * (Math.PI / 180);
    return { x: C + r * Math.cos(a), y: C - r * Math.sin(a) };
  };

  // Spread planets that sit within ~7° of each other so glyphs don't overlap.
  const sorted = [...chart.placements].sort((a, b) => a.lon - b.lon);
  const drawLon: Record<string, number> = {};
  let prev = -999;
  for (const p of sorted) {
    let l = p.lon;
    if (l - prev < 8) l = prev + 8;
    drawLon[p.name] = l;
    prev = l;
  }

  const posOf = (name: string, r: number) => at(drawLon[name] ?? 0, r);
  const aspectPos = (name: string) => {
    const p = chart.placements.find((x) => x.name === name)!;
    return at(p.lon, R_ASPECT);
  };

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${S} ${S}`}>
      {/* rings */}
      <Circle cx={C} cy={C} r={R_OUT} fill="none" stroke="rgba(167,139,250,0.35)" strokeWidth={1.2} />
      <Circle cx={C} cy={C} r={R_IN} fill="none" stroke="rgba(167,139,250,0.2)" strokeWidth={1} />
      <Circle cx={C} cy={C} r={R_ASPECT} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

      {/* 12 sign sectors */}
      {Array.from({ length: 12 }).map((_, i) => {
        const boundary = at(i * 30, R_OUT);
        const inner = at(i * 30, R_ASPECT);
        const glyph = at(i * 30 + 15, R_SIGN);
        return (
          <G key={`sec-${i}`}>
            <Line x1={inner.x} y1={inner.y} x2={boundary.x} y2={boundary.y} stroke="rgba(167,139,250,0.18)" strokeWidth={0.8} />
            <SvgText x={glyph.x} y={glyph.y + 6} fontSize={16} fill="#c4b5fd" textAnchor="middle">{SIGN_GLYPHS[i]}</SvgText>
          </G>
        );
      })}

      {/* aspect lines */}
      {chart.aspects.map((asp, i) => {
        const color = HARMONIOUS[asp.type] ?? TENSE[asp.type] ?? 'rgba(255,255,255,0.12)';
        if (asp.type === 'conjunction') return null;
        const a = aspectPos(asp.a);
        const b = aspectPos(asp.b);
        return <Line key={`asp-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={1} opacity={0.5} />;
      })}

      {/* Ascendant + MC markers */}
      {chart.hasHouses && (
        <>
          {(() => { const p = at(asc, R_OUT + 2); const q = at(asc, R_ASPECT); return (
            <G>
              <Line x1={q.x} y1={q.y} x2={p.x} y2={p.y} stroke="#fcd34d" strokeWidth={1.6} />
              <SvgText x={at(asc, R_OUT + 12).x} y={at(asc, R_OUT + 12).y + 4} fontSize={11} fill="#fcd34d" textAnchor="middle" fontWeight="bold">ASC</SvgText>
            </G>
          ); })()}
          {chart.mc !== null && (() => { const p = at(chart.mc, R_OUT + 2); const q = at(chart.mc, R_ASPECT); return (
            <G>
              <Line x1={q.x} y1={q.y} x2={p.x} y2={p.y} stroke="#7dd3fc" strokeWidth={1.4} />
              <SvgText x={at(chart.mc, R_OUT + 12).x} y={at(chart.mc, R_OUT + 12).y + 4} fontSize={11} fill="#7dd3fc" textAnchor="middle" fontWeight="bold">MC</SvgText>
            </G>
          ); })()}
        </>
      )}

      {/* planets */}
      {chart.placements.map((p) => {
        const pt = posOf(p.name, R_PLANET);
        const tick = posOf(p.name, R_IN - 2);
        const tick2 = posOf(p.name, R_IN - 10);
        return (
          <G key={p.name}>
            <Line x1={tick.x} y1={tick.y} x2={tick2.x} y2={tick2.y} stroke="rgba(255,255,255,0.25)" strokeWidth={0.8} />
            <SvgText x={pt.x} y={pt.y + 6} fontSize={17} fill="#f1f5f9" textAnchor="middle">{p.symbol}</SvgText>
          </G>
        );
      })}

      <Circle cx={C} cy={C} r={2.5} fill="rgba(167,139,250,0.5)" />
    </Svg>
  );
}
