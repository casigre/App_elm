const SIN_CARGA = [
  { rpm: 800,  limpio: 5,   medio: 15,  sucio: 40 },
  { rpm: 1500, limpio: 10,  medio: 30,  sucio: 70 },
  { rpm: 2500, limpio: 20,  medio: 50,  sucio: 120 },
  { rpm: 3500, limpio: 30,  medio: 80,  sucio: 180 },
];

const MEDIA_CARGA = [
  { rpm: 800,  limpio: 9,   medio: 17,  sucio: 32 },
  { rpm: 1500, limpio: 32,  medio: 60,  sucio: 112 },
  { rpm: 2500, limpio: 85,  medio: 162, sucio: 298 },
  { rpm: 3500, limpio: 169, medio: 322, sucio: 592 },
];

function getBaseDataset(mode) {
  const m = mode || getDpfMode();
  return m === 'media_carga' ? MEDIA_CARGA : SIN_CARGA;
}

export function getDpfMode() {
  try {
    const raw = localStorage.getItem('dpfMode');
    return raw === 'media_carga' ? 'media_carga' : 'sin_carga';
  } catch (e) {
    return 'sin_carga';
  }
}

export function setDpfMode(mode) {
  try {
    localStorage.setItem('dpfMode', mode);
  } catch (e) {}
}

function getOverrideKey(mode) {
  return mode === 'media_carga' ? 'dpfCleanValuesMedia' : 'dpfCleanValues';
}

export function getDefaultClean(mode) {
  const m = mode || getDpfMode();
  const base = getBaseDataset(m);
  const result = {};
  for (const ref of base) {
    result[ref.rpm] = ref.limpio;
  }
  return result;
}

export function loadCustomClean(mode) {
  try {
    const m = mode || getDpfMode();
    const key = getOverrideKey(m);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveCustomClean(values, mode) {
  try {
    const m = mode || getDpfMode();
    const key = getOverrideKey(m);
    if (values) {
      localStorage.setItem(key, JSON.stringify(values));
    } else {
      localStorage.removeItem(key);
    }
  } catch (e) {}
}

function getWorkingCurves(mode) {
  const m = mode || getDpfMode();
  const base = getBaseDataset(m);
  const curves = base.map(c => ({ ...c }));
  const custom = loadCustomClean(m);
  if (custom) {
    for (const ref of curves) {
      if (custom[ref.rpm] !== undefined) {
        const newClean = Number(custom[ref.rpm]);
        ref.limpio = newClean;
        ref.medio = Math.round(newClean * 1.9);
        ref.sucio = Math.round(newClean * 3.5);
      }
    }
  }
  return curves;
}

function interpolate(rpm, keyA, keyB, mode) {
  const curves = getWorkingCurves(mode);

  if (rpm <= curves[0].rpm) return curves[0];
  if (rpm >= curves[curves.length - 1].rpm)
    return curves[curves.length - 1];

  for (let i = 0; i < curves.length - 1; i++) {
    const lo = curves[i];
    const hi = curves[i + 1];
    if (rpm >= lo.rpm && rpm <= hi.rpm) {
      const t = (rpm - lo.rpm) / (hi.rpm - lo.rpm);
      return {
        rpm,
        [keyA]: lo[keyA] + (hi[keyA] - lo[keyA]) * t,
        [keyB]: lo[keyB] + (hi[keyB] - lo[keyB]) * t,
      };
    }
  }
  return curves[curves.length - 1];
}

export function getDpfClogging(rpm, pressure, mode) {
  const r = parseFloat(rpm);
  const p = parseFloat(pressure);

  if (isNaN(r) || isNaN(p) || r <= 0) {
    return { percentage: null, zone: 'unknown', color: '#64748b', label: 'Sin datos' };
  }

  const pt = interpolate(r, 'limpio', 'sucio', mode);
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

export function getDpfCurves(mode) {
  return getWorkingCurves(mode);
}

export function getDpfBounds(mode) {
  const curves = getWorkingCurves(mode);
  return {
    rpmMin: curves[0].rpm,
    rpmMax: curves[curves.length - 1].rpm,
    presMax: curves[curves.length - 1].sucio + 20,
  };
}
