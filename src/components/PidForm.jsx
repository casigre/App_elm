import React, { useState } from 'react';
import { Plus, Save, X, Trash2 } from 'lucide-react';

const PidForm = ({ onSave, initialData, onCancel }) => {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    ModeAndPID: '',
    Equation: '',
    'Min Value': '0',
    'Max Value': '100',
    Units: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.ModeAndPID) {
      alert('Por favor, rellena al menos Nombre y PID (Hex)');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="pid-form glass-card">
      <div className="form-header">
        <h3>{initialData ? 'Editar Parámetro' : 'Nuevo Parámetro Personalizado'}</h3>
        <button className="close-btn" onClick={onCancel}>
          <X size={20} />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="premium-form">
        <div className="form-group">
          <label>Nombre del Sensor</label>
          <input 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            placeholder="Ej: Presión Turbo"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>PID (Hex)</label>
            <input 
              name="ModeAndPID" 
              value={formData.ModeAndPID} 
              onChange={handleChange} 
              placeholder="Ej: 222442"
            />
          </div>
          <div className="form-group">
            <label>Unidades</label>
            <input 
              name="Units" 
              value={formData.Units} 
              onChange={handleChange} 
              placeholder="Ej: bar, C, RPM"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Ecuación (Javascript)</label>
          <textarea 
            name="Equation" 
            value={formData.Equation} 
            onChange={handleChange} 
            placeholder="Ej: (A*256+B)/100"
            rows="2"
          />
          <small className="text-dim">Variables disponibles: A, B, C, D, E, F, G, H (bytes de respuesta)</small>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Valor Mín.</label>
            <input 
              type="number"
              name="Min Value" 
              value={formData['Min Value']} 
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Valor Máx.</label>
            <input 
              type="number"
              name="Max Value" 
              value={formData['Max Value']} 
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="save-btn">
            <Save size={18} />
            GUARDAR PARÁMETRO
          </button>
        </div>
      </form>
    </div>
  );
};

export default PidForm;
