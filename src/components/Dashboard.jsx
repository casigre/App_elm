import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertTriangle, Thermometer, Wind } from 'lucide-react';
import DpfChart from './DpfChart';

const GaugeCard = ({ title, value, unit, color, icon: Icon, min, max }) => {
  const numericValue = parseFloat(value) || 0;
  const minValue = parseFloat(min) || 0;
  const maxValue = parseFloat(max) || 100;
  
  // Calculate percentage (clamped between 0 and 100)
  const range = maxValue - minValue;
  const percentage = range !== 0 
    ? Math.min(Math.max(((numericValue - minValue) / range) * 100, 0), 100)
    : 0;

  return (
    <div className="gauge-card glass-card">
      <div className="gauge-header">
        <Icon size={16} style={{ color }} />
        <span className="gauge-title">{title}</span>
      </div>
      <div className="gauge-body">
        <span className="gauge-value" style={{ color }}>{value}</span>
        <span className="gauge-unit">{unit}</span>
      </div>
      <div className="gauge-footer">
        <div className="gauge-bar-bg">
          <motion.div 
            className="gauge-bar-fill" 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            style={{ background: `linear-gradient(to right, transparent, ${color})` }}
          />
        </div>
      </div>
    </div>
  );
};

import obdService from '../services/obdService';

const Dashboard = () => {
  const [activePids, setActivePids] = useState([]);
  const [data, setData] = useState({});

  useEffect(() => {
    let pids = [];
    try {
      const saved = localStorage.getItem('selectedPids');
      if (saved) {
        pids = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error reading selected pids from storage:', e);
    }

    if (pids.length > 0) {
      setActivePids(pids);
      obdService.setPids(pids);
      obdService.startPolling((pidCode, value) => {
        setData(prev => ({ ...prev, [pidCode]: value }));
      });
    }

    return () => obdService.stopPolling();
  }, []);

  if (activePids.length === 0) {
    return (
      <div className="empty-dashboard glass-card">
        <AlertTriangle size={48} className="text-orange pulse-anim" />
        <h3>Sin parámetros seleccionados</h3>
        <p>Ve a la pestaña PIDs para elegir qué monitorizar.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-grid">
      <div className="dpf-chart-wrapper">
        <DpfChart
          rpm={data['22210E']}
          diffPressure={data['222542']}
        />
      </div>
      <AnimatePresence>
        {activePids.map((pid, idx) => (
          <motion.div
            key={pid.ModeAndPID + idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: idx * 0.1 }}
          >
            <GaugeCard 
              title={pid.name} 
              value={data[pid.ModeAndPID] || '--'} 
              unit={pid.Units} 
              min={pid['Min Value']}
              max={pid['Max Value']}
              color={idx % 2 === 0 ? 'var(--accent-cyan)' : 'var(--accent-blue)'}
              icon={Activity}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
