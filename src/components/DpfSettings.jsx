import React, { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { getDefaultClean, saveCustomClean, loadCustomClean } from '../utils/dpfReference';

const DpfSettings = () => {
  const defaults = getDefaultClean();
  const [values, setValues] = useState(loadCustomClean() || defaults);
  const [saved, setSaved] = useState(false);

  const handleChange = (rpm, val) => {
    setValues(prev => ({ ...prev, [rpm]: parseFloat(val) || 0 }));
    setSaved(false);
  };

  const handleSave = () => {
    saveCustomClean(values);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setValues(defaults);
    saveCustomClean(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="dpf-settings glass-card">
      <div className="dpf-settings-header">
        <h3>Valores filtro limpio (mbar máx)</h3>
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
              max="200"
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
