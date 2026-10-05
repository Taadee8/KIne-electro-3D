/**
 * Gestor de Comunicación Web Serial (USB) para ESP32 & PIC16F887
 * KineElectro 3D
 * 
 * Permite la conexión directa por cable USB entre el navegador web y el ESP32
 * utilizando la Web Serial API nativa (Google Chrome, Edge, Brave, Opera).
 */

class Esp32SerialManager {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.isConnected = false;
    this.keepReading = false;
    this.baudRate = 115200;

    this.onStateChangeCallbacks = [];
    this.onDataSentCallbacks = [];
    this.onDataReceivedCallbacks = [];

    // Monitorear desconexión física del cable USB
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      navigator.serial.addEventListener('disconnect', (event) => {
        if (this.port === event.target) {
          this.handleDisconnect('Cable USB desconectado');
        }
      });
    }
  }

  isSupported() {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
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

  async connect(baudRate = 115200) {
    if (!this.isSupported()) {
      throw new Error('Tu navegador no soporta Web Serial API. Abre la página en Google Chrome, Microsoft Edge, Opera o Brave en tu PC.');
    }

    try {
      this.notifyState('connecting', 'Seleccionando puerto COM...');

      // El navegador abre una ventana limpia para elegir el puerto COM del ESP32
      this.port = await navigator.serial.requestPort();
      this.baudRate = baudRate;

      this.notifyState('connecting', `Abriendo puerto a ${this.baudRate} baudios...`);
      await this.port.open({ baudRate: this.baudRate });

      this.isConnected = true;
      const portInfo = this.port.getInfo();
      const infoText = portInfo.usbVendorId ? `USB COM (VID:${portInfo.usbVendorId.toString(16)})` : 'Puerto Serie USB';
      
      this.notifyState('connected', infoText);

      // Iniciar bucle de lectura en segundo plano
      this.startReading();

      return true;
    } catch (error) {
      this.isConnected = false;
      this.notifyState('disconnected', error.message || 'Cancelado');
      throw error;
    }
  }

  async startReading() {
    this.keepReading = true;
    while (this.port && this.port.readable && this.keepReading) {
      try {
        const textDecoder = new TextDecoderStream();
        const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
        this.reader = textDecoder.readable.getReader();

        let incomingText = '';
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) {
            incomingText += value;
            if (incomingText.includes('\n')) {
              const lines = incomingText.split('\n');
              for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].trim();
                if (line) {
                  this.onDataReceivedCallbacks.forEach(cb => cb(line));
                }
              }
              incomingText = lines[lines.length - 1];
            }
          }
        }
      } catch (err) {
        if (this.keepReading) {
          console.warn('Lectura serie interrumpida', err);
        }
        break;
      }
    }
  }

  async disconnect() {
    this.keepReading = false;
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader = null;
      }
      if (this.port) {
        await this.port.close();
      }
    } catch (e) {
      console.warn('Error al cerrar puerto serie', e);
    }
    this.handleDisconnect('Desconectado manualmente');
  }

  handleDisconnect(details = 'Desconectado') {
    this.isConnected = false;
    this.port = null;
    this.reader = null;
    this.notifyState('disconnected', details);
  }

  /**
   * Envía los parámetros por cable USB al ESP32
   * Formato: JSON estructurado para el ESP32 con la trama UART para el PIC16F887
   */
  async sendParameters({ slot = 1, type = 'TENS', frequency = 100, pulseWidth = 100, duration = 20 }) {
    // 1. Trama directa lista para el PIC16F887
    // Formato: SET,<slot>,<tipo>,<frecuencia>,<ancho_pulso>,<tiempo>\n
    const uartFrame = `SET,${slot},${type},${frequency},${pulseWidth},${duration}\n`;

    // 2. Formato JSON completo
    const jsonPayload = {
      cmd: 'SET_PROG',
      slot: parseInt(slot),
      type: type,
      freq: parseInt(frequency),
      pulse: parseInt(pulseWidth),
      time: parseInt(duration),
      uartForPic: uartFrame.trim()
    };

    const textToSend = JSON.stringify(jsonPayload) + '\n';

    if (this.isConnected && this.port && this.port.writable) {
      const writer = this.port.writable.getWriter();
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(textToSend));
      writer.releaseLock();
    }

    // Notificar observadores (para logs y visualización)
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

window.Esp32SerialManager = Esp32SerialManager;
