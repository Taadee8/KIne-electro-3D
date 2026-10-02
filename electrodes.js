/**
 * Sistema de Electrodos 3D y Conexión de Canales para Three.js
 */

class ElectrodeManager {
  constructor(scene, camera, domElement) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;

    this.electrodes = []; // Array de datos { id, channel, polarity, label, color, pos, normal, group }
    this.cablesGroup = new THREE.Group();
    this.electrodesGroup = new THREE.Group();
    this.scene.add(this.cablesGroup);
    this.scene.add(this.electrodesGroup);

    this.activeChannel = 1; // 1 o 2
    this.activePolarity = 'positive'; // 'positive' (+) o 'negative' (-)
    this.isPlacingMode = false;
    this.onElectrodeChangeCallbacks = [];

    // Texturas de polaridad en caché
    this.textureCache = {};
  }

  onChange(cb) {
    this.onElectrodeChangeCallbacks.push(cb);
  }

  notifyChange() {
    this.onElectrodeChangeCallbacks.forEach(cb => cb(this.getElectrodeData()));
  }

  setPlacingMode(enabled, channel = 1, polarity = 'positive') {
    this.isPlacingMode = enabled;
    this.activeChannel = channel;
    this.activePolarity = polarity;
    if (this.domElement) {
      if (enabled) {
        this.domElement.classList.add('placing-cursor');
      } else {
        this.domElement.classList.remove('placing-cursor');
      }
    }
  }

  getPolarityTexture(polarity, label) {
    const key = `${polarity}_${label}`;
    if (this.textureCache[key]) return this.textureCache[key];

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Fondo circular
    ctx.clearRect(0, 0, 128, 128);
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fillStyle = polarity === 'positive' ? '#ef4444' : '#1e293b';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Símbolo (+ o -)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px Plus Jakarta Sans, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(polarity === 'positive' ? '+' : '−', 64, 60);

    // Texto inferior (CH1 / CH2)
    ctx.font = 'bold 22px Plus Jakarta Sans, Arial, sans-serif';
    ctx.fillText(label.split(' ')[0], 64, 100);

    const texture = new THREE.CanvasTexture(canvas);
    this.textureCache[key] = texture;
    return texture;
  }

  createElectrodeMesh(data) {
    const group = new THREE.Group();
    group.userData = { isElectrode: true, electrodeId: data.id, ...data };

    // 1. Almohadilla adhesiva (Pad rectangular con bordes redondeados)
    const padGeometry = new THREE.CylinderGeometry(0.065, 0.065, 0.015, 32);
    const padMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.1
    });
    const padMesh = new THREE.Mesh(padGeometry, padMaterial);
    padMesh.castShadow = true;
    group.add(padMesh);

    // 2. Anillo de color del canal
    const ringColor = data.channel === 1 
      ? (data.polarity === 'positive' ? 0xef4444 : 0x374151)
      : (data.polarity === 'positive' ? 0x3b82f6 : 0xf59e0b);

    const ringGeometry = new THREE.TorusGeometry(0.055, 0.007, 16, 32);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: ringColor,
      emissive: ringColor,
      emissiveIntensity: 0.4,
      roughness: 0.2
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.009;
    group.add(ringMesh);

    // 3. Broche central de conexión (Snap metálico)
    const snapGeometry = new THREE.CylinderGeometry(0.018, 0.02, 0.02, 16);
    const snapMaterial = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.2
    });
    const snapMesh = new THREE.Mesh(snapGeometry, snapMaterial);
    snapMesh.position.y = 0.015;
    group.add(snapMesh);

    // 4. Disco con etiqueta de polaridad (+ / -)
    const labelTexture = this.getPolarityTexture(data.polarity, data.label);
    const labelGeometry = new THREE.CircleGeometry(0.038, 32);
    const labelMaterial = new THREE.MeshBasicMaterial({
      map: labelTexture,
      transparent: true
    });
    const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
    labelMesh.rotation.x = -Math.PI / 2;
    labelMesh.position.y = 0.012;
    group.add(labelMesh);

    // Posicionamiento y orientación normal a la superficie
    group.position.set(data.pos.x, data.pos.y, data.pos.z);

    if (data.normal) {
      const normal = new THREE.Vector3(data.normal.x, data.normal.y, data.normal.z).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
      group.quaternion.copy(quaternion);
      // Desplazar mínimamente hacia afuera de la piel para evitar z-fighting
      group.position.addScaledVector(normal, 0.008);
    }

    return group;
  }

  addElectrode(data) {
    const id = data.id || 'el-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const electrodeData = {
      id,
      channel: data.channel || this.activeChannel,
      polarity: data.polarity || this.activePolarity,
      label: data.label || `CH${data.channel || this.activeChannel} (${(data.polarity || this.activePolarity) === 'positive' ? '+' : '−'})`,
      color: data.color || (data.channel === 1 ? (data.polarity === 'positive' ? '#ef4444' : '#1f2937') : (data.polarity === 'positive' ? '#3b82f6' : '#f59e0b')),
      pos: { x: data.pos.x, y: data.pos.y, z: data.pos.z },
      normal: data.normal ? { x: data.normal.x, y: data.normal.y, z: data.normal.z } : { x: 0, y: 0, z: 1 }
    };

    const group = this.createElectrodeMesh(electrodeData);
    electrodeData.group = group;
    this.electrodesGroup.add(group);
    this.electrodes.push(electrodeData);

    this.rebuildCables();
    this.notifyChange();
    return electrodeData;
  }

  findElectrodeFromMesh(mesh) {
    let curr = mesh;
    while (curr && curr !== this.scene) {
      if (curr.userData && curr.userData.isElectrode && curr.userData.electrodeId) {
        return this.electrodes.find(e => e.id === curr.userData.electrodeId);
      }
      curr = curr.parent;
    }
    return null;
  }

  findElectrodeNear(pos, threshold = 0.08) {
    if (!pos || !this.electrodes.length) return null;
    let closest = null;
    let minDist = threshold;
    for (const el of this.electrodes) {
      const dx = el.pos.x - pos.x;
      const dy = el.pos.y - pos.y;
      const dz = el.pos.z - pos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < minDist) {
        minDist = dist;
        closest = el;
      }
    }
    return closest;
  }

  removeElectrode(id) {
    const index = this.electrodes.findIndex(e => e.id === id);
    if (index !== -1) {
      const el = this.electrodes[index];
      this.electrodesGroup.remove(el.group);
      this.electrodes.splice(index, 1);
      this.rebuildCables();
      this.notifyChange();
      return el;
    }
    return null;
  }

  clearAll() {
    while (this.electrodesGroup.children.length > 0) {
      this.electrodesGroup.remove(this.electrodesGroup.children[0]);
    }
    this.electrodes = [];
    this.clearCables();
    this.notifyChange();
  }

  loadElectrodes(electrodeList) {
    this.clearAll();
    if (!electrodeList || !electrodeList.length) return;
    electrodeList.forEach(item => {
      this.addElectrode(item);
    });
  }

  getElectrodeData() {
    return this.electrodes.map(e => ({
      id: e.id,
      channel: e.channel,
      polarity: e.polarity,
      label: e.label,
      color: e.color,
      pos: { ...e.pos },
      normal: { ...e.normal }
    }));
  }

  clearCables() {
    while (this.cablesGroup.children.length > 0) {
      const child = this.cablesGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      this.cablesGroup.remove(child);
    }
  }

  rebuildCables() {
    this.clearCables();

    // Agrupar por canales
    const channels = { 1: [], 2: [] };
    this.electrodes.forEach(el => {
      if (channels[el.channel]) {
        channels[el.channel].push(el);
      }
    });

    [1, 2].forEach(chNum => {
      const list = channels[chNum];
      if (list.length >= 2) {
        // Conectar el positivo con el negativo
        const posEl = list.find(e => e.polarity === 'positive') || list[0];
        const negEl = list.find(e => e.polarity === 'negative') || list[1];

        if (posEl && negEl && posEl !== negEl) {
          this.createCableBetween(posEl, negEl, chNum);
        }
      }
    });
  }

  createCableBetween(elA, elB, channel) {
    const p1 = new THREE.Vector3(elA.pos.x, elA.pos.y, elA.pos.z);
    const p2 = new THREE.Vector3(elB.pos.x, elB.pos.y, elB.pos.z);

    // Punto medio arqueado hacia afuera
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const normalAvg = new THREE.Vector3(
      ((elA.normal ? elA.normal.x : 0) + (elB.normal ? elB.normal.x : 0)) / 2,
      ((elA.normal ? elA.normal.y : 0) + (elB.normal ? elB.normal.y : 0)) / 2,
      ((elA.normal ? elA.normal.z : 1) + (elB.normal ? elB.normal.z : 1)) / 2
    ).normalize();

    // Arco natural del cable
    const distance = p1.distanceTo(p2);
    mid.addScaledVector(normalAvg, distance * 0.35 + 0.05);

    const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
    const tubeGeometry = new THREE.TubeGeometry(curve, 32, 0.006, 8, false);

    const cableColor = channel === 1 ? 0xef4444 : 0x3b82f6;
    const tubeMaterial = new THREE.MeshStandardMaterial({
      color: cableColor,
      roughness: 0.3,
      metalness: 0.2,
      emissive: cableColor,
      emissiveIntensity: 0.2
    });

    const cableMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
    this.cablesGroup.add(cableMesh);
  }

  updatePulseAnimation(time) {
    // Animación suave de palpitación del anillo de electrodos
    const scale = 1 + Math.sin(time * 4) * 0.04;
    this.electrodes.forEach(el => {
      if (el.group) {
        // Escalar suavemente
        el.group.scale.set(scale, scale, scale);
      }
    });
  }
}

window.ElectrodeManager = ElectrodeManager;
