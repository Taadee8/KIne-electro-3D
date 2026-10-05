/**
 * Gestor de Comunicación Web Bluetooth (BLE) para ESP32 & PIC16F887
 * KineElectro 3D
 */

class Esp32BleManager {
  constructor() {
    // Servicio UART de Nordic estándar para ESP32 BLE
    this.SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
    this.CHAR_RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Escritura hacia ESP32
    this.CHAR_TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Notificaciones desde ESP32

    this.device = null;
    this.server = null;
    this.rxCharacteristic = null;
    this.txCharacteristic = null;
    this.isConnected = false;

    this.onStateChangeCallbacks = [];
    this.onDataSentCallbacks = [];
    this.onDataReceivedCallbacks = [];
  }

  isSupported() {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  onStateChange(cb) {
    this.onStateChangeCallbacks.push(cb);
  }

  onDataSent(cb) {
    this.onDataSentCallbacks.push(cb);
  }

  onDataReceived(cb) {
    this.onDataReceivedCallbacks.push(cb);
  }

  notifyState(state, details = '') {
    this.onStateChangeCallbacks.forEach(cb => cb(state, details));
  }

  async connect() {
    if (!this.isSupported()) {
      throw new Error('Tu navegador no soporta Web Bluetooth API. Usa Google Chrome, Edge o Brave (en HTTPS o localhost).');
    }

    try {
      this.notifyState('connecting', 'Buscando dispositivo ESP32...');

      // Filtros: busca dispositivos con prefijo o servicio UART
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'ESP32' },
          { namePrefix: 'Kine' },
          { namePrefix: 'Electro' }
        ],
        optionalServices: [this.SERVICE_UUID, 'generic_access']
      });

      this.device.addEventListener('gattserverdisconnected', () => {
        this.isConnected = false;
        this.rxCharacteristic = null;
        this.txCharacteristic = null;
        this.notifyState('disconnected', 'Dispositivo desconectado');
      });

      this.notifyState('connecting', `Conectando con ${this.device.name}...`);
      this.server = await this.device.gatt.connect();

      const service = await this.server.getPrimaryService(this.SERVICE_UUID);
      this.rxCharacteristic = await service.getCharacteristic(this.CHAR_RX_UUID);

      try {
        this.txCharacteristic = await service.getCharacteristic(this.CHAR_TX_UUID);
        await this.txCharacteristic.startNotifications();
        this.txCharacteristic.addEventListener('characteristicvaluechanged', (e) => {
          const decoder = new TextDecoder('utf-8');
          const value = decoder.decode(e.target.value);
          this.onDataReceivedCallbacks.forEach(cb => cb(value));
        });
      } catch (err) {
        console.warn('TX Characteristic no disponible o no compatible', err);
      }

      this.isConnected = true;
      this.notifyState('connected', this.device.name || 'ESP32');
      return true;
    } catch (error) {
      this.isConnected = false;
      this.notifyState('disconnected', error.message || 'Error de conexión');
      throw error;
    }
  }

  async disconnect() {
    if (this.device && this.device.gatt.connected) {
      await this.device.gatt.disconnect();
    }
    this.isConnected = false;
    this.rxCharacteristic = null;
    this.txCharacteristic = null;
    this.notifyState('disconnected', 'Desconectado manualmente');
  }

  /**
   * Prepara y envía los parámetros de prescripción al ESP32
   * Formato dual: JSON + Trama delimitada UART para reenviar al PIC16F887
   */
  async sendParameters({ slot = 1, type = 'TENS', frequency = 100, pulseWidth = 100, duration = 20 }) {
    // 1. Trama optimizada UART para PIC16F887 (fácil de parsear en C / Ensamblador)
    // Estructura: SET,<slot>,<tipo>,<frecuencia>,<ancho_pulso>,<tiempo>\n
    // Ejemplo: SET,1,TENS,100,100,20\n
    const uartFrame = `SET,${slot},${type},${frequency},${pulseWidth},${duration}\n`;

    // 2. Objeto JSON estructurado para el ESP32
    const jsonPayload = {
      cmd: 'SET_PROG',
      slot: parseInt(slot), // 1, 2 o 3 (Ranuras EEPROM)
      type: type,
      freq: parseInt(frequency),
      pulse: parseInt(pulseWidth),
      time: parseInt(duration),
      uartForPic: uartFrame.trim()
    };

    const textToSend = JSON.stringify(jsonPayload) + '\n';

    if (this.isConnected && this.rxCharacteristic) {
      const encoder = new TextEncoder();
      const data = encoder.encode(textToSend);
      // Escritura fragmentada si supera los 20 bytes del MTU clásico de BLE
      const CHUNK_SIZE = 20;
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        await this.rxCharacteristic.writeValue(chunk);
      }
    }

    // Notificar a los observadores con ambas tramas (para visualización en pantalla o simulación)
    this.onDataSentCallbacks.forEach(cb => cb({
      json: jsonPayload,
      uartFrame: uartFrame,
      raw: textToSend,
      isSimulated: !this.isConnected
    }));

    return {
      json: jsonPayload,
      uartFrame: uartFrame
    };
  }
}

window.Esp32BleManager = Esp32BleManager;
