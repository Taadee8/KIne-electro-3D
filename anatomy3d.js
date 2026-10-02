/**
 * Motor 3D de Anatomía Humana Muscular en Three.js
 * Construcción anatómica paramétrica y sistema de interacción clínica
 */

class AnatomyViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error('Contenedor 3D no encontrado');

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.electrodeManager = null;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clickableMeshes = [];
    this.muscleMeshesMap = {}; // muscleId -> Mesh

    this.hoveredMesh = null;
    this.selectedMuscleId = null;
    this.onMuscleHoverCb = null;
    this.onMuscleClickCb = null;

    // Materiales base
    this.materials = {
      skin: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.6,
        metalness: 0.1,
        flatShading: false
      }),
      muscleDefault: new THREE.MeshStandardMaterial({
        color: 0x991b1b, // Rojo muscular clínico
        roughness: 0.45,
        metalness: 0.15,
        emissive: 0x3b0764,
        emissiveIntensity: 0.1
      }),
      muscleHover: new THREE.MeshStandardMaterial({
        color: 0x0284c7, // Azul cian para hover
        roughness: 0.3,
        metalness: 0.2,
        emissive: 0x0369a1,
        emissiveIntensity: 0.4
      }),
      muscleActive: new THREE.MeshStandardMaterial({
        color: 0x10b981, // Esmeralda para músculo en tratamiento
        roughness: 0.3,
        metalness: 0.2,
        emissive: 0x059669,
        emissiveIntensity: 0.5
      }),
      boneAccent: new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.7,
        metalness: 0.1
      })
    };

    // Estado de animación de cámara
    this.camTransition = null;

    this.init();
  }

  init() {
    // 1. Escena
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090d16);

    // Niebla sutil para profundidad médica
    this.scene.fog = new THREE.FogExp2(0x090d16, 0.18);

    // 2. Cámara
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 0.8, 3.2);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. Controles orbitales
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxDistance = 5.5;
    this.controls.minDistance = 0.8;
    this.controls.target.set(0, 0.6, 0);

    // 5. Luces médicas
    this.setupLighting();

    // 6. Grid sutil de fondo médico
    const grid = new THREE.GridHelper(6, 24, 0x1e293b, 0x0f172a);
    grid.position.y = -1.5;
    this.scene.add(grid);

    // 7. Construir Anatomía Humana
    this.buildHumanAnatomy();

    // 8. Gestor de Electrodos
    this.electrodeManager = new ElectrodeManager(this.scene, this.camera, this.renderer.domElement);

    // 9. Event Listeners
    window.addEventListener('resize', () => this.onWindowResize());
    this.renderer.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.renderer.domElement.addEventListener('pointerup', (e) => this.onPointerUp(e));

    // 10. Loop de renderizado
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLighting() {
    // Luz ambiental suave
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.7);
    this.scene.add(ambientLight);

    // Luz principal frontal (Key Light)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    keyLight.position.set(3, 4, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    this.scene.add(keyLight);

    // Luz de relleno lateral (Fill Light azulada)
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    fillLight.position.set(-3, 2, 2);
    this.scene.add(fillLight);

    // Luz de silueta trasera (Rim Light para recortar músculos)
    const rimLight = new THREE.DirectionalLight(0x818cf8, 0.9);
    rimLight.position.set(0, 3, -4);
    this.scene.add(rimLight);

    // Luz suave inferior para volumen
    const floorLight = new THREE.DirectionalLight(0x0f172a, 0.4);
    floorLight.position.set(0, -3, 0);
    this.scene.add(floorLight);
  }

  /**
   * Construye un modelo anatómico muscular completo y articulado
   */
  buildHumanAnatomy() {
    this.bodyGroup = new THREE.Group();

    // --- CABEZA Y CUELLO ---
    const headGeom = new THREE.SphereGeometry(0.18, 32, 24);
    headGeom.scale(0.85, 1.15, 0.95);
    const headMesh = new THREE.Mesh(headGeom, this.materials.skin);
    headMesh.position.set(0, 1.75, 0);
    headMesh.castShadow = true;
    this.bodyGroup.add(headMesh);

    const neckGeom = new THREE.CylinderGeometry(0.085, 0.11, 0.22, 24);
    const neckMesh = new THREE.Mesh(neckGeom, this.materials.skin);
    neckMesh.position.set(0, 1.52, 0);
    this.bodyGroup.add(neckMesh);

    // --- MÚSCULO: TRAPECIO SUPERIOR (Izquierdo y Derecho) ---
    this.addAnatomicalMuscle('trapezius_l', new THREE.CylinderGeometry(0.05, 0.16, 0.22, 16), {
      pos: [-0.18, 1.42, -0.06],
      rot: [0.2, 0, 0.55],
      scale: [1, 1, 0.7]
    });
    this.addAnatomicalMuscle('trapezius_r', new THREE.CylinderGeometry(0.05, 0.16, 0.22, 16), {
      pos: [0.18, 1.42, -0.06],
      rot: [0.2, 0, -0.55],
      scale: [1, 1, 0.7]
    });

    // --- TORSO BASE (Caja torácica estilizada) ---
    const chestBaseGeom = new THREE.CylinderGeometry(0.28, 0.22, 0.5, 32);
    chestBaseGeom.scale(1.2, 1, 0.75);
    const chestBaseMesh = new THREE.Mesh(chestBaseGeom, this.materials.skin);
    chestBaseMesh.position.set(0, 1.15, 0);
    this.bodyGroup.add(chestBaseMesh);

    // --- MÚSCULOS: PECTORALES MAYORES (Izquierdo y Derecho) ---
    const pectGeomL = new THREE.BoxGeometry(0.24, 0.2, 0.1);
    this.addAnatomicalMuscle('pectoral_major_l', pectGeomL, {
      pos: [-0.15, 1.22, 0.15],
      rot: [0.05, -0.15, 0.1],
      scale: [1, 1, 1]
    });

    const pectGeomR = new THREE.BoxGeometry(0.24, 0.2, 0.1);
    this.addAnatomicalMuscle('pectoral_major_r', pectGeomR, {
      pos: [0.15, 1.22, 0.15],
      rot: [0.05, 0.15, -0.1],
      scale: [1, 1, 1]
    });

    // --- MÚSCULO: RECTO ABDOMINAL (Fibras anteriores del core) ---
    const absGeom = new THREE.CylinderGeometry(0.18, 0.19, 0.42, 24);
    absGeom.scale(1.05, 1, 0.65);
    this.addAnatomicalMuscle('rectus_abdominis', absGeom, {
      pos: [0, 0.82, 0.08],
      rot: [0, 0, 0],
      scale: [1, 1, 1]
    });

    // --- ESPALDA: DORSAL ANCHO (Latissimus Dorsi L & R) ---
    const latGeomL = new THREE.CylinderGeometry(0.12, 0.24, 0.45, 16);
    latGeomL.scale(0.8, 1, 0.5);
    this.addAnatomicalMuscle('latissimus_dorsi_l', latGeomL, {
      pos: [-0.26, 1.05, -0.12],
      rot: [-0.1, 0.3, 0.25]
    });

    const latGeomR = new THREE.CylinderGeometry(0.12, 0.24, 0.45, 16);
    latGeomR.scale(0.8, 1, 0.5);
    this.addAnatomicalMuscle('latissimus_dorsi_r', latGeomR, {
      pos: [0.26, 1.05, -0.12],
      rot: [-0.1, -0.3, -0.25]
    });

    // --- ESPALDA: PARAVERTEBRALES LUMBARES (Zona Lumbar L1-L5) ---
    const lumbarGeom = new THREE.BoxGeometry(0.28, 0.35, 0.12);
    this.addAnatomicalMuscle('lumbar_spine', lumbarGeom, {
      pos: [0, 0.72, -0.12],
      rot: [0.05, 0, 0]
    });

    // --- HOMBROS: DELTOIDES (Izquierdo y Derecho) ---
    const deltoidGeomL = new THREE.SphereGeometry(0.13, 24, 20);
    deltoidGeomL.scale(1.1, 1.35, 1.1);
    this.addAnatomicalMuscle('deltoid_l', deltoidGeomL, {
      pos: [-0.44, 1.28, 0.02],
      rot: [0, 0, 0.2]
    });

    const deltoidGeomR = new THREE.SphereGeometry(0.13, 24, 20);
    deltoidGeomR.scale(1.1, 1.35, 1.1);
    this.addAnatomicalMuscle('deltoid_r', deltoidGeomR, {
      pos: [0.44, 1.28, 0.02],
      rot: [0, 0, -0.2]
    });

    // --- BRAZOS: BÍCEPS BRAQUIAL (Izquierdo y Derecho) ---
    const bicepsGeomL = new THREE.CylinderGeometry(0.08, 0.075, 0.3, 20);
    bicepsGeomL.scale(1.1, 1, 1.1);
    this.addAnatomicalMuscle('biceps_l', bicepsGeomL, {
      pos: [-0.48, 0.98, 0.05],
      rot: [0.1, 0, 0.15]
    });

    const bicepsGeomR = new THREE.CylinderGeometry(0.08, 0.075, 0.3, 20);
    bicepsGeomR.scale(1.1, 1, 1.1);
    this.addAnatomicalMuscle('biceps_r', bicepsGeomR, {
      pos: [0.48, 0.98, 0.05],
      rot: [0.1, 0, -0.15]
    });

    // Antebrazos y manos (base)
    const forearmGeomL = new THREE.CylinderGeometry(0.065, 0.045, 0.35, 20);
    const forearmL = new THREE.Mesh(forearmGeomL, this.materials.skin);
    forearmL.position.set(-0.52, 0.65, 0.08);
    forearmL.rotation.set(0.15, 0, 0.1);
    this.bodyGroup.add(forearmL);

    const forearmGeomR = new THREE.CylinderGeometry(0.065, 0.045, 0.35, 20);
    const forearmR = new THREE.Mesh(forearmGeomR, this.materials.skin);
    forearmR.position.set(0.52, 0.65, 0.08);
    forearmR.rotation.set(0.15, 0, -0.1);
    this.bodyGroup.add(forearmR);

    // --- PELVIS Y GLÚTEOS ---
    const pelvisGeom = new THREE.CylinderGeometry(0.24, 0.22, 0.25, 24);
    pelvisGeom.scale(1.2, 1, 0.85);
    const pelvisMesh = new THREE.Mesh(pelvisGeom, this.materials.skin);
    pelvisMesh.position.set(0, 0.45, 0);
    this.bodyGroup.add(pelvisMesh);

    // Músculo: Glúteo Mayor (L & R)
    const gluteGeomL = new THREE.SphereGeometry(0.16, 24, 20);
    gluteGeomL.scale(1, 1.25, 1.2);
    this.addAnatomicalMuscle('gluteus_l', gluteGeomL, {
      pos: [-0.17, 0.35, -0.15],
      rot: [-0.2, -0.1, 0]
    });

    const gluteGeomR = new THREE.SphereGeometry(0.16, 24, 20);
    gluteGeomR.scale(1, 1.25, 1.2);
    this.addAnatomicalMuscle('gluteus_r', gluteGeomR, {
      pos: [0.17, 0.35, -0.15],
      rot: [-0.2, 0.1, 0]
    });

    // --- PIERNAS: CUÁDRICEPS (Izquierdo y Derecho) ---
    const quadGeomL = new THREE.CylinderGeometry(0.155, 0.11, 0.52, 24);
    quadGeomL.scale(1, 1, 1.15);
    this.addAnatomicalMuscle('quadriceps_l', quadGeomL, {
      pos: [-0.21, -0.05, 0.05],
      rot: [-0.05, 0, -0.08]
    });

    const quadGeomR = new THREE.CylinderGeometry(0.155, 0.11, 0.52, 24);
    quadGeomR.scale(1, 1, 1.15);
    this.addAnatomicalMuscle('quadriceps_r', quadGeomR, {
      pos: [0.21, -0.05, 0.05],
      rot: [-0.05, 0, 0.08]
    });

    // Rodillas base
    const kneeL = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 16), this.materials.boneAccent);
    kneeL.position.set(-0.23, -0.38, 0.06);
    this.bodyGroup.add(kneeL);

    const kneeR = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 16), this.materials.boneAccent);
    kneeR.position.set(0.23, -0.38, 0.06);
    this.bodyGroup.add(kneeR);

    // --- PIERNAS: GEMELOS / GASTROCNEMIO (Izquierdo y Derecho) ---
    const calfGeomL = new THREE.CylinderGeometry(0.105, 0.065, 0.48, 20);
    calfGeomL.scale(1.05, 1, 1.2);
    this.addAnatomicalMuscle('gastrocnemius_l', calfGeomL, {
      pos: [-0.23, -0.68, -0.05],
      rot: [0.1, 0, -0.04]
    });

    const calfGeomR = new THREE.CylinderGeometry(0.105, 0.065, 0.48, 20);
    calfGeomR.scale(1.05, 1, 1.2);
    this.addAnatomicalMuscle('gastrocnemius_r', calfGeomR, {
      pos: [0.23, -0.68, -0.05],
      rot: [0.1, 0, 0.04]
    });

    // Pies base
    const footGeom = new THREE.BoxGeometry(0.11, 0.07, 0.22);
    const footL = new THREE.Mesh(footGeom, this.materials.skin);
    footL.position.set(-0.24, -1.02, 0.06);
    this.bodyGroup.add(footL);

    const footR = new THREE.Mesh(footGeom, this.materials.skin);
    footR.position.set(0.24, -1.02, 0.06);
    this.bodyGroup.add(footR);

    // Agregar todo a la escena
    this.scene.add(this.bodyGroup);
  }

  addAnatomicalMuscle(muscleId, geometry, transform) {
    const mesh = new THREE.Mesh(geometry, this.materials.muscleDefault.clone());
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (transform.pos) mesh.position.set(...transform.pos);
    if (transform.rot) mesh.rotation.set(...transform.rot);
    if (transform.scale) mesh.scale.set(...transform.scale);

    const def = (window.MUSCLE_DEFINITIONS && window.MUSCLE_DEFINITIONS[muscleId]) || {
      name: muscleId,
      zone: 'Cuerpo Humano'
    };

    mesh.userData = {
      isMuscle: true,
      muscleId: muscleId,
      name: def.name,
      zone: def.zone,
      definition: def
    };

    this.bodyGroup.add(mesh);
    this.clickableMeshes.push(mesh);
    this.muscleMeshesMap[muscleId] = mesh;
    return mesh;
  }

  setMuscleHoverCallback(cb) {
    this.onMuscleHoverCb = cb;
  }

  setMuscleClickCallback(cb) {
    this.onMuscleClickCb = cb;
  }

  setElectrodeDeletedCallback(cb) {
    this.onElectrodeDeletedCb = cb;
  }

  setElectrodeAddedCallback(cb) {
    this.onElectrodeAddedCb = cb;
  }

  onPointerMove(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast para interactuar con músculos o electrodos
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.clickableMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const mesh = hit.object;

      if (this.hoveredMesh !== mesh) {
        this.resetHoveredMesh();
        this.hoveredMesh = mesh;
        if (mesh.userData.muscleId !== this.selectedMuscleId) {
          mesh.material = this.materials.muscleHover;
        }
        if (this.onMuscleHoverCb) {
          this.onMuscleHoverCb(mesh.userData, { clientX: event.clientX, clientY: event.clientY });
        }
      }
    } else {
      if (this.hoveredMesh) {
        this.resetHoveredMesh();
        if (this.onMuscleHoverCb) {
          this.onMuscleHoverCb(null, null);
        }
      }
    }
  }

  resetHoveredMesh() {
    if (this.hoveredMesh) {
      if (this.hoveredMesh.userData.muscleId === this.selectedMuscleId) {
        this.hoveredMesh.material = this.materials.muscleActive;
      } else {
        this.hoveredMesh.material = this.materials.muscleDefault;
      }
      this.hoveredMesh = null;
    }
  }

  onPointerDown(event) {
    // Registrar posición y tiempo para diferenciar clic intencional de arrastre orbital de cámara
    this.pointerDownPos = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now()
    };
  }

  onPointerUp(event) {
    if (!this.pointerDownPos) return;
    const dx = event.clientX - this.pointerDownPos.x;
    const dy = event.clientY - this.pointerDownPos.y;
    const dist = Math.hypot(dx, dy);
    this.pointerDownPos = null;

    // Si se arrastró más de 6 píxeles, fue un movimiento para rotar la cámara y no un toque
    if (dist > 6) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);

    // 1. VERIFICAR SI SE HIZO CLIC DIRECTAMENTE EN UN ELECTRODO EXISTENTE -> BORRARLO
    if (this.electrodeManager && this.electrodeManager.electrodesGroup) {
      const elHits = this.raycaster.intersectObjects(this.electrodeManager.electrodesGroup.children, true);
      if (elHits.length > 0) {
        const hitObj = elHits[0].object;
        const elData = this.electrodeManager.findElectrodeFromMesh(hitObj);
        if (elData) {
          const removed = this.electrodeManager.removeElectrode(elData.id);
          if (this.onElectrodeDeletedCb) {
            this.onElectrodeDeletedCb(removed || elData);
          }
          return;
        }
      }
    }

    // 2. RAYCAST CONTRA EL CUERPO / MÚSCULOS
    const bodyHits = this.raycaster.intersectObjects(this.bodyGroup.children, true);
    if (bodyHits.length > 0) {
      const hit = bodyHits[0];

      // COMPROBACIÓN CLAVE: ¿Había ya un electrodo puesto en el mismo lugar?
      if (this.electrodeManager) {
        const nearEl = this.electrodeManager.findElectrodeNear(hit.point, 0.08);
        if (nearEl) {
          // Sí había uno puesto en ese mismo lugar -> BORRARLO
          const removed = this.electrodeManager.removeElectrode(nearEl.id);
          if (this.onElectrodeDeletedCb) {
            this.onElectrodeDeletedCb(removed || nearEl);
          }
          return;
        }
      }

      // SI NO HABÍA NADA EN ESE LUGAR -> COLOCAR EL ELECTRODO
      if (this.electrodeManager && this.electrodeManager.isPlacingMode) {
        const normal = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 0, 1);
        normal.transformDirection(hit.object.matrixWorld);

        const newEl = this.electrodeManager.addElectrode({
          pos: hit.point,
          normal: normal
        });
        if (this.onElectrodeAddedCb) {
          this.onElectrodeAddedCb(newEl);
        }
        return;
      }

      // Si no estaba en modo colocación, seleccionar el músculo
      if (hit.object.userData && hit.object.userData.isMuscle) {
        const muscleId = hit.object.userData.muscleId;
        this.selectMuscle(muscleId);
        if (this.onMuscleClickCb) {
          this.onMuscleClickCb(hit.object.userData);
        }
      }
    }
  }

  selectMuscle(muscleId, smoothMove = true) {
    // Restaurar anterior
    if (this.selectedMuscleId && this.muscleMeshesMap[this.selectedMuscleId]) {
      this.muscleMeshesMap[this.selectedMuscleId].material = this.materials.muscleDefault;
    }

    this.selectedMuscleId = muscleId;

    if (muscleId && this.muscleMeshesMap[muscleId]) {
      this.muscleMeshesMap[muscleId].material = this.materials.muscleActive;

      // Animar cámara a enfocar el músculo
      const def = window.MUSCLE_DEFINITIONS && window.MUSCLE_DEFINITIONS[muscleId];
      if (def && smoothMove) {
        this.animateCameraTo(def.camPos, def.target);
      }
    }
  }

  animateCameraTo(targetPos, targetLookAt, duration = 800) {
    if (!targetPos || !targetLookAt) return;

    const startPos = this.camera.position.clone();
    const startLookAt = this.controls.target.clone();
    const endPos = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
    const endLookAt = new THREE.Vector3(targetLookAt.x, targetLookAt.y, targetLookAt.z);

    const startTime = performance.now();

    this.camTransition = {
      startTime,
      duration,
      startPos,
      endPos,
      startLookAt,
      endLookAt
    };
  }

  resetView() {
    this.animateCameraTo({ x: 0, y: 0.8, z: 3.2 }, { x: 0, y: 0.6, z: 0 });
    if (this.selectedMuscleId && this.muscleMeshesMap[this.selectedMuscleId]) {
      this.muscleMeshesMap[this.selectedMuscleId].material = this.materials.muscleDefault;
    }
    this.selectedMuscleId = null;
  }

  setPresetView(angle) {
    switch (angle) {
      case 'front':
        this.animateCameraTo({ x: 0, y: 0.6, z: 2.8 }, { x: 0, y: 0.6, z: 0 });
        break;
      case 'back':
        this.animateCameraTo({ x: 0, y: 0.6, z: -2.8 }, { x: 0, y: 0.6, z: 0 });
        break;
      case 'left':
        this.animateCameraTo({ x: -2.8, y: 0.6, z: 0 }, { x: 0, y: 0.6, z: 0 });
        break;
      case 'right':
        this.animateCameraTo({ x: 2.8, y: 0.6, z: 0 }, { x: 0, y: 0.6, z: 0 });
        break;
    }
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate(time) {
    requestAnimationFrame(this.animate);

    // Transición suave de cámara
    if (this.camTransition) {
      const elapsed = performance.now() - this.camTransition.startTime;
      let progress = Math.min(elapsed / this.camTransition.duration, 1);
      // Easing suave (easeInOutCubic)
      progress = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.camera.position.lerpVectors(this.camTransition.startPos, this.camTransition.endPos, progress);
      this.controls.target.lerpVectors(this.camTransition.startLookAt, this.camTransition.endLookAt, progress);

      if (progress >= 1) {
        this.camTransition = null;
      }
    }

    // Actualizar pulsación de electrodos
    if (this.electrodeManager) {
      this.electrodeManager.updatePulseAnimation(time * 0.001);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

window.AnatomyViewer = AnatomyViewer;
