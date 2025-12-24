import React from 'react';
import Svg, { Polygon, Circle, Line, Text as SvgText, Ellipse } from 'react-native-svg';
import { theme } from '../styles/theme';

const DIMENSIONS = ['Dulce', 'Salado', 'Ácido', 'Amargo', 'Umami', 'Picante', 'Crujiente'];
const MIN_RATIO = 0.1; // evita colapsar visualmente valores muy bajos

export const RadarChart = ({ values, size = 380, levels = 4 }) => {
  const N = DIMENSIONS.length;
  const labelOffset = 52;
  const margin = 70; // margen extra para evitar clipping (especialmente en etiquetas largas)
  const svgSize = size + margin * 2;
  const R = size / 2 - 32;
  const center = { x: svgSize / 2, y: svgSize / 2 };

  const points = values.map((val, i) => {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
    const r = (MIN_RATIO + Math.max(0, val) * (1 - MIN_RATIO)) * R;
    return [center.x + r * Math.cos(angle), center.y + r * Math.sin(angle)];
  });

  const getAnchor = (angle) => {
    const cos = Math.cos(angle);
    if (cos > 0.3) return 'start';
    if (cos < -0.3) return 'end';
    return 'middle';
  };

  return (
    <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
      <Circle cx={center.x} cy={center.y} r={R + 16} fill={theme.colors.surface || '#f6f8f7'} />
      {[...Array(levels)].map((_, idx) => (
        <Circle
          key={idx}
          cx={center.x}
          cy={center.y}
          r={(idx + 1) * (R / levels)}
          fill="none"
          stroke={`rgba(0,0,0,${0.08 + idx * 0.02})`}
          strokeWidth={idx === 0 ? 1.2 : 1}
        />
      ))}
      {DIMENSIONS.map((label, i) => {
        const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
        const x = center.x + R * Math.cos(angle);
        const y = center.y + R * Math.sin(angle);
        const lx = center.x + (R + labelOffset) * Math.cos(angle);
        const ly = center.y + (R + labelOffset) * Math.sin(angle);
        const anchor = getAnchor(angle);
        return (
          <React.Fragment key={i}>
            <Line x1={center.x} y1={center.y} x2={x} y2={y} stroke="#cbd5ce" strokeWidth={1.1} />
            <SvgText
              x={lx}
              y={ly}
              fontSize="15"
              fontWeight="700"
              fill="#1f2d3d"
              textAnchor={anchor}
              alignmentBaseline="middle"
            >
              {label}
            </SvgText>
          </React.Fragment>
        );
      })}
      <Polygon
        points={points.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="rgba(34,139,79,0.55)"
        stroke="#1a7a42"
        strokeWidth={4}
      />
      {points.map(([x, y], idx) => (
        <Ellipse key={idx} cx={x} cy={y} rx={5} ry={5} fill="#1f8a49" />
      ))}
    </Svg>
  );
};
