/**
 * Base de datos clínica y anatómica para KineElectro 3D
 */

const MUSCLE_DEFINITIONS = {
  // Tronco y Pecho
  'pectoral_major_l': {
    name: 'Pectoral Mayor Izquierdo',
    zone: 'Pecho / Tronco Superior',
    function: 'Aducción y rotación interna del brazo en la articulación del hombro.',
    motorPointTip: 'En el vientre muscular medio, 3-4 cm bajo la clavícula, línea medioclavicular.',
    camPos: { x: -0.6, y: 1.15, z: 2.2 },
    target: { x: -0.3, y: 1.15, z: 0.1 }
  },
  'pectoral_major_r': {
    name: 'Pectoral Mayor Derecho',
    zone: 'Pecho / Tronco Superior',
    function: 'Aducción y rotación interna del brazo en la articulación del hombro.',
    motorPointTip: 'En el vientre muscular medio, 3-4 cm bajo la clavícula, línea medioclavicular.',
    camPos: { x: 0.6, y: 1.15, z: 2.2 },
    target: { x: 0.3, y: 1.15, z: 0.1 }
  },
  'rectus_abdominis': {
    name: 'Recto Abdominal',
    zone: 'Abdomen / Tronco',
    function: 'Flexión de la columna vertebral y compresión de las vísceras abdominales.',
    motorPointTip: 'A 2 cm lateral al ombligo para fibras medias; 3 cm superior para fibras altas.',
    camPos: { x: 0, y: 0.8, z: 2.4 },
    target: { x: 0, y: 0.8, z: 0.1 }
  },

  // Espalda y Hombros
  'trapezius_l': {
    name: 'Trapecio Superior Izquierdo',
    zone: 'Cuello y Espalda Superior',
    function: 'Elevación de la escápula, inclinación homolateral y rotación contralateral de cabeza.',
    motorPointTip: 'Punto medio entre la apófisis espinosa C7 y el acromion (zona gatillo clásica).',
    camPos: { x: -0.8, y: 1.5, z: -2.0 },
    target: { x: -0.3, y: 1.35, z: -0.1 }
  },
  'trapezius_r': {
    name: 'Trapecio Superior Derecho',
    zone: 'Cuello y Espalda Superior',
    function: 'Elevación de la escápula, inclinación homolateral y rotación contralateral de cabeza.',
    motorPointTip: 'Punto medio entre la apófisis espinosa C7 y el acromion.',
    camPos: { x: 0.8, y: 1.5, z: -2.0 },
    target: { x: 0.3, y: 1.35, z: -0.1 }
  },
  'latissimus_dorsi_l': {
    name: 'Dorsal Ancho Izquierdo',
    zone: 'Espalda Media y Baja',
    function: 'Extensión, aducción y rotación medial del hombro.',
    motorPointTip: 'Borde lateral de la espalda, unos 5 cm bajo el ángulo inferior de la escápula.',
    camPos: { x: -1.2, y: 0.9, z: -2.2 },
    target: { x: -0.4, y: 0.9, z: -0.1 }
  },
  'latissimus_dorsi_r': {
    name: 'Dorsal Ancho Derecho',
    zone: 'Espalda Media y Baja',
    function: 'Extensión, aducción y rotación medial del hombro.',
    motorPointTip: 'Borde lateral de la espalda, unos 5 cm bajo el ángulo inferior de la escápula.',
    camPos: { x: 1.2, y: 0.9, z: -2.2 },
    target: { x: 0.4, y: 0.9, z: -0.1 }
  },
  'lumbar_spine': {
    name: 'Paravertebrales Lumbares (Zona Lumbar)',
    zone: 'Espalda Baja',
    function: 'Extensión y estabilización de la columna lumbar.',
    motorPointTip: 'A 2-3 cm a cada lado de la columna lumbar entre L2 y L5.',
    camPos: { x: 0, y: 0.7, z: -2.3 },
    target: { x: 0, y: 0.7, z: -0.1 }
  },

  // Extremidades Superiores
  'deltoid_l': {
    name: 'Deltoides Izquierdo',
    zone: 'Hombro',
    function: 'Abducción del brazo (porción media), flexión (anterior) y extensión (posterior).',
    motorPointTip: 'Porción media: 2-3 traveses de dedo por debajo del borde lateral del acromion.',
    camPos: { x: -1.6, y: 1.2, z: 1.5 },
    target: { x: -0.85, y: 1.25, z: 0 }
  },
  'deltoid_r': {
    name: 'Deltoides Derecho',
    zone: 'Hombro',
    function: 'Abducción del brazo (porción media), flexión (anterior) y extensión (posterior).',
    motorPointTip: 'Porción media: 2-3 traveses de dedo por debajo del borde lateral del acromion.',
    camPos: { x: 1.6, y: 1.2, z: 1.5 },
    target: { x: 0.85, y: 1.25, z: 0 }
  },
  'biceps_l': {
    name: 'Bíceps Braquial Izquierdo',
    zone: 'Brazo',
    function: 'Flexión de codo y potente supinador del antebrazo.',
    motorPointTip: 'Centro del vientre muscular en la cara anterior del brazo.',
    camPos: { x: -1.7, y: 0.9, z: 1.4 },
    target: { x: -0.9, y: 0.9, z: 0.05 }
  },
  'biceps_r': {
    name: 'Bíceps Braquial Derecho',
    zone: 'Brazo',
    function: 'Flexión de codo y potente supinador del antebrazo.',
    motorPointTip: 'Centro del vientre muscular en la cara anterior del brazo.',
    camPos: { x: 1.7, y: 0.9, z: 1.4 },
    target: { x: 0.9, y: 0.9, z: 0.05 }
  },

  // Extremidades Inferiores
  'quadriceps_l': {
    name: 'Cuádriceps Izquierdo (Vasto Medial y Recto)',
    zone: 'Muslo / Rodilla',
    function: 'Extensión de rodilla y estabilización de la rótula.',
    motorPointTip: 'Vasto medial: 4-5 cm proximal y medial al borde superomedial de la rótula.',
    camPos: { x: -0.8, y: -0.1, z: 2.2 },
    target: { x: -0.35, y: -0.1, z: 0.1 }
  },
  'quadriceps_r': {
    name: 'Cuádriceps Derecho (Vasto Medial y Recto)',
    zone: 'Muslo / Rodilla',
    function: 'Extensión de rodilla y estabilización de la rótula.',
    motorPointTip: 'Vasto medial: 4-5 cm proximal y medial al borde superomedial de la rótula.',
    camPos: { x: 0.8, y: -0.1, z: 2.2 },
    target: { x: 0.35, y: -0.1, z: 0.1 }
  },
  'gluteus_l': {
    name: 'Glúteo Mayor Izquierdo',
    zone: 'Cadera / Pelvis',
    function: 'Extensión potente de cadera y rotación externa.',
    motorPointTip: 'Cuadrante superoexterno del glúteo, sobre el vientre muscular principal.',
    camPos: { x: -0.9, y: 0.2, z: -2.3 },
    target: { x: -0.35, y: 0.25, z: -0.1 }
  },
  'gluteus_r': {
    name: 'Glúteo Mayor Derecho',
    zone: 'Cadera / Pelvis',
    function: 'Extensión potente de cadera y rotación externa.',
    motorPointTip: 'Cuadrante superoexterno del glúteo, sobre el vientre muscular principal.',
    camPos: { x: 0.9, y: 0.2, z: -2.3 },
    target: { x: 0.35, y: 0.25, z: -0.1 }
  },
  'gastrocnemius_l': {
    name: 'Gemelos / Pantorrilla Izquierda',
    zone: 'Pierna / Tobillo',
    function: 'Flexión plantar de tobillo y flexión accesoria de rodilla.',
    motorPointTip: 'Vientre carnoso superior de la cabeza medial o lateral del gastrocnemio.',
    camPos: { x: -0.7, y: -0.8, z: -2.0 },
    target: { x: -0.3, y: -0.8, z: -0.1 }
  },
  'gastrocnemius_r': {
    name: 'Gemelos / Pantorrilla Derecha',
    zone: 'Pierna / Tobillo',
    function: 'Flexión plantar de tobillo y flexión accesoria de rodilla.',
    motorPointTip: 'Vientre carnoso superior de la cabeza medial o lateral del gastrocnemio.',
    camPos: { x: 0.7, y: -0.8, z: -2.0 },
    target: { x: 0.3, y: -0.8, z: -0.1 }
  }
};

const CLINICAL_PRESETS = [
  {
    id: 'lumbalgia_tens',
    title: 'Lumbalgia Mecánica / Dolor Lumbar (TENS)',
    muscleId: 'lumbar_spine',
    type: 'TENS Convencional (Alivio del dolor)',
    parameters: {
      frequency: 100, // Hz
      pulseWidth: 80, // µs
      duration: 25, // minutos
      intensity: 'Sensación de hormigueo agradable, sin contracción dolorosa'
    },
    instructions: 'Colocar los electrodos a ambos lados de la columna lumbar (L2-L5). Canal 1 lado izquierdo, Canal 2 lado derecho o cruzados para dolor difuso.',
    electrodes: [
      { id: 'el-1', channel: 1, polarity: 'positive', label: 'CH1 (+)', color: '#ef4444', pos: { x: -0.22, y: 0.85, z: -0.21 }, normal: { x: 0, y: 0, z: -1 } },
      { id: 'el-2', channel: 1, polarity: 'negative', label: 'CH1 (-)', color: '#111827', pos: { x: -0.22, y: 0.55, z: -0.21 }, normal: { x: 0, y: 0, z: -1 } },
      { id: 'el-3', channel: 2, polarity: 'positive', label: 'CH2 (+)', color: '#3b82f6', pos: { x: 0.22, y: 0.85, z: -0.21 }, normal: { x: 0, y: 0, z: -1 } },
      { id: 'el-4', channel: 2, polarity: 'negative', label: 'CH2 (-)', color: '#f59e0b', pos: { x: 0.22, y: 0.55, z: -0.21 }, normal: { x: 0, y: 0, z: -1 } }
    ]
  },
  {
    id: 'cuadriceps_vasto_ems',
    title: 'Reactivación de Vasto Interno Cuádriceps (EMS)',
    muscleId: 'quadriceps_r',
    type: 'EMS / Corrientes Rusas (Fortalecimiento)',
    parameters: {
      frequency: 50, // Hz
      pulseWidth: 250, // µs
      duration: 20, // minutos
      intensity: 'Contracción muscular visible y sostenida pero tolerable'
    },
    instructions: 'Colocar el electrodo activo (+) directamente sobre el punto motor del Vasto Medial (4 cm arriba del borde interno de la rótula). El electrodo de cierre (-) en el vientre proximal del cuádriceps.',
    electrodes: [
      { id: 'el-1', channel: 1, polarity: 'positive', label: 'CH1 (+)', color: '#ef4444', pos: { x: 0.24, y: -0.25, z: 0.22 }, normal: { x: 0, y: 0, z: 1 } },
      { id: 'el-2', channel: 1, polarity: 'negative', label: 'CH1 (-)', color: '#111827', pos: { x: 0.35, y: 0.15, z: 0.22 }, normal: { x: 0, y: 0, z: 1 } }
    ]
  },
  {
    id: 'cervical_trapecio_tens',
    title: 'Contractura Cervical / Trapecio Superior (TENS)',
    muscleId: 'trapezius_r',
    type: 'TENS Acupuntura / Burst (Relajación)',
    parameters: {
      frequency: 4, // Hz
      pulseWidth: 200, // µs
      duration: 20, // minutos
      intensity: 'Pulsaciones rítmicas visibles de baja frecuencia'
    },
    instructions: 'Aplicar el electrodo positivo sobre la banda tensa del trapecio superior. El negativo sobre la fosa supraespinosa o ángulo de la escápula.',
    electrodes: [
      { id: 'el-1', channel: 1, polarity: 'positive', label: 'CH1 (+)', color: '#ef4444', pos: { x: 0.35, y: 1.35, z: -0.15 }, normal: { x: 0.2, y: 0.4, z: -0.9 } },
      { id: 'el-2', channel: 1, polarity: 'negative', label: 'CH1 (-)', color: '#111827', pos: { x: 0.55, y: 1.25, z: -0.18 }, normal: { x: 0.3, y: 0.2, z: -0.9 } }
    ]
  },
  {
    id: 'hombro_deltoides_tens',
    title: 'Tendinitis de Manguito / Dolor de Hombro (TENS)',
    muscleId: 'deltoid_l',
    type: 'TENS Convencional (Antiinflamatorio/Analgesia)',
    parameters: {
      frequency: 80, // Hz
      pulseWidth: 100, // µs
      duration: 25, // minutos
      intensity: 'Hormigueo intenso pero confortable'
    },
    instructions: 'Rodear la zona dolorosa del hombro: colocar polo positivo en el vientre lateral del deltoides y negativo en el deltoides anterior.',
    electrodes: [
      { id: 'el-1', channel: 1, polarity: 'positive', label: 'CH1 (+)', color: '#ef4444', pos: { x: -0.85, y: 1.22, z: 0.05 }, normal: { x: -0.9, y: 0, z: 0.3 } },
      { id: 'el-2', channel: 1, polarity: 'negative', label: 'CH1 (-)', color: '#111827', pos: { x: -0.72, y: 1.18, z: 0.22 }, normal: { x: -0.7, y: 0, z: 0.7 } }
    ]
  }
];

const INITIAL_REQUESTS = [
  {
    id: 'req-1',
    patientName: 'Martín Almada',
    date: 'Hoy, 19:30',
    zone: 'Espalda Baja',
    muscleId: 'lumbar_spine',
    status: 'pending', // pending, completed
    symptom: 'Dolor punzante en la zona lumbar al estar sentado más de 30 minutos.',
    goal: 'Alivio del dolor (TENS)',
    painLevel: 7
  },
  {
    id: 'req-2',
    patientName: 'Sofía Valenzuela',
    date: 'Hoy, 18:15',
    zone: 'Muslo / Rodilla',
    muscleId: 'quadriceps_r',
    status: 'completed',
    symptom: 'Siento debilidad en la pierna derecha luego de la cirugía de meniscos.',
    goal: 'Fortalecer cuádriceps (EMS)',
    painLevel: 4,
    prescription: {
      title: 'Protocolo Fortalecimiento Vasto Medial',
      type: 'EMS / Corrientes Rusas',
      frequency: 50,
      pulseWidth: 250,
      duration: 20,
      kineNotes: 'Limpiar la piel con alcohol antes de colocar los electrodos. Subir la potencia hasta ver contracción sin que cause dolor agudo.',
      electrodes: [
        { id: 'el-1', channel: 1, polarity: 'positive', label: 'CH1 (+)', color: '#ef4444', pos: { x: 0.24, y: -0.25, z: 0.22 }, normal: { x: 0, y: 0, z: 1 } },
        { id: 'el-2', channel: 1, polarity: 'negative', label: 'CH1 (-)', color: '#111827', pos: { x: 0.35, y: 0.15, z: 0.22 }, normal: { x: 0, y: 0, z: 1 } }
      ]
    }
  }
];

class KineDataStore {
  constructor() {
    this.STORAGE_KEY = 'kine_electro_3d_data_v1';
    this.state = this.load();
  }

  load() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Error reading from localStorage, using initial mock data', e);
    }
    return {
      currentRole: 'kinesiologo', // 'kinesiologo' o 'paciente'
      activePatientId: 'req-2',
      requests: INITIAL_REQUESTS,
      customPrescriptions: {}
    };
  }

  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  }

  getRequests() {
    return this.state.requests;
  }

  getRequestById(id) {
    return this.state.requests.find(r => r.id === id);
  }

  createRequest(newReq) {
    const req = {
      id: 'req-' + Date.now(),
      date: 'Recién',
      status: 'pending',
      ...newReq
    };
    this.state.requests.unshift(req);
    this.save();
    return req;
  }

  updatePrescription(reqId, prescriptionData) {
    const req = this.getRequestById(reqId);
    if (req) {
      req.status = 'completed';
      req.prescription = {
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ...prescriptionData
      };
      this.save();
      return true;
    }
    return false;
  }

  setRole(role) {
    this.state.currentRole = role;
    this.save();
  }

  getRole() {
    return this.state.currentRole || 'kinesiologo';
  }

  setActivePatient(patientId) {
    this.state.activePatientId = patientId;
    this.save();
  }

  getActivePatient() {
    return this.getRequestById(this.state.activePatientId) || this.state.requests[0];
  }
}

// Instancia global
window.KineStore = new KineDataStore();
window.MUSCLE_DEFINITIONS = MUSCLE_DEFINITIONS;
window.CLINICAL_PRESETS = CLINICAL_PRESETS;
