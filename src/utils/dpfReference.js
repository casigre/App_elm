const DPF_REFERENCE = [
  { rpm: 800,  limpio: 10, medio: 20, sucio: 35 },
  { rpm: 1500, limpio: 15, medio: 30, sucio: 55 },
  { rpm: 2500, limpio: 25, medio: 50, sucio: 90 },
  { rpm: 3500, limpio: 40, medio: 75, sucio: 130 },
];

export function getDefaultClean() {
  return { 800: 10, 1500: 15, 2500: 25, 3500: 40 };
}

export function loadCustomClean() {
  try {
    const raw = localStorage.getItem('dpfCleanValues');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveCustomClean(values) {
  try {
    if (values) {
      localStorage.setItem('dpfCleanValues', JSON.stringify(values));
    } else {
      localStorage.removeItem('dpfCleanValues');
    }
  } catch (e) {}
}

function applyCleanOverrides() {
  const custom = loadCustomClean();
  if (!custom) return;
  for (const ref of DPF_REFERENCE) {
    if (custom[ref.rpm] !== undefined) {
      const newClean = Number(custom[ref.rpm]);
      ref.limpio = newClean;
      ref.medio = Math.round(newClean * 1.9);
      ref.sucio = Math.round(newClean * 3.5);
    }
  }
}

function interpolate(rpm, keyA, keyB) {
  applyCleanOverrides();
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
  applyCleanOverrides();
  return DPF_REFERENCE;
}

export function getDpfBounds() {
  applyCleanOverrides();
  return {
    rpmMin: DPF_REFERENCE[0].rpm,
    rpmMax: DPF_REFERENCE[DPF_REFERENCE.length - 1].rpm,
    presMax: DPF_REFERENCE[DPF_REFERENCE.length - 1].sucio + 20,
  };
}
