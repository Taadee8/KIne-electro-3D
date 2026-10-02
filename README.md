# KineElectro 3D ⚡🦾
> **Plataforma Kinesiológica Tridimensional para la Prescripción y Orientación de Electrodos**

---

## 🌟 Resumen del Proyecto

**KineElectro 3D** es una aplicación web interactiva diseñada para conectar a un profesional kinesiólogo con el paciente. Permite que el kinesiólogo reciba solicitudes de tratamiento, explore un **modelo anatómico 3D de los músculos del cuerpo humano**, marque con precisión milimétrica mediante **raycasting 3D** la ubicación exacta de los electrodos (Polo positivo/negativo y canales), configure los parámetros electroterapéuticos (TENS/EMS, Hz, µs, minutos) y se los transmita al paciente de forma clara y visual con temporizador de sesión integrado.

---

## 🚀 Cómo Iniciar la Aplicación

Tienes dos formas muy sencillas de abrir y usar la aplicación:

### Opción 1: Directo en el navegador (Sin comandos)
Haz doble clic sobre el archivo:
```
C:\Users\omega\.gemini\antigravity\scratch\kine-electro-3d\index.html
```
¡Se abrirá de inmediato en tu navegador preferido (Edge, Chrome, Firefox, Brave)! Todas las librerías 3D (`Three.js`, `OrbitControls`, `Lucide`, `Tailwind`) están descargadas localmente en la carpeta `vendor/`.

### Opción 2: Servidor Local Integrado (PowerShell - PC y Celular)
En una terminal PowerShell dentro de esta carpeta, ejecuta:
```powershell
powershell -ExecutionPolicy Bypass -File .\start_server.ps1
```
Esto levantará el servidor HTTP local y te mostrará dos enlaces:
- **En tu PC:** `http://localhost:8080/index.html`
- **En tu CELULAR (mismo Wi-Fi):** `http://192.168.0.28:8080/index.html` (o la IP local detectada)

### Opción 3: Subirlo gratis a la nube (Para que cualquier paciente acceda desde cualquier lugar)
Como es una aplicación web 100% estática (con todas las librerías guardadas en `vendor/`), puedes publicarla gratis en 2 minutos:
1. Arrastra esta carpeta a [Netlify Drop](https://app.netlify.com/drop).
2. O súbela a un repositorio de GitHub y activa **GitHub Pages** (Settings > Pages).
¡Obtendrás un enlace seguro `https://...` accesible desde cualquier smartphone del mundo sin necesidad de estar en la misma red Wi-Fi!

> **Recomendación para Antigravity:** Te recomendamos establecer esta carpeta (`C:\Users\omega\.gemini\antigravity\scratch\kine-electro-3d`) como tu **espacio de trabajo activo** (Active Workspace) en el editor.

---

## 🕹️ Funcionalidades y Flujo de Trabajo

### 1. 🩺 Modo Kinesiólogo / Terapeuta
* **Bandeja de Consultas de Pacientes**: Visualiza pacientes en espera con su motivo de consulta, nivel de dolor y zona afectada.
* **Navegación 3D Anatómica**:
  * Rotación libre con ratón (órbita 360°), zoom con rueda y paneo lateral.
  * Botones de orientación rápida: *Frente, Espalda, Perfil Izquierdo, Perfil Derecho, Reiniciar vista*.
  * Detección hover sobre los músculos corporales (Pectorales, Cuádriceps, Deltoides, Gemelos, Trapecios, Lumbar, etc.) con tips de **Puntos Motores clínicos**.
* **Colocación de Electrodos en 3D (Raycasting)**:
  * Herramientas de fijación:
    * `Canal 1 (+)` Rojo (Ánodo)
    * `Canal 1 (–)` Negro (Cátodo)
    * `Canal 2 (+)` Azul
    * `Canal 2 (–)` Amarillo
  * Al hacer clic sobre cualquier músculo, el parche adhesivo se orienta automáticamente perpendicular a la superficie anatómica.
  * Se genera automáticamente un **cable conductor 3D tridimensional** entre los polos del mismo canal.
* **Biblioteca de Protocolos Rápidos**:
  * *Lumbalgia Aguda (TENS 100Hz / 4 electrodos cruzados)*.
  * *Reactivación de Vasto Interno Cuádriceps (EMS 50Hz)*.
  * *Contractura Cervical / Trapecio (TENS Burst)*.
  * *Tendinitis de Hombro / Deltoides (TENS 80Hz)*.
* **Emisión de Prescripción**: Define tipo de corriente, frecuencia (Hz), ancho de pulso (µs), tiempo y notas médicas.

---

### 2. 👤 Modo Paciente / Persona a Tratar
* **Solicitar Nueva Indicación**:
  * Formulario interactivo donde el paciente selecciona qué zona muscular le afecta, su objetivo (Alivio del dolor TENS, Tonificación EMS, etc.), una escala de molestia/dolor (1 al 10) y detalles de sus síntomas.
  * Se envía instantáneamente a la bandeja del kinesiólogo.
* **Visualización de la Guía 3D**:
  * El modelo 3D rota y hace zoom automáticamente hacia el músculo prescrito.
  * Los electrodos palpitan suavemente con sus colores representativos para que el paciente no se confunda.
* **Guía Paso a Paso de Colocación**:
  * Lista con instrucciones claras: limpieza previa de la piel, orden de colocación del polo positivo y polo de cierre.
* **Temporizador Clínico con Alerta Sonora**:
  * Cuenta regresiva sincronizada con el tiempo prescrito por el kinesiólogo (ej. 20 min).
  * Controles de Iniciar, Pausar y Reiniciar.
  * Emite un tono sonoro relajante cuando finaliza la sesión.

---

## 📁 Estructura del Código

```
kine-electro-3d/
├── index.html           # Estructura principal, HUD médico, modales y layout
├── styles.css           # Efectos glassmorphism, animaciones de pulso y canvas 3D
├── database.js          # Base de datos anatómica (músculos, puntos motores, presets)
├── electrodes.js        # Motor 3D de electrodos, almohadillas, normales y cables Bézier
├── anatomy3d.js         # Motor 3D Three.js con modelo muscular y raycasting
├── app.js               # Controlador reactivo de la aplicación y flujos de usuario
├── start_server.ps1     # Servidor local nativo para PowerShell
├── vendor/              # Dependencias empaquetadas (Three.js, OrbitControls, Lucide, Tailwind)
└── README.md            # Documentación completa
```
