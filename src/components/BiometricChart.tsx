import React, { useState } from 'react';
import { triggerHaptic } from '../utils/audioFeedback';

interface BiometricDataPoint {
  fecha: string;
  valor: number;
}

interface BiometricChartProps {
  data: BiometricDataPoint[];
  yLabel: string;
  color: string;
  theme?: 'gaming' | 'nature' | 'kawaii';
}

export const BiometricChart: React.FC<BiometricChartProps> = ({
  data,
  yLabel,
  color,
  theme = 'nature'
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Sort data chronologically
  const sortedData = [...data].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  if (sortedData.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: '12px', background: 'rgba(0,0,0,0.01)', borderRadius: '8px', border: '1px dashed rgba(0,0,0,0.1)' }}>
        No hay datos registrados todavía. Añade al menos un registro para comenzar.
      </div>
    );
  }

  const width = 500;
  const height = 220;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const values = sortedData.map(d => d.valor);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  // Add a 15% safety margin to Y scale
  const valRange = maxVal - minVal;
  const minY = valRange === 0 ? Math.max(0, minVal - 5) : Math.max(0, minVal - valRange * 0.15);
  const maxY = valRange === 0 ? maxVal + 5 : maxVal + valRange * 0.15;
  const rangeY = maxY - minY;

  // Generate coordinates for points
  const points = sortedData.map((d, index) => {
    const x = sortedData.length === 1 
      ? paddingLeft + chartWidth / 2 
      : paddingLeft + (index * chartWidth) / (sortedData.length - 1);
      
    const y = paddingTop + chartHeight - ((d.valor - minY) * chartHeight) / rangeY;
    return { x, y, val: d.valor, date: new Date(d.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) };
  });

  // SVG Line path string
  let linePath = '';
  let areaPath = '';

  if (points.length > 1) {
    linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
  }

  // Y axis grid lines (4 lines)
  const gridLinesCount = 4;
  const gridLines = Array.from({ length: gridLinesCount }, (_, idx) => {
    const val = minY + (idx * rangeY) / (gridLinesCount - 1);
    const y = paddingTop + chartHeight - (idx * chartHeight) / (gridLinesCount - 1);
    return { y, val: val.toFixed(1) };
  });

  // Accent color glow and gradient IDs
  const gradId = `chart-area-grad-${color.replace('#', '')}`;

  return (
    <div style={{
      width: '100%',
      background: 'var(--game-card-inner-bg, rgba(0,0,0,0.01))',
      borderRadius: theme === 'gaming' ? '0px' : '12px',
      border: '1px solid rgba(0,0,0,0.05)',
      padding: '12px',
      boxSizing: 'border-box',
      position: 'relative' // Required for absolute tooltip alignment
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '11px', color: 'var(--game-text)' }}>
        <strong>Evolución ({yLabel})</strong>
        <span>{sortedData.length} registros</span>
      </div>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={color} stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridLines.map((line, i) => (
            <g key={i}>
              <line 
                x1={paddingLeft} 
                y1={line.y} 
                x2={width - paddingRight} 
                y2={line.y} 
                stroke="rgba(0,0,0,0.06)" 
                strokeDasharray="4 4" 
              />
              <text 
                x={paddingLeft - 8} 
                y={line.y + 4} 
                textAnchor="end" 
                fontSize="9px" 
                fill="#888"
                fontFamily="monospace"
              >
                {line.val}
              </text>
            </g>
          ))}

          {/* Area under the line */}
          {points.length > 1 && (
            <path d={areaPath} fill={`url(#${gradId})`} />
          )}

          {/* Sparkline */}
          {points.length > 1 ? (
            <path 
              d={linePath} 
              fill="none" 
              stroke={color} 
              strokeWidth="2.5" 
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : points.length === 1 ? (
            /* Draw a line across the chart for single point value */
            <line 
              x1={paddingLeft} 
              y1={points[0].y} 
              x2={width - paddingRight} 
              y2={points[0].y} 
              stroke={color} 
              strokeWidth="1.5" 
              strokeDasharray="2 2" 
            />
          ) : null}

          {/* Vertical dashed guide line on hover */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <line
              x1={points[hoveredIndex].x}
              y1={paddingTop}
              x2={points[hoveredIndex].x}
              y2={height - paddingBottom}
              stroke={color}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.6"
              pointerEvents="none"
            />
          )}

          {/* Data Points */}
          {points.map((p, i) => (
            <g key={i}>
              {/* Outer pulsing ring */}
              <circle 
                cx={p.x} 
                cy={p.y} 
                r={hoveredIndex === i ? "9" : "7"} 
                fill={color} 
                opacity={hoveredIndex === i ? "0.3" : "0.12"} 
                style={{ transition: 'all 0.15s ease-out', transformOrigin: `${p.x}px ${p.y}px` }}
              />
              {/* Core circle */}
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="4.5" 
                fill="#fff" 
                stroke={color} 
                strokeWidth="2.5" 
              />
              {/* Value tag (shown only if not hovered, to prevent overlap with tooltip) */}
              {hoveredIndex !== i && (
                <text 
                  x={p.x} 
                  y={p.y - 10} 
                  textAnchor="middle" 
                  fontSize="9px" 
                  fontWeight="bold" 
                  fill="var(--game-text-bright, #333)"
                >
                  {p.val}
                </text>
              )}
              {/* X Date tag */}
              <text 
                x={p.x} 
                y={height - paddingBottom + 16} 
                textAnchor="middle" 
                fontSize="9px" 
                fill={hoveredIndex === i ? color : "#999"}
                fontWeight={hoveredIndex === i ? "bold" : "normal"}
                style={{ transition: 'color 0.15s' }}
              >
                {p.date}
              </text>

              {/* Large invisible interactive hover target */}
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="18" 
                fill="transparent" 
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => {
                  setHoveredIndex(i);
                  triggerHaptic(10);
                }}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </g>
          ))}

          {/* Bottom X axis line */}
          <line 
            x1={paddingLeft} 
            y1={height - paddingBottom} 
            x2={width - paddingRight} 
            y2={height - paddingBottom} 
            stroke="rgba(0,0,0,0.15)" 
            strokeWidth="1" 
          />
        </svg>
      </div>

      {/* Absolutely positioned HTML Tooltip Box */}
      {hoveredIndex !== null && points[hoveredIndex] && (
        <div style={{
          position: 'absolute',
          left: `${(points[hoveredIndex].x / width) * 100}%`,
          top: `${(points[hoveredIndex].y / height) * 100 - 15}%`,
          transform: 'translate(-50%, -100%)',
          background: 'var(--game-card-bg, #ffffff)',
          border: `1.5px solid ${color}`,
          borderRadius: theme === 'gaming' ? '0px' : '8px',
          padding: '6px 10px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
          fontSize: '11px',
          color: 'var(--game-text-bright, #333)',
          fontFamily: 'var(--game-font, sans-serif)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          animation: 'tooltipFadeIn 0.15s ease-out'
        }}>
          <strong style={{ fontSize: '12px', color }}>{points[hoveredIndex].val} {yLabel}</strong>
          <span style={{ fontSize: '9px', opacity: 0.75 }}>
            Registrado: {new Date(sortedData[hoveredIndex].fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
      )}

      {/* Animation definition for tooltip fading */}
      <style>{`
        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translate(-50%, -95%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -100%) scale(1); }
        }
      `}</style>
    </div>
  );
};
