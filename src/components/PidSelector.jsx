import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Search, Info, Plus, Edit2, Trash2 } from 'lucide-react';
import PidForm from './PidForm';

const PidSelector = () => {
  const [pids, setPids] = useState([]);
  const [selectedPids, setSelectedPids] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [customPids, setCustomPids] = useState([]);

  useEffect(() => {
    let storedCustom = [];
    try {
      const raw = localStorage.getItem('customPids');
      if (raw) storedCustom = JSON.parse(raw);
    } catch (e) {}

    setCustomPids(storedCustom);

    const DEFAULT_DPF_PIDS = ['22242C', '222542', '222442', '2224A9', '22246D'];
    
    fetch('./pids.csv')
      .then(response => response.text())
      .then(csvData => {
        const result = Papa.parse(csvData, {
          header: true,
          skipEmptyLines: true,
        });
        const allPidsFromCsv = result.data;
        setPids(allPidsFromCsv);
        
        try {
          const saved = localStorage.getItem('selectedPids');
          if (saved) {
            setSelectedPids(JSON.parse(saved));
          } else {
            const defaults = allPidsFromCsv.filter(p => DEFAULT_DPF_PIDS.includes(p.ModeAndPID));
            setSelectedPids(defaults);
            localStorage.setItem('selectedPids', JSON.stringify(defaults));
          }
        } catch (e) {
          const defaults = allPidsFromCsv.filter(p => DEFAULT_DPF_PIDS.includes(p.ModeAndPID));
          setSelectedPids(defaults);
        }
        setLoading(false);
      });
  }, []);

  const [editingPid, setEditingPid] = useState(null);

  const togglePid = (pid) => {
    let newSelected;
    const isSelected = selectedPids.some(p => p.ModeAndPID === pid.ModeAndPID);
    if (isSelected) {
      newSelected = selectedPids.filter(p => p.ModeAndPID !== pid.ModeAndPID);
    } else {
      newSelected = [...selectedPids, pid];
    }
    setSelectedPids(newSelected);
    try { localStorage.setItem('selectedPids', JSON.stringify(newSelected)); } catch (e) {}
  };

  const startEditing = (e, pid) => {
    e.stopPropagation();
    setEditingPid(pid);
    setShowForm(true);
  };

  const saveCustomPid = (newPid) => {
    let updated;
    if (editingPid) {
      // If it's a custom PID, update in customPids
      if (editingPid.isCustom) {
        updated = customPids.map(p => p.ModeAndPID === editingPid.ModeAndPID ? { ...newPid, isCustom: true } : p);
      } else {
        // If it was a CSV PID, add to customPids as an override
        updated = [...customPids, { ...newPid, isCustom: true }];
      }
      setEditingPid(null);
    } else {
      updated = [...customPids, { ...newPid, isCustom: true }];
    }
    
    setCustomPids(updated);
    try { localStorage.setItem('customPids', JSON.stringify(updated)); } catch (e) {}
    
    const updatedSelected = selectedPids.map(p => (p.ModeAndPID === newPid.ModeAndPID || (editingPid && p.ModeAndPID === editingPid.ModeAndPID)) ? newPid : p);
    setSelectedPids(updatedSelected);
    try { localStorage.setItem('selectedPids', JSON.stringify(updatedSelected)); } catch (e) {}
    
    setShowForm(false);
  };

  const deleteCustomPid = (pidCode, e) => {
    e.stopPropagation();
    const updated = customPids.filter(p => p.ModeAndPID !== pidCode);
    setCustomPids(updated);
    try { localStorage.setItem('customPids', JSON.stringify(updated)); } catch (e) {}
    
    const updatedSelected = selectedPids.filter(p => p.ModeAndPID !== pidCode);
    setSelectedPids(updatedSelected);
    try { localStorage.setItem('selectedPids', JSON.stringify(updatedSelected)); } catch (e) {}
  };

  const allPids = [...customPids, ...pids];
  const filteredPids = allPids.filter(pid => 
    pid.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pid.ModeAndPID?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading-state">Cargando base de datos K9K...</div>;

  return (
    <div className="pid-selector-container">
      <div className="search-bar">
        <Search size={18} className="search-icon" />
        <input 
          type="text" 
          placeholder="Buscar (FAP, Hollin, Temp, RPM)..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button className="add-custom-btn" onClick={() => { setEditingPid(null); setShowForm(!showForm); }}>
          <Plus size={20} />
        </button>
      </div>

      {showForm && (
        <PidForm 
          onSave={saveCustomPid} 
          onCancel={() => { setShowForm(false); setEditingPid(null); }} 
          initialData={editingPid} 
        />
      )}

      <div className="selector-stats">
        <Info size={14} />
        <span>{selectedPids.length} parámetros activos</span>
      </div>

      <div className="pid-list">
        {filteredPids.map((pid, idx) => (
          <div 
            key={pid.ModeAndPID + idx} 
            className={`pid-item glass-card ${selectedPids.some(p => p.ModeAndPID === pid.ModeAndPID) ? 'selected' : ''}`}
            onClick={() => togglePid(pid)}
          >
            <div className="pid-info">
              <span className="pid-name">{pid.name}</span>
              <span className="pid-code">{pid.ModeAndPID} • {pid.Units}</span>
            </div>
            
            <div className="pid-actions">
              <button 
                className="edit-pid-btn" 
                onClick={(e) => startEditing(e, pid)}
                title="Comprobar/Editar"
              >
                <Edit2 size={16} />
              </button>
              
              {pid.isCustom && (
                <button 
                  className="delete-pid-btn" 
                  onClick={(e) => deleteCustomPid(pid.ModeAndPID, e)}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            
            <div className={`selection-indicator ${selectedPids.some(p => p.ModeAndPID === pid.ModeAndPID) ? 'active' : ''}`}></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PidSelector;
