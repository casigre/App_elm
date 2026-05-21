import React, { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { getDefaultClean, saveCustomClean, loadCustomClean } from '../utils/dpfReference';

const DpfSettings = ({ mode }) => {
  const defaults = getDefaultClean(mode);
  const [values, setValues] = useState(loadCustomClean(mode) || defaults);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const newDefaults = getDefaultClean(mode);
    const savedValues = loadCustomClean(mode);
    setValues(savedValues || newDefaults);
    setSaved(false);
  }, [mode]);

  const handleChange = (rpm, val) => {
    setValues(prev => ({ ...prev, [rpm]: parseFloat(val) || 0 }));
    setSaved(false);
  };

  const handleSave = () => {
    saveCustomClean(values, mode);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    const newDefaults = getDefaultClean(mode);
    setValues(newDefaults);
    saveCustomClean(null, mode);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="dpf-settings glass-card">
      <div className="dpf-settings-header">
        <h3>Valores filtro limpio · {mode === 'media_carga' ? 'Media carga' : 'Sin carga'} (mbar máx)</h3>
      </div>
      <div className="dpf-settings-grid">
        {[800, 1500, 2500, 3500].map(rpm => (
          <div key={rpm} className="dpf-setting-item">
            <label>{rpm} RPM</label>
            <input
              type="number"
              value={values[rpm] || 0}
              onChange={(e) => handleChange(rpm, e.target.value)}
              min="0"
            />
            <span className="dpf-setting-unit">mbar</span>
          </div>
        ))}
      </div>
      <div className="dpf-settings-actions">
        <button className="save-btn" onClick={handleSave}>
          <Save size={14} />
          {saved ? 'Guardado' : 'Guardar'}
        </button>
        <button className="reset-btn" onClick={handleReset}>
          <RotateCcw size={14} />
          Restaurar
        </button>
      </div>
    </div>
  );
};

export default DpfSettings;
