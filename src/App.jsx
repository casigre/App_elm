import React, { useState, useEffect } from 'react';
import { Settings, Zap, Gauge, History, Search, Power } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import Dashboard from './components/Dashboard';
import PidSelector from './components/PidSelector';
import obdService from './services/obdService';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [connMode, setConnMode] = useState('bluetooth'); // 'bluetooth' or 'wifi'
  const [wifiIp, setWifiIp] = useState('192.168.0.10');
  const [wifiPort, setWifiPort] = useState('35000');

  useEffect(() => {
    // Poll service status
    const timer = setInterval(() => {
      setIsConnected(obdService.isConnected);
      setIsConnecting(obdService.isConnecting);
      setStatusMsg(obdService.statusMessage);
    }, 1000);
    return () => clearInterval(timer);
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

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo">
          ELM<span className="logo-accent">327</span>
        </div>
        <div className="header-actions">
          <button className="exit-btn" onClick={handleExit} title="Cerrar app">
            <Power size={18} />
          </button>
          <div className={`status-badge ${isConnected ? 'status-connected' : 'status-disconnected'}`}>
            <Zap size={14} fill={isConnected ? "currentColor" : "none"} />
            {isConnecting ? 'CONECTANDO...' : (isConnected ? 'CONECTADO (REAL)' : 'MODO SIMULACIÓN')}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-content">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'pids' && <PidSelector />}
        {activeTab === 'settings' && (
          <div className="settings-panel glass-card">
            <h2>Hardware OBDII</h2>
            
            <div className="mode-toggle">
              <button 
                className={`mode-btn ${connMode === 'bluetooth' ? 'active' : ''}`}
                onClick={() => setConnMode('bluetooth')}
              >
                Bluetooth
              </button>
              <button 
                className={`mode-btn ${connMode === 'wifi' ? 'active' : ''}`}
                onClick={() => setConnMode('wifi')}
              >
                Wi-Fi
              </button>
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
                    <input 
                      type="text" 
                      value={wifiIp} 
                      onChange={(e) => setWifiIp(e.target.value)}
                      placeholder="192.168.0.10"
                    />
                  </div>
                  <div className="form-group">
                    <label>Puerto</label>
                    <input 
                      type="text" 
                      value={wifiPort} 
                      onChange={(e) => setWifiPort(e.target.value)}
                      placeholder="35000"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="connection-actions">
              {!isConnected ? (
                <button 
                  className="connect-btn pulse-interactive" 
                  onClick={handleConnect}
                  disabled={isConnecting}
                >
                  {isConnecting ? 'Conectando...' : `Conectar por ${connMode === 'wifi' ? 'Wi-Fi' : 'Bluetooth'}`}
                </button>
              ) : (
                <button className="disconnect-btn" onClick={handleDisconnect}>
                  Desconectar Dispositivo
                </button>
              )}
            </div>
            
            <div className="info-box">
              {connMode === 'wifi' ? (
                <>
                  <h3>Instrucciones Wi-Fi</h3>
                  <ol className="step-list">
                    <li><strong>Paso 1:</strong> Ve a los ajustes de Wi-Fi de tu PC.</li>
                    <li><strong>Paso 2:</strong> Busca una red llamada <strong>OBDII</strong> o <strong>WiFi_OBD</strong> y conéctate a ella.</li>
                    <li><strong>Paso 3:</strong> Vuelve aquí y pulsa "Conectar por Wi-Fi".</li>
                  </ol>
                  <p className="note">Dirección estándar: 192.168.0.10, Puerto: 35000</p>
                </>
              ) : (
                <>
                  <h3>Instrucciones Bluetooth</h3>
                  <ol className="step-list">
                    <li><strong>Paso 1:</strong> Ve a Ajustes de Windows → Bluetooth → Añadir dispositivo.</li>
                    <li><strong>Paso 2:</strong> Busca un dispositivo llamado <strong>OBDII</strong> o <strong>CARS</strong> (no suele poner ELM327). Si pide PIN, es <code>1234</code> o <code>0000</code>.</li>
                    <li><strong>Paso 3:</strong> Vuelve aquí y pulsa "Conectar por Bluetooth".</li>
                  </ol>
                  <div className="tip-box">
                    <strong>Tip Windows 11:</strong> Si no lo encuentra, ve a <em>Configuración → Bluetooth → Dispositivos</em> y cambia "Detección de dispositivos Bluetooth" de <strong>Predeterminado</strong> a <strong>Avanzado</strong>.
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Navigation Bar */}
      <nav className="app-nav">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`nav-item ${activeTab === 'dashboard' ? 'nav-active' : ''}`}
        >
          <Gauge size={24} />
          <span className="nav-label">PANEL</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('pids')}
          className={`nav-item ${activeTab === 'pids' ? 'nav-active' : ''}`}
        >
          <Search size={24} />
          <span className="nav-label">PIDs</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'settings' ? 'nav-active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={24} />
          <span className="nav-label">AJUSTES</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
