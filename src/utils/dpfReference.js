const DPF_REFERENCE = [
  { rpm: 800,  limpio: 6,   medio: 14, sucio: 30 },
  { rpm: 1500, limpio: 12.5, medio: 25, sucio: 50 },
  { rpm: 2500, limpio: 20,  medio: 40, sucio: 70 },
  { rpm: 3500, limpio: 32.5, medio: 55, sucio: 100 },
];

function interpolate(rpm, keyA, keyB) {
  if (rpm <= DPF_REFERENCE[0].rpm) return DPF_REFERENCE[0];
  if (rpm >= DPF_REFERENCE[DPF_REFERENCE.length - 1].rpm)
    return DPF_REFERENCE[DPF_REFERENCE.length - 1];

  for (let i = 0; i < DPF_REFERENCE.length - 1; i++) {
    const lo = DPF_REFERENCE[i];
    const hi = DPF_REFERENCE[i + 1];
    if (rpm >= lo.rpm && rpm <= hi.rpm) {
      const t = (rpm - lo.rpm) / (hi.rpm - lo.rpm);
      return {
        rpm,
        [keyA]: lo[keyA] + (hi[keyA] - lo[keyA]) * t,
        [keyB]: lo[keyB] + (hi[keyB] - lo[keyB]) * t,
      };
    }
  }
  return DPF_REFERENCE[DPF_REFERENCE.length - 1];
}

export function getDpfClogging(rpm, pressure) {
  const r = parseFloat(rpm);
  const p = parseFloat(pressure);

  if (isNaN(r) || isNaN(p) || r <= 0) {
    return { percentage: null, zone: 'unknown', color: '#64748b', label: 'Sin datos' };
  }

  const pt = interpolate(r, 'limpio', 'sucio');
  const limpio = pt.limpio;
  const sucio = pt.sucio;

  const range = sucio - limpio;
  const raw = range > 0 ? ((p - limpio) / range) * 100 : 0;
  const percentage = Math.min(Math.max(raw, 0), 100);

  let zone, color, label;
  if (percentage < 30) {
    zone = 'limpio';
    color = '#4ade80';
    label = 'Filtro limpio';
  } else if (percentage < 70) {
    zone = 'medio';
    color = '#facc15';
    label = 'Capacidad media';
  } else {
    zone = 'sucio';
    color = '#ef4444';
    label = 'Requiere regeneración';
  }

  return { percentage: Math.round(percentage), zone, color, label };
}

export function getDpfCurves() {
  return DPF_REFERENCE;
}

export function getDpfBounds() {
  return {
    rpmMin: DPF_REFERENCE[0].rpm,
    rpmMax: DPF_REFERENCE[DPF_REFERENCE.length - 1].rpm,
    presMax: DPF_REFERENCE[DPF_REFERENCE.length - 1].sucio + 15,
  };
}
