import React from 'react';
import { getDpfClogging, getDpfCurves, getDpfBounds } from '../utils/dpfReference';

const DpfChart = ({ rpm, diffPressure }) => {
  const { percentage, color, label } = getDpfClogging(rpm, diffPressure);
  const curves = getDpfCurves();
  const { rpmMin, rpmMax, presMax } = getDpfBounds();

  const pad = { left: 48, right: 16, top: 16, bottom: 32 };
  const w = 320;
  const h = 180;
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  const x = (r) => pad.left + ((r - rpmMin) / (rpmMax - rpmMin)) * cw;
  const y = (p) => pad.top + ch - (p / presMax) * ch;

  const curvePoints = (key) =>
    curves.map((c) => `${x(c.rpm)},${y(c[key])}`).join(' ');

  const reversedCurvePoints = (key) =>
    [...curves].reverse().map((c) => `${x(c.rpm)},${y(c[key])}`).join(' ');

  const r = parseFloat(rpm);
  const p = parseFloat(diffPressure);
  const hasData = !isNaN(r) && !isNaN(p) && r > 0 && percentage !== null;

  return (
    <div className="dpf-chart-card glass-card">
      <div className="dpf-chart-header">
        <span className="dpf-chart-title">ATASCO DPF</span>
        <span className="dpf-chart-value" style={{ color }}>
          {percentage !== null ? `${percentage}%` : '--'}
        </span>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        <rect x="0" y="0" width={w} height={h} fill="rgba(255,255,255,0.02)" rx="8" />

        <polygon
          points={`${curvePoints('limpio')} ${x(rpmMax)},${y(0)} ${x(rpmMin)},${y(0)}`}
          fill="rgba(34,197,94,0.25)"
        />

        <polygon
          points={`${curvePoints('limpio')} ${reversedCurvePoints('sucio')}`}
          fill="rgba(250,204,21,0.20)"
        />

        <polygon
          points={`${curvePoints('sucio')} ${x(rpmMax)},${y(presMax)} ${x(rpmMin)},${y(presMax)}`}
          fill="rgba(239,68,68,0.22)"
        />

        <line x1={x(rpmMin)} y1={y(0)} x2={x(rpmMax)} y2={y(0)} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

        {curves.map((c, i) => (
          <text key={i} x={x(c.rpm)} y={y(0) + 16} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="inherit">
            {c.rpm}
          </text>
        ))}

        {[0, 30, 60, 90, 120, 150].map((val) => (
          <text key={val} x={pad.left - 4} y={y(val) + 3} textAnchor="end" fill="#94a3b8" fontSize="9" fontFamily="inherit">
            {val}
          </text>
        ))}

        {hasData && (
          <>
            <line x1={pad.left} y1={y(p)} x2={x(rpmMax) + pad.right} y2={y(p)} stroke={color} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.6" />
            <line x1={x(r)} y1={y(p)} x2={x(r)} y2={y(0)} stroke={color} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.6" />
            <circle cx={x(r)} cy={y(p)} r="5" fill={color} stroke="#0f172a" strokeWidth="2" />
            <text x={x(r)} y={y(p) - 8} textAnchor="middle" fill={color} fontSize="10" fontWeight="bold" fontFamily="inherit">
              {Math.round(p)} mbar
            </text>
          </>
        )}

        {!hasData && (
          <text x={w / 2} y={h / 2} textAnchor="middle" fill="#475569" fontSize="12" fontFamily="inherit">
            RPM + Presión DIF requeridos
          </text>
        )}
      </svg>

      <div className="dpf-chart-label" style={{ color }}>
        {label}
      </div>
    </div>
  );
};

export default DpfChart;
