import React from 'react';

interface BiometricDataPoint {
  fecha: string;
  valor: number;
}

interface BiometricChartProps {
  data: BiometricDataPoint[];
  yLabel: string;
  color: string;
  theme?: 'gaming' | 'nature' | 'kawaii' | 'midnight' | 'vintage' | 'matcha';
}

export const BiometricChart: React.FC<BiometricChartProps> = ({
  data,
  yLabel,
  color,
  theme = 'nature'
}) => {
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

  // Add a 10% safety margin to Y scale
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
      boxSizing: 'border-box'
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

          {/* Data Points */}
          {points.map((p, i) => (
            <g key={i}>
              {/* Pulsing ring for hover effect */}
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="7" 
                fill={color} 
                opacity="0.15" 
                style={{ transition: 'all 0.2s', transformOrigin: `${p.x}px ${p.y}px` }}
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
              {/* Value tag */}
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
              {/* X Date tag */}
              <text 
                x={p.x} 
                y={height - paddingBottom + 16} 
                textAnchor="middle" 
                fontSize="9px" 
                fill="#999"
              >
                {p.date}
              </text>
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
    </div>
  );
};
