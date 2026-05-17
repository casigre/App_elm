import { BleClient, numbersToDataView } from '@capacitor-community/bluetooth-le';
import { BluetoothSerial } from '@ionic-native/bluetooth-serial';

const OBD_SERVICE_UUIDS = [
  '0000fff0-0000-1000-8000-00805f9b34fb', // Common for ELM327 BLE (many clones)
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard OBDII
  '0000ffe0-0000-1000-8000-00805f9b34fb', // Alternative for some ELM327
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // OBDLink MX+ / Other high quality adapters
  '0000ae00-0000-1000-8000-00805f9b34fb', // VLinker
  '00001101-0000-1000-8000-00805f9b34fb'  // Generic SPP (often used by clones)
];

const OBD_CHARACTERISTIC_UUIDS = [
  '0000fff1-0000-1000-8000-00805f9b34fb',
  '0000fff2-0000-1000-8000-00805f9b34fb',
  '0000ae01-0000-1000-8000-00805f9b34fb'
];

class ObdService {
  constructor() {
    this.selectedPids = [];
    this.pollingInterval = null;
    this.onDataCallback = null;
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.isCapacitor = !!window.Capacitor;
    this.bleDeviceId = null;
    this.activeServiceUuid = null;
    this.activeCharUuid = null;
    this.bleNotifyCharUuid = null;
    this.bleDataBuffer = '';
    this.bleDataResolver = null;
    this.bleDataTarget = '';
    this.bleTimeoutId = null;
    this.statusMessage = '';
    this.connectionType = 'serial';
    this.currentHeader = null;
    this.isPollingCycleActive = false;
    this.wifiConfig = { ip: '192.168.0.10', port: 35000 };
  }

  setStatus(msg) {
    this.statusMessage = msg;
    console.log(`[OBD Service] ${msg}`);
  }

  async connect() {
    if (this.isConnected) return true;
    if (this.isConnecting) {
      this.setStatus("Ya hay una conexión en curso...");
      return false;
    }
    
    try {
      this.isConnecting = true;
      
      if (this.isCapacitor) {
        // --- MOBILE (Capacitor) FLOW ---
        // 1. Try BLE (Bluetooth Low Energy) with 10s timeout
        this.setStatus("Inicializando Bluetooth LE...");
        let bleSuccess = false;
        try {
          const bleTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('BLE connection timeout')), 10000)
          );

          await Promise.race([
            (async () => {
              await BleClient.initialize();
          
          this.setStatus("Buscando dispositivos BLE...");
          // This will open a native picker in Android
          const device = await BleClient.requestDevice({
            services: [], 
            optionalServices: OBD_SERVICE_UUIDS
          }).catch(e => {
            console.log("BLE scan cancelled or failed:", e);
            return null;
          });
          
          if (device) {
            this.bleDeviceId = device.deviceId;
            this.setStatus(`Conectando a ${device.name || this.bleDeviceId}...`);
            await BleClient.connect(this.bleDeviceId);
            
            this.setStatus("Descubriendo servicios...");
            const services = await BleClient.getServices(this.bleDeviceId);
            
            for (const service of services) {
              if (OBD_SERVICE_UUIDS.includes(service.uuid.toLowerCase())) {
                this.activeServiceUuid = service.uuid;
                for (const char of service.characteristics) {
                  const uuidLower = char.uuid.toLowerCase();
                  if (OBD_CHARACTERISTIC_UUIDS.includes(uuidLower)) {
                    if (char.properties.write || char.properties.writeWithoutResponse) {
                      if (!this.activeCharUuid) this.activeCharUuid = char.uuid;
                    }
                    if (char.properties.notify || char.properties.indicate) {
                      this.bleNotifyCharUuid = char.uuid;
                    }
                  }
                }
                if (!this.activeCharUuid) {
                  for (const char of service.characteristics) {
                    if (char.properties.write || char.properties.writeWithoutResponse) {
                      this.activeCharUuid = char.uuid;
                      break;
                    }
                  }
                }
                if (!this.bleNotifyCharUuid) {
                  for (const char of service.characteristics) {
                    if (char.properties.notify || char.properties.indicate) {
                      this.bleNotifyCharUuid = char.uuid;
                      break;
                    }
                  }
                }
              }
              if (this.activeServiceUuid) break;
            }

            if (!this.activeServiceUuid && services.length > 0) {
               const firstService = services.find(s => s.characteristics.length > 0);
               if (firstService) {
                 this.activeServiceUuid = firstService.uuid;
                 for (const char of firstService.characteristics) {
                   if (char.properties.write || char.properties.writeWithoutResponse) this.activeCharUuid = char.uuid;
                   if (char.properties.notify || char.properties.indicate) this.bleNotifyCharUuid = char.uuid;
                 }
                 if (!this.activeCharUuid) this.activeCharUuid = firstService.characteristics[0].uuid;
                 if (!this.bleNotifyCharUuid) this.bleNotifyCharUuid = this.activeCharUuid;
               }
            }

            if (!this.bleNotifyCharUuid) this.bleNotifyCharUuid = this.activeCharUuid;

            if (this.activeServiceUuid && this.activeCharUuid && this.bleNotifyCharUuid) {
              await BleClient.startNotifications(
                this.bleDeviceId,
                this.activeServiceUuid,
                this.bleNotifyCharUuid,
                (event) => {
                  const chunk = new TextDecoder().decode(event.value);
                  this.bleDataBuffer += chunk;
                  if (this.bleDataResolver && this.bleDataBuffer.includes(this.bleDataTarget)) {
                    this.bleDataResolver();
                  }
                }
              );
              this.connectionType = 'ble';
              this.setStatus("Conectado vía BLE. Inicializando ELM327...");
              await this.initElm();
              this.isConnected = true;
              this.isConnecting = false;
              this.restartPolling();
              this.setStatus("Conexión establecida correctamente (BLE).");
              bleSuccess = true;
            }
          }
        })(),
        bleTimeout
      ]);
    } catch (bleErr) {
      console.warn("BLE no disponible o timeout:", bleErr);
      if (this.bleDeviceId) {
        try { await BleClient.stopNotifications(this.bleDeviceId, this.activeServiceUuid, this.bleNotifyCharUuid); } catch (e) {}
        try { await BleClient.disconnect(this.bleDeviceId); } catch (e) {}
      }
      this.bleDeviceId = null;
      this.activeServiceUuid = null;
      this.activeCharUuid = null;
      this.bleNotifyCharUuid = null;
      this.isConnecting = false;
    }

    if (bleSuccess) return true;

    // 2. Try Bluetooth Classic (SPP) - Most common for ELM327
    this.isConnecting = true;
    this.setStatus("Buscando dispositivos Bluetooth Clásicos (vinculados)...");
        return new Promise((resolve) => {
          const classicTimeout = setTimeout(() => {
            this.setStatus("Timeout. ELM327 no responde. ¿Otra app conectada?");
            this.isConnecting = false;
            resolve(false);
          }, 15000);

          BluetoothSerial.list().then(async (devices) => {
            console.log("Dispositivos vinculados:", devices);
            // Search by Name
             const obd = devices.find(d => {
              const name = (d.name || "").toUpperCase();
              return name.includes('OBD') || 
                     name.includes('ELM') || 
                     name.includes('CAR') || 
                     name.includes('V-LINK') ||
                     name.includes('VGATE');
            });
            
            if (obd) {
              this.setStatus(`Conectando a ${obd.name || obd.id}...`);
              this.connectionType = 'classic';
              BluetoothSerial.connect(obd.id).subscribe(async () => {
                clearTimeout(classicTimeout);
                this.setStatus("Conectado vía Bluetooth Serial. Inicializando...");
                this.isConnected = true;
                this.isConnecting = false;
                this.restartPolling();
                this.bleDeviceId = null;
                await this.initElm();
                resolve(true);
              }, (err) => {
                clearTimeout(classicTimeout);
                this.setStatus(`Error al conectar a ${obd.name}: ${err}`);
                this.isConnecting = false;
                resolve(false);
              });
            } else {
              clearTimeout(classicTimeout);
              this.setStatus("No se encontró OBDII en vinculados. Por favor, realiza la vinculación manual en los ajustes de Android.");
              this.isConnecting = false;
              resolve(false);
            }
          }).catch(err => {
            clearTimeout(classicTimeout);
            this.setStatus(`Error listando: ${err}`);
            this.isConnecting = false;
            resolve(false);
          });
        });

      } else {
        // --- PC (Web Serial) FLOW ---
        if (!navigator.serial) {
          throw new Error("Tu navegador no soporta Web Serial. Usa Chrome o Edge.");
        }

        this.setStatus("Selecciona el puerto COM del OBDII...");
        this.port = await navigator.serial.requestPort();
        
        this.setStatus("Abriendo puerto (38400 baud)...");
        await this.port.open({ baudRate: 38400 });
        
        this.writer = this.port.writable.getWriter();
        this.reader = this.port.readable.getReader();
        
        this.currentHeader = null;
        this.setStatus("Inicializando ELM327...");
        await this.initElm();
        
        this.setStatus("Conectado vía Serial.");
        this.isConnected = true;
        this.isConnecting = false;
        this.restartPolling();
        return true;
      }
    } catch (err) {
      this.setStatus(`Error: ${err.message || err}`);
      console.error('Error al conectar:', err);
      this.isConnecting = false;
      return false;
    }
  }

  async connectWifi(ip, port) {
    this.isConnecting = true;
    this.connectionType = 'wifi';
    this.wifiConfig = { ip, port };
    
    try {
      this.setStatus(`Intentando conectar a ${ip}:${port}...`);
      
      // On Web, raw TCP is not possible. We can try to ping or just warn.
      if (!this.isCapacitor) {
         this.setStatus("Error: Los navegadores no permiten conexiones TCP directas.");
         throw new Error("El modo Wi-Fi solo funciona en la App móvil (Android/iOS). En PC usa un adaptador Bluetooth o USB.");
      }

      // Capacitor TCP logic would go here
      // For now, let's keep it as an error to be honest with the user
      throw new Error("Conexión Wi-Fi aún no implementada para Capacitor.");

    } catch (err) {
      this.setStatus(err.message);
      this.isConnecting = false;
      return false;
    }
  }

  async initElm() {
    const initCmds = [
      'ATZ', 'ATE0', 'ATL0', 'ATH0', 'ATAT1', 'ATSP0'
    ];
    
    for (const cmd of initCmds) {
      this.setStatus(`ELM327: ${cmd}...`);
      await this.write(cmd);
      const resp = await this.readUntil('>');
      if (!resp || resp.trim() === '' || resp.includes('?') || resp.toUpperCase().includes('ERROR') || resp.includes('STOPPED')) {
        throw new Error(`ELM327 no respondió a ${cmd}: "${resp.trim() || '<timeout>'}"`);
      }
    }
    this.setStatus('ELM327 inicializado correctamente');
  }

  async write(cmd) {
    console.log(`> OBD TX: ${cmd}`);
    if (this.isCapacitor && this.connectionType !== 'wifi') {
      if (this.connectionType === 'ble') {
        this.bleDataBuffer = '';
        const data = new TextEncoder().encode(cmd + '\r');
        await BleClient.write(this.bleDeviceId, this.activeServiceUuid, this.activeCharUuid, data);
      } else {
        await BluetoothSerial.write(cmd + '\r');
      }
    } else if (this.writer) {
      const encoder = new TextEncoder();
      await this.writer.write(encoder.encode(cmd + '\r'));
    }
  }

  async readUntil(char) {
    const decoder = new TextDecoder();
    let response = '';

    try {
      if (this.isCapacitor && this.connectionType === 'ble') {
        this.bleDataTarget = char;
        return new Promise((resolve, reject) => {
          this.bleDataResolver = () => {
            clearTimeout(this.bleTimeoutId);
            this.bleDataResolver = null;
            response = this.bleDataBuffer;
            this.bleDataBuffer = '';
            console.log(`< OBD RX FULL: ${response.trim()}`);
            resolve(response);
          };
          this.bleTimeoutId = setTimeout(() => {
            this.bleDataResolver = null;
            this.bleDataBuffer = '';
            reject(new Error('Timeout de lectura OBD'));
          }, 5000);
        }).catch(err => {
          console.warn(err.message);
          return response || '';
        });
      }

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout de lectura OBD')), 5000);
      });

      const readPromise = (async () => {
        if (this.isCapacitor && this.connectionType === 'classic') {
          while (true) {
            const data = await BluetoothSerial.readUntil(char);
            response = data;
            if (response.includes(char)) break;
          }
        } else {
          while (true) {
            const { value, done } = await this.reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            response += chunk;
            if (response.includes(char)) break;
          }
        }
        return response;
      })();

      const result = await Promise.race([readPromise, timeoutPromise]);
      console.log(`< OBD RX FULL: ${result.trim()}`);
      return result;
    } catch (err) {
      console.warn(err.message);
      return response;
    }
  }

  setPids(pids) {
    this.selectedPids = pids;
  }

  generateMockData(pid) {
    // Generate realistic values based on PID unit or name
    const now = Date.now();
    if (pid.Units === 'g') return (15 + Math.sin(now/10000)*5).toFixed(2);
    if (pid.Units === 'mbar') return (20 + Math.sin(now/5000)*10).toFixed(0);
    if (pid.Units === '°C' || pid.Units === '*C') return (200 + Math.sin(now/20000)*150).toFixed(1);
    if (pid.Units === 'RPM') return (800 + Math.random()*50).toFixed(0);
    if (pid.Units === 'V') return (13.8 + Math.random()*0.4).toFixed(1);
    if (pid.Units === 'km') return (450 + (now % 1000) / 10).toFixed(0);
    if (pid.Equation.includes('{A:')) return (Math.random() > 0.8 ? 1 : 0);
    return (Math.random() * 100).toFixed(1);
  }

  startPolling(callback) {
    this.onDataCallback = callback;
    if (this.pollingTimeout) clearTimeout(this.pollingTimeout);

    const cycle = async () => {
      if (this.isConnecting) {
        this.pollingTimeout = setTimeout(cycle, 2000);
        return;
      }

      this.isPollingCycleActive = true;

      const grouped = {};
      for (const pid of this.selectedPids) {
        const header = pid.Header || '7E0';
        if (!grouped[header]) grouped[header] = [];
        grouped[header].push(pid);
      }

      for (const [header, pids] of Object.entries(grouped)) {
        if (!this.isConnected) {
          for (const pid of pids) {
            const mockVal = this.generateMockData(pid);
            if (this.onDataCallback) this.onDataCallback(pid.ModeAndPID, mockVal);
          }
          continue;
        }

        try {
          if (this.currentHeader !== header) {
            await this.write(`ATSH ${header}`);
            await this.readUntil('>');
            this.currentHeader = header;
          }

          for (const pid of pids) {
            if (!this.isConnected) break;
            try {
              const rawResponse = await this.pollPid(pid.ModeAndPID);
              if (!rawResponse || rawResponse.includes('NO DATA') || rawResponse.includes('ERROR') || rawResponse.includes('?')) {
                console.warn(`OBD Error para ${pid.name}: ${rawResponse}`);
                continue;
              }
              const value = this.parseResponse(rawResponse, pid.Equation, pid);
              if (this.onDataCallback) this.onDataCallback(pid.ModeAndPID, value);
            } catch (err) {
              console.error(`Error polling ${pid.name}:`, err);
            }
            await new Promise(r => setTimeout(r, 100));
          }
        } catch (err) {
          console.error(`Error switching to header ${header}:`, err);
        }
      }

      this.isPollingCycleActive = false;
      this.pollingTimeout = setTimeout(cycle, 2000);
    };

    this.pollingTimeout = setTimeout(cycle, 500);
  }

  async pollPid(pidCode) {
    await this.write(pidCode);
    const resp = await this.readUntil('>');
    // Clean echoing and prompts
    return resp.replace(pidCode, '').replace(/>/g, '').trim();
  }

  restartPolling() {
    if (this.onDataCallback && !this.pollingTimeout) {
      this.startPolling(this.onDataCallback);
    }
  }

  async disconnect() {
    if (this.pollingTimeout) clearTimeout(this.pollingTimeout);
    this.pollingTimeout = null;
    this.isPollingCycleActive = false;
    this.bleDataResolver = null;
    this.bleDataTarget = '';
    this.bleDataBuffer = '';
    if (this.bleTimeoutId) clearTimeout(this.bleTimeoutId);

    try {
      if (this.connectionType === 'ble' && this.bleDeviceId) {
        try { await BleClient.stopNotifications(this.bleDeviceId, this.activeServiceUuid, this.bleNotifyCharUuid); } catch (e) {}
        try { await BleClient.disconnect(this.bleDeviceId); } catch (e) {}
      }
      if (this.connectionType === 'classic') {
        try { await BluetoothSerial.disconnect(); } catch (e) {}
      }
      if (this.writer) {
        try { this.writer.releaseLock(); } catch (e) {}
        this.writer = null;
      }
      if (this.reader) {
        try { this.reader.releaseLock(); } catch (e) {}
        this.reader = null;
      }
      if (this.port) {
        try { await this.port.close(); } catch (e) {}
        this.port = null;
      }
    } catch (e) {
      console.warn('Error during disconnect cleanup:', e);
    }

    this.bleDeviceId = null;
    this.activeServiceUuid = null;
    this.activeCharUuid = null;
    this.bleNotifyCharUuid = null;
    this.currentHeader = null;
    this.isConnected = false;
    this.connectionType = 'serial';
    this.setStatus('Desconectado');
  }

  stopPolling() {
    if (this.pollingTimeout) clearTimeout(this.pollingTimeout);
    this.pollingTimeout = null;
    this.isPollingCycleActive = false;
  }

  parseResponse(raw, equation, pid) {
    // 1. Clean input: remove echo, prompts, and line breaks
    const clean = raw.replace(/[\r\n]/g, ' ').replace(/>/g, '').trim();
    const parts = clean.split(' ').filter(p => p.length === 2);
    
    if (parts.length < 3) return 0;

    // 2. Identify the response start byte (Mode + 0x40)
    // 01 -> 41 (Standard)
    // 19 -> 59 (Freeze Frame/Error records)
    // 21 -> 61 (Extended Renault)
    // 22 -> 62 (Extended Renault/UDDS)
    let dataStartIndex = parts.findIndex(p => p === '62' || p === '41' || p === '61' || p === '59');
    
    if (dataStartIndex === -1) {
      return 0;
    }

    const startByte = parts[dataStartIndex];
    
    // 3. Skip header: 
    // Mode 01 (41) -> 1 byte PID (Skip start byte + 1 byte PID = 2)
    // Modes 19, 21, 22 -> 2 bytes PID (Skip start byte + 2 bytes PID = 3)
    const skipBytes = (startByte === '41') ? 2 : 3;
    
    const dataStart = dataStartIndex + skipBytes; 
    const bytes = parts.slice(dataStart).map(b => parseInt(b, 16));
    
    // 4. Map variables for equation (A, B, C, D, E, F, G, H)
    const vars = {
      A: bytes[0] || 0, B: bytes[1] || 0, C: bytes[2] || 0, D: bytes[3] || 0,
      E: bytes[4] || 0, F: bytes[5] || 0, G: bytes[6] || 0, H: bytes[7] || 0
    };

    try {
      let sanitizedEq = equation;
      
      // Handle bitwise notation from CSV: {A:0} -> bit 0 of variable A
      sanitizedEq = sanitizedEq.replace(/{([A-H]):(\d+)}/g, (match, byte, bit) => {
        return `((${vars[byte]} >> ${bit}) & 1)`;
      });
      
      // Replace variables A-H with their values
      sanitizedEq = sanitizedEq.replace(/\b([A-H])\b/g, (match) => vars[match]);
      
      // Some Renault equations use & for bitwise, new Function handles it natively
      const result = Math.abs(new Function(`return ${sanitizedEq}`)());
      
      // 5. Format based on unit or type
      if (typeof result !== 'number' || isNaN(result)) return '--';
      
      if (pid?.Units === 'g') return result.toFixed(2);
      if (pid?.Units === 'V') return result.toFixed(2);
      if (pid?.Units === '*C' || pid?.Units === '°C') return result.toFixed(1);
      if (pid?.Units === 'RPM') return result.toFixed(0);
      
      return result % 1 === 0 ? result.toString() : result.toFixed(1);
    } catch (e) {
      console.error("Error parsing equation:", equation, "Variables:", vars, e);
      return '--';
    }
  }
}

export default new ObdService();
