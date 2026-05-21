import React, { useState, useEffect } from 'react';
import { Settings, Zap, Gauge, History, Search, Power, BarChart3, Monitor } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import Dashboard from './components/Dashboard';
import DpfChart from './components/DpfChart';
import DpfSettings from './components/DpfSettings';
import PidSelector from './components/PidSelector';
import obdService from './services/obdService';
import { getDpfMode, setDpfMode } from './utils/dpfReference';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [connMode, setConnMode] = useState('bluetooth');
  const [wifiIp, setWifiIp] = useState('192.168.0.10');
  const [wifiPort, setWifiPort] = useState('35000');
  const [data, setData] = useState({});
  const [dpfRpmPid, setDpfRpmPid] = useState(() => {
    try { return localStorage.getItem('dpfRpmPid') || '010C'; } catch (e) { return '010C'; }
  });
  const [dpfDiffPid, setDpfDiffPid] = useState(() => {
    try { return localStorage.getItem('dpfDiffPid') || '222542'; } catch (e) { return '222542'; }
  });
  const [dpfMode, setDpfModeState] = useState(getDpfMode);
  const [dpfXMode, setDpfXMode] = useState(() => {
    try { return localStorage.getItem('dpfXMode') || 'rpm'; } catch (e) { return 'rpm'; }
  });
  const [dpfLoadPid, setDpfLoadPid] = useState(() => {
    try { return localStorage.getItem('dpfLoadPid') || '0104'; } catch (e) { return '0104'; }
  });
  let wakeLock = null;

  const getAvailablePids = () => {
    try {
      const saved = localStorage.getItem('selectedPids');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  };

  const rpmPids = getAvailablePids().filter(p => (p.Units === 'RPM' || p.Units === 'rpm'));
  const pressurePids = getAvailablePids().filter(p => (p.Units === 'mbar' || p.Units === 'bar' || p.Units === 'mBar'));
  const loadPids = getAvailablePids().filter(p => (p.Units === '%' && p.name?.toLowerCase().includes('carga')));

  const startPollingFromStorage = () => {
    let pids = [];
    try {
      const saved = localStorage.getItem('selectedPids');
      if (saved) pids = JSON.parse(saved);
    } catch (e) {}

    if (pids.length > 0) {
      obdService.setPids(pids);
      obdService.startPolling((pidCode, value) => {
        setData(prev => ({ ...prev, [pidCode]: value }));
      });
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setIsConnected(obdService.isConnected);
      setIsConnecting(obdService.isConnecting);
      setStatusMsg(obdService.statusMessage);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    startPollingFromStorage();

    const onPidChange = () => {
      obdService.stopPolling();
      startPollingFromStorage();
    };
    window.addEventListener('pidChange', onPidChange);
    return () => {
      obdService.stopPolling();
      window.removeEventListener('pidChange', onPidChange);
    };
  }, []);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
      } catch (e) {}
    };
    requestWakeLock();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, []);

  const handleConnect = async () => {
    try {
      let success = false;
      if (connMode === 'wifi') {
        success = await obdService.connectWifi(wifiIp, parseInt(wifiPort));
      } else {
        success = await obdService.connect();
      }
      if (!success && !obdService.statusMessage.includes("Error")) {
        alert("No se pudo conectar. Revisa la configuración.");
      }
      setIsConnected(success);
    } catch (err) {
      console.error("Error connecting:", err);
      alert("Error de conexión: " + (err.message || "Desconocido"));
      setIsConnected(false);
    }
  };

  const handleDisconnect = () => {
    obdService.disconnect();
    setIsConnected(false);
  };

  const handleExit = async () => {
    await obdService.disconnect();
    try {
      await CapApp.exitApp();
    } catch {
      window.close();
    }
  };

  const handleCast = () => {
    try {
      window.open('intent:#Intent;action=android.settings.CAST_SETTINGS;end', '_blank');
    } catch {
      alert('Usa el botón “Emitir pantalla” en los ajustes rápidos de Android');
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          ELM<span className="logo-accent">327</span>
        </div>
        <div className="header-actions">
          <div className={`status-badge ${isConnected ? 'status-connected' : 'status-disconnected'}`}>
            <Zap size={14} fill={isConnected ? "currentColor" : "none"} />
            {isConnecting ? 'CONECTANDO...' : (isConnected ? 'CONECTADO (REAL)' : 'MODO SIMULACIÓN')}
          </div>
          <button className="exit-btn" onClick={handleExit} title="Cerrar app">
            <Power size={18} />
          </button>
        </div>
      </header>

      <main className="app-content">
        {activeTab === 'dashboard' && <Dashboard data={data} />}
        {activeTab === 'dpf' && (
          <div className="dpf-page">
            <div className="dpf-pid-selectors glass-card">
              <div className="dpf-selector-item">
                <label>Eje X</label>
                <select value={dpfXMode} onChange={(e) => {
                  setDpfXMode(e.target.value);
                  try { localStorage.setItem('dpfXMode', e.target.value); } catch(ex) {}
                }}>
                  <option value="rpm">RPM</option>
                  <option value="carga">Carga Motor</option>
                </select>
              </div>
              {dpfXMode === 'rpm' ? (
                <div className="dpf-selector-item">
                  <label>RPM</label>
                  <select value={dpfRpmPid} onChange={(e) => { setDpfRpmPid(e.target.value); try { localStorage.setItem('dpfRpmPid', e.target.value); } catch(ex) {} }}>
                    {rpmPids.map(p => (
                      <option key={p.ModeAndPID} value={p.ModeAndPID}>{p.name} ({p.ModeAndPID})</option>
                    ))}
                    {rpmPids.length === 0 && <option value="010C">RPM (010C)</option>}
                  </select>
                </div>
              ) : (
                <div className="dpf-selector-item">
                  <label>Carga</label>
                  <select value={dpfLoadPid} onChange={(e) => { setDpfLoadPid(e.target.value); try { localStorage.setItem('dpfLoadPid', e.target.value); } catch(ex) {} }}>
                    {loadPids.map(p => (
                      <option key={p.ModeAndPID} value={p.ModeAndPID}>{p.name} ({p.ModeAndPID})</option>
                    ))}
                    {loadPids.length === 0 && <option value="0104">Carga Motor (0104)</option>}
                  </select>
                </div>
              )}
              <div className="dpf-selector-item">
                <label>Presión</label>
                <select value={dpfDiffPid} onChange={(e) => { setDpfDiffPid(e.target.value); try { localStorage.setItem('dpfDiffPid', e.target.value); } catch(ex) {} }}>
                  {pressurePids.map(p => (
                    <option key={p.ModeAndPID} value={p.ModeAndPID}>{p.name} ({p.ModeAndPID})</option>
                  ))}
                  {pressurePids.length === 0 && <option value="222542">Presión Dif. FAP (222542)</option>}
                </select>
              </div>
            </div>
            <div className="dpf-mode-bar">
              <div className="mode-toggle">
                <button className={`mode-btn ${dpfMode === 'sin_carga' ? 'active' : ''}`} onClick={() => { setDpfMode('sin_carga'); setDpfModeState('sin_carga'); }}>Sin carga</button>
                <button className={`mode-btn ${dpfMode === 'media_carga' ? 'active' : ''}`} onClick={() => { setDpfMode('media_carga'); setDpfModeState('media_carga'); }}>Media carga</button>
              </div>
            </div>
            <DpfChart
              rpm={data[dpfRpmPid]}
              diffPressure={data[dpfDiffPid]}
              engineLoad={data[dpfLoadPid]}
              xMode={dpfXMode}
              mode={dpfMode}
            />
            <div className="dpf-page-info glass-card">
              <h3>Interpretación del gráfico</h3>
              <p className="text-dim">El punto ● muestra la presión diferencial actual del filtro a las RPM del motor.</p>
              <ul className="dpf-legend">
                <li><span className="legend-dot" style={{background:'#4ade80'}}></span> Verde: Filtro limpio</li>
                <li><span className="legend-dot" style={{background:'#facc15'}}></span> Amarillo: Capacidad media</li>
                <li><span className="legend-dot" style={{background:'#ef4444'}}></span> Rojo: Necesita regeneración</li>
              </ul>
            </div>
            <DpfSettings mode={dpfMode} />
          </div>
        )}
        {activeTab === 'pids' && <PidSelector />}
        {activeTab === 'settings' && (
          <div className="settings-panel glass-card">
            <h2>Hardware OBDII</h2>
            <div className="mode-toggle">
              <button className={`mode-btn ${connMode === 'bluetooth' ? 'active' : ''}`} onClick={() => setConnMode('bluetooth')}>Bluetooth</button>
              <button className={`mode-btn ${connMode === 'wifi' ? 'active' : ''}`} onClick={() => setConnMode('wifi')}>Wi-Fi</button>
            </div>
            <div className="status-message-box">
              <span className="status-dot"></span>
              {statusMsg || (isConnected ? 'Conectado' : 'Listo para conectar')}
            </div>
            {connMode === 'wifi' && (
              <div className="wifi-settings premium-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Dirección IP</label>
                    <input type="text" value={wifiIp} onChange={(e) => setWifiIp(e.target.value)} placeholder="192.168.0.10" />
                  </div>
                  <div className="form-group">
                    <label>Puerto</label>
                    <input type="text" value={wifiPort} onChange={(e) => setWifiPort(e.target.value)} placeholder="35000" />
                  </div>
                </div>
              </div>
            )}
            <div className="connection-actions">
              {!isConnected ? (
                <button className="connect-btn pulse-interactive" onClick={handleConnect} disabled={isConnecting}>
                  {isConnecting ? 'Conectando...' : `Conectar por ${connMode === 'wifi' ? 'Wi-Fi' : 'Bluetooth'}`}
                </button>
              ) : (
                <button className="disconnect-btn" onClick={handleDisconnect}>Desconectar Dispositivo</button>
              )}
            </div>
            <div className="info-box">
              <h3>Instrucciones Bluetooth</h3>
              <ol className="step-list">
                <li><strong>Paso 1:</strong> Vincula el OBDII en Ajustes → Bluetooth de Android.</li>
                <li><strong>Paso 2:</strong> El PIN suele ser <code>1234</code> o <code>0000</code>.</li>
                <li><strong>Paso 3:</strong> Vuelve aquí y pulsa "Conectar por Bluetooth".</li>
              </ol>
            </div>
          </div>
        )}
      </main>

      <nav className="app-nav">
        <button onClick={() => setActiveTab('dashboard')} className={`nav-item ${activeTab === 'dashboard' ? 'nav-active' : ''}`}>
          <Gauge size={22} />
          <span className="nav-label">PANEL</span>
        </button>
        <button onClick={() => setActiveTab('dpf')} className={`nav-item ${activeTab === 'dpf' ? 'nav-active' : ''}`}>
          <BarChart3 size={22} />
          <span className="nav-label">DPF</span>
        </button>
        <button onClick={() => setActiveTab('pids')} className={`nav-item ${activeTab === 'pids' ? 'nav-active' : ''}`}>
          <Search size={22} />
          <span className="nav-label">PIDs</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`nav-item ${activeTab === 'settings' ? 'nav-active' : ''}`}>
          <Settings size={22} />
          <span className="nav-label">AJUSTES</span>
        </button>
        <button onClick={handleCast} className="nav-item" title="Emitir pantalla">
          <Monitor size={22} />
          <span className="nav-label">EMITIR</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
