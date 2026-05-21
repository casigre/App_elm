import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  getDpfClogging, getDpfCurves, getDpfBounds,
  getDpfCloggingByCarga, getCargaCurves, getCargaBounds,
} from '../utils/dpfReference';

const DpfChart = ({ rpm, diffPressure, engineLoad, xMode, mode }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isCarga = xMode === 'carga';
  const load = parseFloat(engineLoad);

  const { percentage, color, label } = isCarga
    ? getDpfCloggingByCarga(load, diffPressure, mode)
    : getDpfClogging(rpm, diffPressure, mode);

  const curves = isCarga ? getCargaCurves(mode) : getDpfCurves(mode);
  const bounds = isCarga ? getCargaBounds(mode) : getDpfBounds(mode);

  const xMin = isCarga ? bounds.cargaMin : bounds.rpmMin;
  const xMax = isCarga ? bounds.cargaMax : bounds.rpmMax;
  const presMax = bounds.presMax;

  const cargaReliable = isCarga && load >= 40;
  const pointColor = isCarga && !cargaReliable ? 'rgba(100,116,139,0.6)' : color;

  const buildChart = (w, h, pad) => {
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    const x = (val) => pad.left + ((val - xMin) / (xMax - xMin)) * cw;
    const y = (p) => pad.top + ch - (p / presMax) * ch;

    const xKey = isCarga ? 'carga' : 'rpm';

    const curvePoints = (key) =>
      curves.map((c) => `${x(c[xKey])},${y(c[key])}`).join(' ');

    const reversedCurvePoints = (key) =>
      [...curves].reverse().map((c) => `${x(c[xKey])},${y(c[key])}`).join(' ');

    const r = parseFloat(rpm);
    const p = parseFloat(diffPressure);
    const hasData = isCarga
      ? !isNaN(load) && !isNaN(p) && load >= 0
      : !isNaN(r) && !isNaN(p) && r > 0;

    const px = isCarga ? x(load) : x(r);
    const py = y(p);

    const generateXTicks = () => {
      if (isCarga) return [0, 25, 50, 75, 100];
      return curves.map((c) => c[xKey]);
    };

    const generateYTicks = (max) => {
      const target = 5;
      const rough = max / (target - 1);
      const mag = Math.pow(10, Math.floor(Math.log10(rough)));
      const nr = rough / mag;
      let step;
      if (nr <= 1.5) step = 1 * mag;
      else if (nr <= 3) step = 2 * mag;
      else if (nr <= 7) step = 5 * mag;
      else step = 10 * mag;
      const ticks = [];
      for (let v = 0; v <= max + step * 0.5; v += step) {
        ticks.push(Math.round(v));
      }
      return ticks;
    };

    const xTicks = generateXTicks();
    const yTicks = generateYTicks(presMax);

    return (
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        <rect x="0" y="0" width={w} height={h} fill="rgba(255,255,255,0.02)" rx="8" />

        <polygon
          points={`${curvePoints('limpio')} ${x(xMax)},${y(0)} ${x(xMin)},${y(0)}`}
          fill="rgba(34,197,94,0.25)"
        />

        <polygon
          points={`${curvePoints('limpio')} ${reversedCurvePoints('sucio')}`}
          fill="rgba(250,204,21,0.20)"
        />

        <polygon
          points={`${curvePoints('sucio')} ${x(xMax)},${y(presMax)} ${x(xMin)},${y(presMax)}`}
          fill="rgba(239,68,68,0.22)"
        />

        <line x1={x(xMin)} y1={y(0)} x2={x(xMax)} y2={y(0)} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

        {xTicks.map((val, i) => (
          <text key={i} x={x(val)} y={y(0) + 16} textAnchor="middle" fill="#94a3b8" fontSize={isExpanded ? "11" : "9"} fontFamily="inherit">
            {val}
          </text>
        ))}

        {yTicks.map((val) => (
          <text key={val} x={pad.left - 4} y={y(val) + 3} textAnchor="end" fill="#94a3b8" fontSize={isExpanded ? "11" : "9"} fontFamily="inherit">
            {val}
          </text>
        ))}

        {hasData && (
          <>
            <line x1={pad.left} y1={py} x2={x(xMax) + pad.right} y2={py} stroke={pointColor} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.6" />
            <line x1={px} y1={py} x2={px} y2={y(0)} stroke={pointColor} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.6" />
            <circle cx={px} cy={py} r={isExpanded ? "7" : "5"} fill={pointColor} stroke="#0f172a" strokeWidth="2" opacity={isCarga && !cargaReliable ? 0.5 : 1} />
            <text x={px} y={py - 10} textAnchor="middle" fill={pointColor} fontSize={isExpanded ? "12" : "10"} fontWeight="bold" fontFamily="inherit" opacity={isCarga && !cargaReliable ? 0.5 : 1}>
              {Math.round(p)} mbar
            </text>
          </>
        )}

        {!hasData && (
          <text x={w / 2} y={h / 2} textAnchor="middle" fill="#475569" fontSize={isExpanded ? "14" : "12"} fontFamily="inherit">
            {isCarga ? 'Carga + Presión DIF requeridos' : 'RPM + Presión DIF requeridos'}
          </text>
        )}
      </svg>
    );
  };

  const pad = { left: 48, right: 16, top: 16, bottom: 32 };
  const w = 320;
  const h = 180;

  const title = isCarga
    ? `ATASCO DPF · ${mode === 'media_carga' ? 'Media carga' : 'Sin carga'}` + (isCarga && !cargaReliable && load >= 0 ? ' (baja carga)' : '')
    : `ATASCO DPF · ${mode === 'media_carga' ? 'Media carga' : 'Sin carga'}`;

  const headerExtra = isCarga
    ? <span className="dpf-chart-load" style={{ opacity: cargaReliable ? 1 : 0.4 }}>⚡{!isNaN(load) ? `${Math.round(load)}%` : '--'}</span>
    : null;

  return (
    <>
      <div className="dpf-chart-card glass-card" onClick={() => setIsExpanded(true)}>
        <div className="dpf-chart-header">
          <span className="dpf-chart-title">{title}</span>
          <span className="dpf-chart-value" style={{ color }}>
            {percentage !== null ? `${percentage}%` : '--'} {headerExtra}
          </span>
        </div>

        {buildChart(w, h, pad)}

        <div className="dpf-chart-label" style={{ color: pointColor }}>
          {isCarga && !cargaReliable && load >= 0 ? 'Esperando carga > 40%...' : label}
        </div>
      </div>

      {isExpanded && (
        <div className="dpf-chart-overlay" onClick={() => setIsExpanded(false)}>
          <div className="dpf-chart-overlay-inner" onClick={(e) => e.stopPropagation()}>
            <div className="dpf-chart-overlay-header">
              <span className="dpf-chart-title">{title}</span>
              <span className="dpf-chart-overlay-value" style={{ color: pointColor }}>{percentage !== null ? `${percentage}%` : '--'} {headerExtra}</span>
              <button className="dpf-chart-close-btn" onClick={() => setIsExpanded(false)}>
                <X size={22} />
              </button>
            </div>
            <div className="dpf-chart-overlay-svg">
              {buildChart(w * 3, h * 2.5, { left: 56, right: 24, top: 24, bottom: 40 })}
            </div>
            <div className="dpf-chart-overlay-label" style={{ color: pointColor }}>
              {isCarga && !cargaReliable && load >= 0 ? 'Esperando carga > 40%...' : label}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DpfChart;
