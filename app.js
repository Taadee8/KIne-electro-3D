/**
 * KineElectro 3D - Controlador Principal de Aplicación
 * Manejo de roles (Kinesiólogo / Paciente), sincronización 3D y temporizador clínico
 */

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar visor 3D
  const viewer = new AnatomyViewer('webgl-canvas-container');
  const electrodeMgr = viewer.electrodeManager;

  // Estado de la aplicación
  let currentRole = window.KineStore.getRole(); // 'kinesiologo' o 'paciente'
  let activeRequest = window.KineStore.getActivePatient();
  let timerInterval = null;
  let timerSecondsLeft = 20 * 60; // 20 minutos por defecto
  let isTimerRunning = false;

  // Referencias a elementos DOM
  const roleKineBtn = document.getElementById('role-kine-btn');
  const rolePatientBtn = document.getElementById('role-patient-btn');
  const kinePanel = document.getElementById('kine-panel');
  const patientPanel = document.getElementById('patient-panel');

  // Gestor Serie USB ESP32 (Web Serial API)
  const serialMgr = new Esp32SerialManager();

  // Elementos de autenticación de Kinesiólogo
  const kineLoggedInfo = document.getElementById('kine-logged-info');
  const kineLoggedName = document.getElementById('kine-logged-name');
  const btnKineLogout = document.getElementById('btn-kine-logout');
  const modalKineAuth = document.getElementById('modal-kine-auth');
  const btnCloseAuthModal = document.getElementById('btn-close-auth-modal');
  const formKineAuth = document.getElementById('form-kine-auth');
  const authKineSelect = document.getElementById('auth-kine-select');
  const authKinePass = document.getElementById('auth-kine-pass');
  const authErrorMsg = document.getElementById('auth-error-msg');

  // Elementos Hardware Serie USB ESP32 & PIC
  const serialStatusBadge = document.getElementById('serial-status-badge');
  const serialStatusDot = document.getElementById('serial-status-dot');
  const serialStatusText = document.getElementById('serial-status-text');
  const serialEepromSlot = document.getElementById('serial-eeprom-slot');
  const btnSerialConnect = document.getElementById('btn-serial-connect');
  const btnSerialConnectText = document.getElementById('btn-serial-connect-text');
  const btnSerialSend = document.getElementById('btn-serial-send');
  const serialUartText = document.getElementById('serial-uart-text');

  const muscleTooltip = document.getElementById('canvas-tooltip');
  const hudMuscleName = document.getElementById('hud-muscle-name');
  const hudMuscleZone = document.getElementById('hud-muscle-zone');

  // Herramientas de electrodos en panel kinesiólogo
  const btnPlaceCh1Pos = document.getElementById('btn-place-ch1-pos');
  const btnPlaceCh1Neg = document.getElementById('btn-place-ch1-neg');
  const btnPlaceCh2Pos = document.getElementById('btn-place-ch2-pos');
  const btnPlaceCh2Neg = document.getElementById('btn-place-ch2-neg');
  const btnClearElectrodes = document.getElementById('btn-clear-electrodes');
  const presetSelect = document.getElementById('preset-select');

  // Formulario de prescripción kinesiólogo
  const formPrescription = document.getElementById('prescription-form');
  const inputPrescTitle = document.getElementById('presc-title');
  const selectPrescType = document.getElementById('presc-type');
  const inputPrescFreq = document.getElementById('presc-freq');
  const inputPrescPulse = document.getElementById('presc-pulse');
  const inputPrescDuration = document.getElementById('presc-duration');
  const inputPrescNotes = document.getElementById('presc-notes');
  const btnSavePrescription = document.getElementById('btn-save-prescription');

  // Lista de solicitudes en panel kinesiólogo
  const requestsList = document.getElementById('kine-requests-list');
  const requestsBadge = document.getElementById('kine-requests-badge');

  // Elementos panel paciente
  const patientActiveMuscleBadge = document.getElementById('patient-muscle-badge');
  const patientPrescTitle = document.getElementById('patient-presc-title');
  const patientPrescType = document.getElementById('patient-presc-type');
  const patientPrescParams = document.getElementById('patient-presc-params');
  const patientPrescNotes = document.getElementById('patient-presc-notes');
  const patientStepsContainer = document.getElementById('patient-placement-steps');
  const btnFocusPatientMuscle = document.getElementById('btn-focus-patient-muscle');

  // Temporizador de sesión paciente
  const timerDisplay = document.getElementById('timer-display');
  const btnTimerToggle = document.getElementById('btn-timer-toggle');
  const btnTimerReset = document.getElementById('btn-timer-reset');

  // Modal Nueva Consulta Paciente
  const btnOpenRequestModal = document.getElementById('btn-open-request-modal');
  const modalNewRequest = document.getElementById('modal-new-request');
  const btnCloseRequestModal = document.getElementById('btn-close-request-modal');
  const formNewRequest = document.getElementById('form-new-request');
  const selectRequestMuscle = document.getElementById('request-muscle');
  const sliderPain = document.getElementById('slider-pain');
  const sliderPainVal = document.getElementById('slider-pain-val');

  // Controles de cámara rápida
  document.getElementById('cam-front').addEventListener('click', () => viewer.setPresetView('front'));
  document.getElementById('cam-back').addEventListener('click', () => viewer.setPresetView('back'));
  document.getElementById('cam-left').addEventListener('click', () => viewer.setPresetView('left'));
  document.getElementById('cam-right').addEventListener('click', () => viewer.setPresetView('right'));
  document.getElementById('cam-reset').addEventListener('click', () => viewer.resetView());

  // Popular selector de músculos en modal
  if (selectRequestMuscle) {
    selectRequestMuscle.innerHTML = '<option value="">-- Selecciona el músculo o zona --</option>';
    Object.keys(window.MUSCLE_DEFINITIONS).forEach(id => {
      const m = window.MUSCLE_DEFINITIONS[id];
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `${m.name} (${m.zone})`;
      selectRequestMuscle.appendChild(opt);
    });
  }

  // Popular selector de profesionales kinesiólogos en modal de autenticación
  if (authKineSelect && window.KineStore.getProfessionals) {
    authKineSelect.innerHTML = '';
    window.KineStore.getProfessionals().forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.reg}) - ${p.specialty}`;
      authKineSelect.appendChild(opt);
    });
  }

  // --- GESTIÓN DE ROLES Y AUTENTICACIÓN ---
  function switchRole(role) {
    currentRole = role;
    window.KineStore.setRole(role);

    if (role === 'kinesiologo') {
      roleKineBtn.classList.add('bg-sky-600', 'text-white', 'shadow');
      roleKineBtn.classList.remove('text-slate-400', 'hover:text-slate-200');
      rolePatientBtn.classList.remove('bg-sky-600', 'text-white', 'shadow');
      rolePatientBtn.classList.add('text-slate-400', 'hover:text-slate-200');

      kinePanel.classList.remove('hidden');
      patientPanel.classList.add('hidden');
      updateKineAuthUI();
      // Activar por defecto el polo CH1 (+) para colocar o borrar con un solo toque
      activatePlacingTool(btnPlaceCh1Pos, 1, 'positive', false);
    } else {
      rolePatientBtn.classList.add('bg-sky-600', 'text-white', 'shadow');
      rolePatientBtn.classList.remove('text-slate-400', 'hover:text-slate-200');
      roleKineBtn.classList.remove('bg-sky-600', 'text-white', 'shadow');
      roleKineBtn.classList.add('text-slate-400', 'hover:text-slate-200');

      patientPanel.classList.remove('hidden');
      kinePanel.classList.add('hidden');
      electrodeMgr.setPlacingMode(false);
      resetToolButtons();

      // Cargar la prescripción del paciente actual en el 3D
      loadActivePatientView();
    }
  }

  function openAuthModal() {
    if (!modalKineAuth) return;
    modalKineAuth.classList.remove('hidden');
    modalKineAuth.classList.add('flex');
    if (authKinePass) authKinePass.value = '';
    if (authErrorMsg) authErrorMsg.classList.add('hidden');
    setTimeout(() => { if (authKinePass) authKinePass.focus(); }, 100);
  }

  function closeAuthModal() {
    if (!modalKineAuth) return;
    modalKineAuth.classList.add('hidden');
    modalKineAuth.classList.remove('flex');
    if (authErrorMsg) authErrorMsg.classList.add('hidden');
  }

  if (btnCloseAuthModal) btnCloseAuthModal.addEventListener('click', closeAuthModal);

  if (formKineAuth) {
    formKineAuth.addEventListener('submit', (e) => {
      e.preventDefault();
      const kineId = authKineSelect.value;
      const pass = authKinePass.value;
      const res = window.KineStore.authenticateKine(kineId, pass);
      if (res.success) {
        closeAuthModal();
        updateKineAuthUI();
        switchRole('kinesiologo');
        showToast(`🔒 Acceso concedido: ${res.professional.name}`, 'info');
      } else {
        if (authErrorMsg) {
          authErrorMsg.textContent = res.error;
          authErrorMsg.classList.remove('hidden');
        }
      }
    });
  }

  if (btnKineLogout) {
    btnKineLogout.addEventListener('click', () => {
      window.KineStore.logoutKine();
      updateKineAuthUI();
      switchRole('paciente');
      showToast('Sesión de kinesiólogo cerrada.');
    });
  }

  function updateKineAuthUI() {
    if (window.KineStore.isKineAuth()) {
      const activeKine = window.KineStore.getActiveKine();
      if (kineLoggedName) kineLoggedName.textContent = activeKine.name;
      if (kineLoggedInfo) {
        kineLoggedInfo.classList.remove('hidden');
        kineLoggedInfo.classList.add('flex');
      }
    } else {
      if (kineLoggedInfo) {
        kineLoggedInfo.classList.add('hidden');
        kineLoggedInfo.classList.remove('flex');
      }
    }
  }

  roleKineBtn.addEventListener('click', () => {
    if (window.KineStore.isKineAuth()) {
      switchRole('kinesiologo');
    } else {
      openAuthModal();
    }
  });

  rolePatientBtn.addEventListener('click', () => switchRole('paciente'));

  // --- CALLBACKS DE ELIMINACIÓN Y COLOCACIÓN DE ELECTRODOS ---
  viewer.setElectrodeDeletedCallback((el) => {
    showToast(`🗑️ Se borró el electrodo ${el.label} que estaba en ese lugar.`, 'warning');
  });

  viewer.setElectrodeAddedCallback((el) => {
    showToast(`✅ Electrodo ${el.label} colocado. (Toca sobre él si deseas borrarlo).`, 'info');
    // Si se colocó un polo positivo (+), sugerir automáticamente pasar al polo de cierre (-) del mismo canal
    if (el.polarity === 'positive') {
      if (el.channel === 1) {
        activatePlacingTool(btnPlaceCh1Neg, 1, 'negative', false);
      } else {
        activatePlacingTool(btnPlaceCh2Neg, 2, 'negative', false);
      }
    }
  });

  // --- TOOLTIP Y HUD 3D ---
  viewer.setMuscleHoverCallback((muscleData, screenCoords) => {
    if (muscleData) {
      hudMuscleName.textContent = muscleData.name;
      hudMuscleZone.textContent = muscleData.zone;

      if (screenCoords && muscleTooltip) {
        muscleTooltip.style.opacity = '1';
        muscleTooltip.style.left = `${screenCoords.clientX + 16}px`;
        muscleTooltip.style.top = `${screenCoords.clientY + 16}px`;
        muscleTooltip.querySelector('#tooltip-title').textContent = muscleData.name;
        muscleTooltip.querySelector('#tooltip-desc').textContent = muscleData.definition.motorPointTip || muscleData.definition.function;
      }
    } else {
      hudMuscleName.textContent = 'Explora el cuerpo 3D';
      hudMuscleZone.textContent = 'Pasa el cursor o haz clic en cualquier músculo';
      if (muscleTooltip) muscleTooltip.style.opacity = '0';
    }
  });

  viewer.setMuscleClickCallback((muscleData) => {
    // Si estamos en modo kinesiólogo, actualizar el selector de la consulta o auto-completar título
    if (currentRole === 'kinesiologo' && inputPrescTitle && !inputPrescTitle.value) {
      inputPrescTitle.value = `Indicación para ${muscleData.name}`;
    }
  });

  // --- HERRAMIENTAS DE COLOCACIÓN DE ELECTRODOS (Kinesiólogo) ---
  function resetToolButtons() {
    [btnPlaceCh1Pos, btnPlaceCh1Neg, btnPlaceCh2Pos, btnPlaceCh2Neg].forEach(btn => {
      if (btn) btn.classList.remove('btn-tool-active', 'ring-2', 'ring-white');
    });
  }

  function activatePlacingTool(btn, channel, polarity, notify = true) {
    if (electrodeMgr.isPlacingMode && electrodeMgr.activeChannel === channel && electrodeMgr.activePolarity === polarity && notify) {
      // Toggle off
      electrodeMgr.setPlacingMode(false);
      resetToolButtons();
      showToast('Modo colocación pausado. Puedes rotar el modelo libremente.');
    } else {
      resetToolButtons();
      if (btn) btn.classList.add('btn-tool-active', 'ring-2', 'ring-white');
      electrodeMgr.setPlacingMode(true, channel, polarity);
      if (notify) {
        showToast(`Toca sobre el cuerpo para colocar ${channel === 1 ? 'CH1' : 'CH2'} (${polarity === 'positive' ? '+' : '−'}) o toca uno existente para borrarlo.`);
      }
    }
  }

  btnPlaceCh1Pos.addEventListener('click', () => activatePlacingTool(btnPlaceCh1Pos, 1, 'positive', true));
  btnPlaceCh1Neg.addEventListener('click', () => activatePlacingTool(btnPlaceCh1Neg, 1, 'negative', true));
  btnPlaceCh2Pos.addEventListener('click', () => activatePlacingTool(btnPlaceCh2Pos, 2, 'positive', true));
  btnPlaceCh2Neg.addEventListener('click', () => activatePlacingTool(btnPlaceCh2Neg, 2, 'negative', true));

  btnClearElectrodes.addEventListener('click', () => {
    electrodeMgr.clearAll();
    showToast('Electrodos eliminados.');
  });

  // Presets clínicos predefinidos
  presetSelect.addEventListener('change', (e) => {
    const presetId = e.target.value;
    if (!presetId) return;

    const preset = window.CLINICAL_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    // Cargar en el 3D
    viewer.selectMuscle(preset.muscleId, true);
    electrodeMgr.loadElectrodes(preset.electrodes);

    // Cargar en el formulario
    inputPrescTitle.value = preset.title;
    selectPrescType.value = preset.type.includes('EMS') ? 'EMS' : 'TENS';
    inputPrescFreq.value = preset.parameters.frequency;
    inputPrescPulse.value = preset.parameters.pulseWidth;
    inputPrescDuration.value = preset.parameters.duration;
    inputPrescNotes.value = preset.instructions + `\n\nIntensidad: ${preset.parameters.intensity}`;

    showToast(`Protocolo cargado: ${preset.title}`);
  });

  // --- GUARDAR Y ENVIAR PRESCRIPCIÓN ---
  btnSavePrescription.addEventListener('click', () => {
    const electrodes = electrodeMgr.getElectrodeData();
    if (electrodes.length === 0) {
      showToast('⚠️ Debes colocar al menos un electrodo en el modelo 3D antes de enviar.', 'warning');
      return;
    }

    const prescriptionData = {
      title: inputPrescTitle.value || 'Tratamiento de Electroestimulación',
      type: selectPrescType.value,
      frequency: parseInt(inputPrescFreq.value) || 100,
      pulseWidth: parseInt(inputPrescPulse.value) || 100,
      duration: parseInt(inputPrescDuration.value) || 20,
      kineNotes: inputPrescNotes.value || 'Seguir las marcas indicadas en el modelo 3D.',
      electrodes: electrodes,
      muscleId: viewer.selectedMuscleId || 'lumbar_spine'
    };

    const targetReqId = activeRequest ? activeRequest.id : 'req-1';
    window.KineStore.updatePrescription(targetReqId, prescriptionData);

    showToast('✅ Prescripción médica guardada y enviada al paciente con éxito.');
    renderRequestsList();

    // Actualizar vista activa
    activeRequest = window.KineStore.getRequestById(targetReqId);
  });

  // --- HARDWARE ESP32 & PIC16F887 (PUERTO SERIE USB) ---
  function updateUartPreview() {
    if (!serialUartText) return;
    const slot = serialEepromSlot ? serialEepromSlot.value : '1';
    const type = selectPrescType ? selectPrescType.value : 'TENS';
    const freq = inputPrescFreq ? inputPrescFreq.value : '100';
    const pulse = inputPrescPulse ? inputPrescPulse.value : '100';
    const duration = inputPrescDuration ? inputPrescDuration.value : '20';
    serialUartText.textContent = `SET,${slot},${type},${freq},${pulse},${duration}\\n`;
  }

  [selectPrescType, inputPrescFreq, inputPrescPulse, inputPrescDuration, serialEepromSlot].forEach(elem => {
    if (elem) {
      elem.addEventListener('input', updateUartPreview);
      elem.addEventListener('change', updateUartPreview);
    }
  });
  updateUartPreview();

  serialMgr.onStateChange((state, details) => {
    if (!serialStatusBadge) return;
    if (state === 'connected') {
      if (serialStatusDot) serialStatusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block';
      serialStatusBadge.className = 'px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5';
      if (serialStatusText) serialStatusText.textContent = details || 'Conectado a COM';
      if (btnSerialConnectText) btnSerialConnectText.textContent = 'Desconectar';
      showToast(`🔌 Conectado exitosamente por USB (${details}).`, 'info');
    } else if (state === 'connecting') {
      if (serialStatusDot) serialStatusDot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block';
      serialStatusBadge.className = 'px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-950/70 text-amber-300 border border-amber-500/40 flex items-center gap-1.5';
      if (serialStatusText) serialStatusText.textContent = 'Conectando...';
    } else {
      if (serialStatusDot) serialStatusDot.className = 'w-2 h-2 rounded-full bg-slate-500 inline-block';
      serialStatusBadge.className = 'px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1.5';
      if (serialStatusText) serialStatusText.textContent = 'Desconectado';
      if (btnSerialConnectText) btnSerialConnectText.textContent = 'Conectar USB (COM)';
    }
  });

  serialMgr.onDataReceived((data) => {
    console.log('[ESP32 USB Respuesta]:', data);
    showToast(`📩 ESP32 responde: ${data}`, 'info');
  });

  if (btnSerialConnect) {
    btnSerialConnect.addEventListener('click', async () => {
      if (serialMgr.isConnected) {
        await serialMgr.disconnect();
        showToast('Cable USB desconectado.');
      } else {
        try {
          await serialMgr.connect(115200);
        } catch (err) {
          if (err.name !== 'NotFoundError') {
            showToast(`Aviso Serie: ${err.message}`, 'warning');
          }
        }
      }
    });
  }

  if (btnSerialSend) {
    btnSerialSend.addEventListener('click', async () => {
      const slot = parseInt(serialEepromSlot ? serialEepromSlot.value : '1');
      const type = selectPrescType.value;
      const frequency = parseInt(inputPrescFreq.value) || 100;
      const pulseWidth = parseInt(inputPrescPulse.value) || 100;
      const duration = parseInt(inputPrescDuration.value) || 20;

      const progLetters = { 1: 'A', 2: 'B', 3: 'C' };
      const progName = `Programa Personalizado ${progLetters[slot] || 'A'}`;

      const payload = await serialMgr.sendParameters({ slot, type, frequency, pulseWidth, duration });

      if (serialMgr.isConnected) {
        showToast(`⚡ Parámetros enviados por USB al ESP32 -> REMA guardará en ${progName}`, 'info');
      } else {
        showToast(`ℹ️ Trama generada para ${progName}: "${payload.uartFrame.trim()}". (Conecta tu ESP32 por USB para enviar en vivo)`, 'info');
      }
    });
  }

  // --- RENDERIZAR LISTA DE SOLICITUDES (Kinesiólogo) ---
  function renderRequestsList() {
    const requests = window.KineStore.getRequests();
    const pendingCount = requests.filter(r => r.status === 'pending').length;

    requestsBadge.textContent = `${pendingCount} pendientes`;
    requestsList.innerHTML = '';

    requests.forEach(req => {
      const isSelected = activeRequest && activeRequest.id === req.id;
      const card = document.createElement('div');
      card.className = `p-3 rounded-xl border cursor-pointer transition-all ${
        isSelected
          ? 'bg-sky-950/60 border-sky-500 shadow-md ring-1 ring-sky-500'
          : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
      }`;

      const statusBadge = req.status === 'completed'
        ? '<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Prescrito</span>'
        : '<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">Pendiente</span>';

      card.innerHTML = `
        <div class="flex items-center justify-between mb-1.5">
          <span class="font-bold text-sm text-slate-100">${req.patientName}</span>
          ${statusBadge}
        </div>
        <p class="text-xs text-sky-400 font-medium mb-1"><i data-lucide="map-pin" class="w-3 h-3 inline mr-1"></i>${req.zone}</p>
        <p class="text-xs text-slate-300 line-clamp-2 mb-2 italic">"${req.symptom}"</p>
        <div class="flex items-center justify-between text-[11px] text-slate-400">
          <span>Dolor: <strong class="text-red-400">${req.painLevel || 5}/10</strong></span>
          <span>${req.date}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        selectPatientRequest(req);
      });

      requestsList.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function selectPatientRequest(req) {
    activeRequest = req;
    window.KineStore.setActivePatient(req.id);
    renderRequestsList();

    // Enfocar el músculo de la solicitud en el visor 3D
    if (req.muscleId) {
      viewer.selectMuscle(req.muscleId, true);
    }

    // Si ya tenía prescripción, cargarla
    if (req.prescription && req.prescription.electrodes) {
      electrodeMgr.loadElectrodes(req.prescription.electrodes);
      inputPrescTitle.value = req.prescription.title || '';
      selectPrescType.value = req.prescription.type || 'TENS';
      inputPrescFreq.value = req.prescription.frequency || 100;
      inputPrescPulse.value = req.prescription.pulseWidth || 100;
      inputPrescDuration.value = req.prescription.duration || 20;
      inputPrescNotes.value = req.prescription.kineNotes || '';
    } else {
      electrodeMgr.clearAll();
      inputPrescTitle.value = `Protocolo para ${req.patientName} - ${req.zone}`;
      inputPrescNotes.value = `Indicado para: "${req.symptom}"\nObjetivo: ${req.goal}`;
    }

    showToast(`Atendiendo solicitud de: ${req.patientName}`);
  }

  // --- CARGA DE VISTA DEL PACIENTE ---
  function loadActivePatientView() {
    const currentActive = window.KineStore.getActivePatient();
    if (!currentActive) return;

    const presc = currentActive.prescription;
    if (presc) {
      patientActiveMuscleBadge.textContent = (window.MUSCLE_DEFINITIONS[presc.muscleId || currentActive.muscleId] || {}).name || currentActive.zone;
      patientPrescTitle.textContent = presc.title || 'Tu pauta de electroestimulación';
      patientPrescType.textContent = presc.type || 'TENS';
      patientPrescParams.textContent = `${presc.frequency || 100} Hz • ${presc.pulseWidth || 100} µs • ${presc.duration || 20} minutos`;
      patientPrescNotes.textContent = presc.kineNotes || 'Coloca los electrodos siguiendo la orientación del modelo 3D.';

      // Cargar electrodos en 3D
      if (presc.electrodes) {
        electrodeMgr.loadElectrodes(presc.electrodes);
      }

      // Generar pasos guiados para el paciente
      generatePatientSteps(presc.electrodes || []);

      // Enfocar en 3D
      if (presc.muscleId || currentActive.muscleId) {
        viewer.selectMuscle(presc.muscleId || currentActive.muscleId, true);
      }

      // Configurar duración de temporizador
      timerSecondsLeft = (presc.duration || 20) * 60;
      updateTimerDisplay();
    } else {
      patientPrescTitle.textContent = 'Esperando indicación del kinesiólogo';
      patientPrescType.textContent = 'En revisión';
      patientPrescParams.textContent = 'Tu solicitud está siendo revisada por el profesional.';
      patientPrescNotes.textContent = 'Te notificaremos cuando el kinesiólogo marque los electrodos en tu modelo 3D.';
      patientStepsContainer.innerHTML = '<p class="text-xs text-slate-400 italic">No hay electrodos asignados todavía.</p>';
      electrodeMgr.clearAll();
    }
  }

  function generatePatientSteps(electrodes) {
    patientStepsContainer.innerHTML = '';
    if (!electrodes || electrodes.length === 0) {
      patientStepsContainer.innerHTML = '<p class="text-xs text-slate-400">Sin pasos disponibles.</p>';
      return;
    }

    // Paso 0: Preparación
    const stepPrep = document.createElement('div');
    stepPrep.className = 'flex items-start gap-2.5 p-2 rounded-lg bg-slate-800/40 border border-slate-700/50';
    stepPrep.innerHTML = `
      <span class="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-300 shrink-0">1</span>
      <div>
        <p class="text-xs font-semibold text-slate-200">Limpieza previa de la zona</p>
        <p class="text-[11px] text-slate-400">Limpia con agua o alcohol la piel para asegurar buena adherencia del electrodo.</p>
      </div>
    `;
    patientStepsContainer.appendChild(stepPrep);

    // Pasos de electrodos
    electrodes.forEach((el, idx) => {
      const stepItem = document.createElement('div');
      stepItem.className = 'flex items-start gap-2.5 p-2 rounded-lg bg-slate-800/40 border border-slate-700/50';
      const colorDot = el.polarity === 'positive' ? 'bg-red-500' : 'bg-slate-800 border border-red-500';
      stepItem.innerHTML = `
        <span class="w-5 h-5 rounded-full ${colorDot} flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow">${el.polarity === 'positive' ? '+' : '−'}</span>
        <div>
          <p class="text-xs font-semibold text-slate-200">Colocar ${el.label}</p>
          <p class="text-[11px] text-slate-400">Pega el parche firme en el punto marcado en el modelo 3D.</p>
        </div>
      `;
      patientStepsContainer.appendChild(stepItem);
    });
  }

  btnFocusPatientMuscle.addEventListener('click', () => {
    const currentActive = window.KineStore.getActivePatient();
    if (currentActive) {
      const mId = (currentActive.prescription && currentActive.prescription.muscleId) || currentActive.muscleId;
      if (mId) viewer.selectMuscle(mId, true);
    }
  });

  // --- TEMPORIZADOR CLÍNICO DEL PACIENTE ---
  function updateTimerDisplay() {
    const mins = Math.floor(timerSecondsLeft / 60);
    const secs = timerSecondsLeft % 60;
    timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  btnTimerToggle.addEventListener('click', () => {
    if (isTimerRunning) {
      clearInterval(timerInterval);
      isTimerRunning = false;
      btnTimerToggle.innerHTML = '<i data-lucide="play" class="w-4 h-4 mr-1 inline"></i> Reanudar';
      btnTimerToggle.classList.remove('bg-amber-600', 'hover:bg-amber-700');
      btnTimerToggle.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
    } else {
      isTimerRunning = true;
      btnTimerToggle.innerHTML = '<i data-lucide="pause" class="w-4 h-4 mr-1 inline"></i> Pausar';
      btnTimerToggle.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
      btnTimerToggle.classList.add('bg-amber-600', 'hover:bg-amber-700');

      timerInterval = setInterval(() => {
        if (timerSecondsLeft > 0) {
          timerSecondsLeft--;
          updateTimerDisplay();
        } else {
          clearInterval(timerInterval);
          isTimerRunning = false;
          btnTimerToggle.innerHTML = '<i data-lucide="play" class="w-4 h-4 mr-1 inline"></i> Iniciar';
          playAlertSound();
          showToast('🎉 ¡Sesión de electroestimulación completada con éxito!');
        }
      }, 1000);
    }
    if (window.lucide) window.lucide.createIcons();
  });

  btnTimerReset.addEventListener('click', () => {
    clearInterval(timerInterval);
    isTimerRunning = false;
    const currentActive = window.KineStore.getActivePatient();
    const duration = (currentActive && currentActive.prescription && currentActive.prescription.duration) || 20;
    timerSecondsLeft = duration * 60;
    updateTimerDisplay();
    btnTimerToggle.innerHTML = '<i data-lucide="play" class="w-4 h-4 mr-1 inline"></i> Iniciar';
    btnTimerToggle.classList.remove('bg-amber-600', 'hover:bg-amber-700');
    btnTimerToggle.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
    if (window.lucide) window.lucide.createIcons();
  });

  function playAlertSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.log('Audio not supported or blocked');
    }
  }

  // --- MODAL NUEVA CONSULTA DE PACIENTE ---
  btnOpenRequestModal.addEventListener('click', () => {
    modalNewRequest.classList.remove('hidden');
    modalNewRequest.classList.add('flex');
  });

  btnCloseRequestModal.addEventListener('click', () => {
    modalNewRequest.classList.add('hidden');
    modalNewRequest.classList.remove('flex');
  });

  sliderPain.addEventListener('input', (e) => {
    sliderPainVal.textContent = e.target.value;
  });

  formNewRequest.addEventListener('submit', (e) => {
    e.preventDefault();
    const muscleId = selectRequestMuscle.value;
    const muscleDef = window.MUSCLE_DEFINITIONS[muscleId];
    const patientName = document.getElementById('request-name').value || 'Paciente Anónimo';
    const goal = document.getElementById('request-goal').value;
    const symptom = document.getElementById('request-desc').value;
    const painLevel = parseInt(sliderPain.value);

    const newReq = window.KineStore.createRequest({
      patientName,
      zone: muscleDef ? muscleDef.zone : 'Zona general',
      muscleId: muscleId || 'lumbar_spine',
      goal,
      symptom,
      painLevel
    });

    modalNewRequest.classList.add('hidden');
    modalNewRequest.classList.remove('flex');
    formNewRequest.reset();
    sliderPainVal.textContent = '5';

    showToast('✅ Tu consulta ha sido enviada al kinesiólogo.');
    renderRequestsList();
    selectPatientRequest(newReq);
  });

  // --- SISTEMA TOAST NOTIFICACIONES ---
  function showToast(message, type = 'info') {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 flex items-center gap-3 text-sm font-medium border';
      document.body.appendChild(toast);
    }

    if (type === 'warning') {
      toast.className = 'fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 flex items-center gap-3 text-sm font-medium border bg-amber-950/90 border-amber-500/50 text-amber-200';
    } else {
      toast.className = 'fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 flex items-center gap-3 text-sm font-medium border bg-slate-900/95 border-sky-500/50 text-sky-100';
    }

    toast.innerHTML = `<span>${message}</span>`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
    }, 4000);
  }

  // --- NAVEGACIÓN MÓVIL (Pestañas Modelo 3D / Controles) ---
  const mobileBtn3D = document.getElementById('mobile-btn-3d');
  const mobileBtnPanel = document.getElementById('mobile-btn-panel');
  const mainAsidePanel = document.getElementById('main-aside-panel');

  if (mobileBtn3D && mobileBtnPanel && mainAsidePanel) {
    function setMobileView(view) {
      if (view === '3d') {
        mainAsidePanel.classList.add('hidden');
        mainAsidePanel.classList.remove('flex');
        mobileBtn3D.classList.add('text-sky-400', 'font-bold');
        mobileBtn3D.classList.remove('text-slate-400');
        mobileBtnPanel.classList.remove('text-sky-400', 'font-bold');
        mobileBtnPanel.classList.add('text-slate-400');
        viewer.onWindowResize();
      } else {
        mainAsidePanel.classList.remove('hidden');
        mainAsidePanel.classList.add('flex');
        mobileBtnPanel.classList.add('text-sky-400', 'font-bold');
        mobileBtnPanel.classList.remove('text-slate-400');
        mobileBtn3D.classList.remove('text-sky-400', 'font-bold');
        mobileBtn3D.classList.add('text-slate-400');
      }
    }

    mobileBtn3D.addEventListener('click', () => setMobileView('3d'));
    mobileBtnPanel.addEventListener('click', () => setMobileView('panel'));

    if (btnFocusPatientMuscle) {
      btnFocusPatientMuscle.addEventListener('click', () => {
        if (window.innerWidth < 768) setMobileView('3d');
      });
    }
  }

  // Inicializar estado inicial
  renderRequestsList();
  switchRole(currentRole);
  if (activeRequest) {
    selectPatientRequest(activeRequest);
  }
  if (window.lucide) window.lucide.createIcons();
});
