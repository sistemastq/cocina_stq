// ================================
// 🔵 LOADER GLOBAL
// ================================
function showLoader(text = "Cargando...") {
  const loader = document.getElementById("loader");
  if (!loader) return;

  const p = loader.querySelector("p");
  if (p) p.textContent = text;

  loader.classList.remove("hidden");
}

function hideLoader() {
  const loader = document.getElementById("loader");
  if (!loader) return;

  loader.classList.add("hidden");
}

// ================================
// 🔵 MODAL GLOBAL
// ================================
function showModal(msg) {
  const modal = document.getElementById("modal");
  if (!modal) return;

  const t = document.getElementById("modal-text");
  if (t) t.textContent = msg;

  modal.classList.remove("hidden");
}

function cerrarModal() {
  const modal = document.getElementById("modal");
  if (!modal) return;

  modal.classList.add("hidden");
}

// ================================
// 🟠 MODAL DEMORA (> 1 hora en el estado)
// ================================
let demoraAbierta = null; // { id, estado }
const UMBRAL_DEMORA_MS = 60 * 60 * 1000; // 1 hora
const POSPONER_MS = 10 * 60 * 1000; // 10 min

function abrirModalDemora(pedido, msEnEstado) {
  const modal = document.getElementById("modalDemora");
  if (!modal) return;

  const setText = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v ?? "—";
  };

  setText("demoraTitulo", `Pedido #${pedido.id}`);
  setText("demoraCliente", pedido.nombre_cliente || "—");
  setText("demoraCelular", pedido.celular_cliente || "—");
  setText("demoraDireccion", pedido.direccion_cliente || "—");
  setText("demoraEstado", pedido.estado || "—");
  setText("demoraTiempo", formatDuration(msEnEstado));

  demoraAbierta = { id: pedido.id, estado: pedido.estado };
  modal.classList.remove("hidden");
}

function cerrarModalDemora() {
  const modal = document.getElementById("modalDemora");
  if (!modal) return;

  modal.classList.add("hidden");
  demoraAbierta = null;
}

function keyAvisado(id, estado) {
  return `demora_avisada_${id}_${estado}`;
}

function keyPosponer(id, estado) {
  return `demora_posponer_${id}_${estado}`;
}

function marcarDemoraComoAvisada() {
  if (!demoraAbierta) return cerrarModalDemora();

  try {
    localStorage.setItem(
      keyAvisado(demoraAbierta.id, demoraAbierta.estado),
      "1"
    );
    localStorage.removeItem(
      keyPosponer(demoraAbierta.id, demoraAbierta.estado)
    );
  } catch (_) {}

  const id = demoraAbierta.id;
  cerrarModalDemora();
  showModal(`Marcado como avisado: Pedido #${id}`);
}

function posponerDemora() {
  if (!demoraAbierta) return cerrarModalDemora();

  const until = Date.now() + POSPONER_MS;
  try {
    localStorage.setItem(
      keyPosponer(demoraAbierta.id, demoraAbierta.estado),
      String(until)
    );
  } catch (_) {}

  cerrarModalDemora();
}

// ================================
// ✅ HISTÓRICO: Listo -> histórico en 5 min (UI)
// ================================
const HISTORICO_DELAY_MS = 5 * 60 * 1000;

function keyHistWarned(id, listoAtIso) {
  return `hist_warned_${id}_${listoAtIso || "noiso"}`;
}

function showHistoricoEn5MinModal(p) {
  const listoAt = getTs(p, "listo_at");
  if (!listoAt) return;

  const k = keyHistWarned(p.id, listoAt.toISOString());
  let ya = false;
  try {
    ya = localStorage.getItem(k) === "1";
  } catch (_) {}
  if (ya) return;

  try {
    localStorage.setItem(k, "1");
  } catch (_) {}

  showModal(
    `Pedido #${p.id} está en "Listo" y pasará al histórico en 5 minutos.`
  );
}

function esHistorico(p) {
  if ((p.estado || "") !== "Listo") return false;
  const listoAt = getTs(p, "listo_at");
  if (!listoAt) return false;
  return Date.now() - listoAt.getTime() >= HISTORICO_DELAY_MS;
}

// ================================
// 🔵 Estado global
// ================================
let ultimoIdsPedidos = new Set();
let primeraCarga = true;
let pedidosCache = [];
let lastAutoRefresh = 0;

// ✅ Usuario (nombre) para mostrar en tarjetas
function getUsuarioNombre() {
  let u = null;
  try {
    u = JSON.parse(localStorage.getItem("usuario") || "null");
  } catch (_) {
    u = null;
  }
  const nombre =
    u?.nombre || u?.Nombre || u?.name || u?.usuario || u?.displayName || "";
  return (nombre || "").toString().trim() || "Usuario";
}

// ================================
// 🔵 Utilidades de tiempo
// ================================
function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function formatDuration(ms) {
  if (ms == null) return "—";
  if (ms < 0) ms = 0;

  const totalSec = Math.floor(ms / 1000);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;

  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

function formatCountdown(ms) {
  if (ms == null) return "—";
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(mm)}:${pad(ss)}`;
}

// ===== timestamps fallback local (respaldo si backend no trae timestamps) =====
function keyTs(id, field) {
  return `ts_${id}_${field}`;
}

function getLocalTs(id, field) {
  try {
    return localStorage.getItem(keyTs(id, field)) || "";
  } catch (_) {
    return "";
  }
}

function setLocalTs(id, field, iso) {
  try {
    localStorage.setItem(keyTs(id, field), iso);
  } catch (_) {}
}

function getTs(p, field) {
  return parseDate(p?.[field]) || parseDate(getLocalTs(p?.id, field)) || null;
}

function applyLocalTimestamps(p) {
  const fields = [
    "recibido_at",
    "en_preparacion_at",
    "listo_at",
    "en_camino_at",
    "entregado_at",
  ];
  const out = { ...p };
  for (const f of fields) {
    if (!out[f]) {
      const v = getLocalTs(out.id, f);
      if (v) out[f] = v;
    }
  }
  return out;
}

function ensureListoAtLocal(p) {
  if ((p.estado || "") !== "Listo") return p;
  if (getTs(p, "listo_at")) return p;

  const iso = new Date().toISOString();
  setLocalTs(p.id, "listo_at", iso);
  return { ...p, listo_at: iso };
}

function getEstadoStart(p) {
  const now = new Date();

  const created = parseDate(p.created_at) || now;
  const recibido = getTs(p, "recibido_at") || created;
  const prep = getTs(p, "en_preparacion_at");
  const listo = getTs(p, "listo_at");
  const camino = getTs(p, "en_camino_at");
  const entregado = getTs(p, "entregado_at");

  const est = p.estado || "Recibido";

  if (est === "Recibido") return recibido || now;
  if (est === "En preparación") return prep || now;
  if (est === "Listo") return listo || now;
  if (est === "En camino") return camino || now;
  if (est === "Entregado") return entregado || now;

  return recibido || now;
}

function calcDuraciones(p) {
  const now = new Date();

  const created = parseDate(p.created_at) || now;
  const recibido = getTs(p, "recibido_at") || created;

  const prep = getTs(p, "en_preparacion_at");
  const listo = getTs(p, "listo_at");
  const camino = getTs(p, "en_camino_at");
  const entregado = getTs(p, "entregado_at");

  const est = p.estado || "Recibido";

  const tRec = recibido
    ? prep
      ? prep.getTime() - recibido.getTime()
      : est === "Recibido"
      ? now.getTime() - recibido.getTime()
      : null
    : null;

  const tPrep = prep
    ? listo
      ? listo.getTime() - prep.getTime()
      : est === "En preparación"
      ? now.getTime() - prep.getTime()
      : null
    : null;

  const finListo = camino || entregado;
  const tListo = listo
    ? finListo
      ? finListo.getTime() - listo.getTime()
      : est === "Listo"
      ? now.getTime() - listo.getTime()
      : null
    : null;

  const tCamino = camino
    ? entregado
      ? entregado.getTime() - camino.getTime()
      : est === "En camino"
      ? now.getTime() - camino.getTime()
      : null
    : null;

  const inicioTotal = recibido || created;
  const finTotal = entregado || now;
  const tTotal = inicioTotal
    ? finTotal.getTime() - inicioTotal.getTime()
    : null;

  const startEstado = getEstadoStart(p);
  const tEstadoActual = startEstado
    ? now.getTime() - startEstado.getTime()
    : null;

  return { tRec, tPrep, tListo, tCamino, tTotal, tEstadoActual };
}

// ================================
// 🔵 Cargar pedidos del backend
// ================================
document.addEventListener("DOMContentLoaded", () => {
  cargarPedidos();
  setInterval(cargarPedidos, 10000);
  setInterval(tickTimers, 1000);

  // Modal detalle: cerrar al click fuera + ESC
  setupModalDetalle();
});

async function cargarPedidos() {
  try {
    if (primeraCarga) showLoader("Cargando pedidos...");

    const usuarioLogin = JSON.parse(localStorage.getItem("usuario") || "null");
    if (!usuarioLogin || !usuarioLogin.correo) {
      hideLoader();
      showModal("No se ha iniciado sesión.");
      return;
    }

    const puntoVentaUsuario =
      usuarioLogin.PuntoVenta ||
      usuarioLogin.puntoventa ||
      usuarioLogin.puntoVenta ||
      null;

    const resPedidos = await fetch(
      `/api/pedidos?correo=${encodeURIComponent(usuarioLogin.correo)}`
    );

    if (!resPedidos.ok) {
      hideLoader();
      showModal("Error al cargar pedidos.");
      console.error("Error al consultar /api/pedidos:", resPedidos.status);
      return;
    }

    let pedidos = await resPedidos.json();
    if (!Array.isArray(pedidos)) pedidos = [];

    pedidos = pedidos.map((p) => ({
      ...p,
      puntoventa: p.puntoventa ?? p.PuntoVenta ?? p.puntoVenta ?? "",
    }));

    pedidos = pedidos.map(applyLocalTimestamps).map(ensureListoAtLocal);

    if (puntoVentaUsuario) {
      pedidos = pedidos.filter((p) => {
        const pv = p.PuntoVenta || p.puntoventa || p.puntoVenta || p.puntoventa;
        return pv === puntoVentaUsuario;
      });
    }

    pedidosCache = pedidos;

    detectarNuevosPedidos(pedidos);

    const recibido = pedidos.filter((p) => (p.estado || "") === "Recibido");
    const preparacion = pedidos.filter(
      (p) => (p.estado || "") === "En preparación"
    );

    // HOME: mostrar Listo SOLO si NO es histórico (Listo < 5 min)
    const listoPanel = pedidos.filter((p) => {
      if ((p.estado || "") !== "Listo") return false;
      return !esHistorico(p);
    });

    // Aviso: “pasará a histórico”
    listoPanel.forEach(showHistoricoEn5MinModal);

    renderColumna("recibido", recibido);
    renderColumna("preparacion", preparacion);
    renderColumna("listo", listoPanel);

    actualizarContadores(
      recibido.length,
      preparacion.length,
      listoPanel.length
    );
    mostrarNombreLocal(usuarioLogin);

    checkDemoras();

    hideLoader();
    primeraCarga = false;
  } catch (err) {
    hideLoader();
    showModal("No se pudo conectar al servidor.");
    console.error("Error conectando al backend:", err);
  }
}

// ================================
// 🟠 Detectar nuevos pedidos y notificar
// ================================
function detectarNuevosPedidos(pedidos) {
  const idsActuales = new Set(pedidos.map((p) => p.id));

  if (ultimoIdsPedidos.size > 0) {
    const nuevos = pedidos.filter((p) => !ultimoIdsPedidos.has(p.id));
    if (nuevos.length > 0) {
      reproducirSonidoNuevoPedido();
      const nums = nuevos.map((p) => `#${p.id}`).join(", ");
      showModal(`¡Nuevo pedido recibido! (${nums})`);
    }
  }

  ultimoIdsPedidos = idsActuales;
}

function reproducirSonidoNuevoPedido() {
  const audio = document.getElementById("new-order-sound");
  if (!audio) return;

  try {
    audio.currentTime = 0;
    audio.play().catch((err) => {
      console.warn("No se pudo reproducir el sonido de nuevo pedido:", err);
    });
  } catch (e) {
    console.warn("Error reproduciendo sonido:", e);
  }
}

// ================================
// 🟠 Actualizar contadores
// ================================
function actualizarContadores(recibidoCount, prepCount, listoCount) {
  const cRec = document.getElementById("count-recibido");
  const cPrep = document.getElementById("count-preparacion");
  const cLis = document.getElementById("count-listo");

  if (cRec) cRec.textContent = recibidoCount;
  if (cPrep) cPrep.textContent = prepCount;
  if (cLis) cLis.textContent = listoCount;
}

// ================================
// 🟠 Cambiar estado con loader
// ================================
async function cambiarEstado(id, estado) {
  try {
    const actual = pedidosCache.find((x) => String(x.id) === String(id));
    const estActual = actual?.estado || "";

    // Regla: si ya está Listo, no permitir devolverse
    if (estActual === "Listo" && estado !== "Listo") {
      showModal(
        `No puedes cambiar el Pedido #${id} porque ya está en "Listo".`
      );
      return;
    }

    showLoader("Actualizando estado...");

    const res = await fetch("/api/pedidos/estado", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, estado }),
    });

    hideLoader();

    if (!res.ok) {
      showModal("Error al actualizar el estado.");
      console.error("Error al actualizar estado", res.status);
      return;
    }

    // respaldo local (por si el fetch siguiente tarda)
    const mapField = {
      Recibido: "recibido_at",
      "En preparación": "en_preparacion_at",
      Listo: "listo_at",
      "En camino": "en_camino_at",
      Entregado: "entregado_at",
    };
    const field = mapField[estado];
    if (field) setLocalTs(id, field, new Date().toISOString());

    showModal(`Pedido #${id} ahora está en: ${estado}`);
    cargarPedidos();
  } catch (err) {
    hideLoader();
    showModal("Error desconocido al cambiar estado.");
    console.error("Error al actualizar estado:", err);
  }
}

// ================================
// 🟢 Renderizar columna
// ================================
function renderColumna(id, pedidos) {
  const cont = document.getElementById(id);
  if (!cont) return;

  if (!pedidos || pedidos.length === 0) {
    cont.innerHTML = `
      <div class="flex flex-col items-center justify-center py-8 text-center text-xs text-slate-400 dark:text-slate-500">
        <span class="material-symbols-outlined mb-1 text-lg">receipt_long</span>
        <span>Sin pedidos en esta columna</span>
      </div>
    `;
    return;
  }

  cont.innerHTML = pedidos.map((p) => crearTarjeta(p)).join("");
}

// ================================
// 🟣 Tarjeta COMPACTA: SOLO tiempos + botones (sin recibo)
// ================================
function crearTarjeta(p) {
  const usuarioNombre = getUsuarioNombre();
  const d = calcDuraciones(p);

  const createdAt = p.created_at || "";
  const recibidoAt = p.recibido_at || "";
  const prepAt = p.en_preparacion_at || "";
  const listoAt = p.listo_at || "";
  const caminoAt = p.en_camino_at || "";
  const entregadoAt = p.entregado_at || "";

  let histHtml = "";
  if ((p.estado || "") === "Listo") {
    const listoDate = getTs(p, "listo_at");
    if (listoDate) {
      const ms = Date.now() - listoDate.getTime();
      const remain = HISTORICO_DELAY_MS - ms;
      histHtml = `
        <div class="mb-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
          Pasa a histórico en: <span class="hist-countdown">${formatCountdown(
            remain
          )}</span>
        </div>
      `;
    }
  }

  const permitirVolver =
    (p.estado || "") !== "Recibido" && (p.estado || "") !== "Listo";

  return `
    <div
      class="bg-white/95 dark:bg-slate-800 rounded-xl shadow-sm border border-black/5 dark:border-white/10 p-3"
      data-pedido="1"
      data-id="${p.id}"
      data-estado="${p.estado || ""}"
      data-created_at="${createdAt}"
      data-recibido_at="${recibidoAt}"
      data-prep_at="${prepAt}"
      data-listo_at="${listoAt}"
      data-camino_at="${caminoAt}"
      data-entregado_at="${entregadoAt}"
    >
      <div class="flex items-center justify-between mb-2">
        <div class="min-w-0">
          <h3 class="text-sm font-extrabold text-slate-900 dark:text-white truncate">
            Pedido #${p.id}
            <span class="text-[11px] font-bold text-slate-500 dark:text-slate-300">· ${usuarioNombre}</span>
          </h3>
        </div>
        <span class="text-[11px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200">
          ${p.estado || "—"}
        </span>
      </div>

      ${histHtml}

      <!-- ⏱️ tiempos (compacto) -->
      <div class="grid grid-cols-2 gap-2 text-[11px] mb-2">
        <div class="rounded-xl bg-white/70 dark:bg-black/20 border border-black/5 dark:border-white/10 p-2">
          <span class="text-slate-500 dark:text-slate-300">En estado:</span>
          <span class="font-extrabold text-slate-900 dark:text-white block dur-estado">${formatDuration(
            d.tEstadoActual
          )}</span>
        </div>
        <div class="rounded-xl bg-white/70 dark:bg-black/20 border border-black/5 dark:border-white/10 p-2">
          <span class="text-slate-500 dark:text-slate-300">Total:</span>
          <span class="font-extrabold text-slate-900 dark:text-white block dur-total">${formatDuration(
            d.tTotal
          )}</span>
        </div>
        <div class="rounded-xl bg-white/70 dark:bg-black/20 border border-black/5 dark:border-white/10 p-2">
          <span class="text-slate-500 dark:text-slate-300">Recibido:</span>
          <span class="font-bold text-slate-900 dark:text-white block dur-rec">${formatDuration(
            d.tRec
          )}</span>
        </div>
        <div class="rounded-xl bg-white/70 dark:bg-black/20 border border-black/5 dark:border-white/10 p-2">
          <span class="text-slate-500 dark:text-slate-300">Preparación:</span>
          <span class="font-bold text-slate-900 dark:text-white block dur-prep">${formatDuration(
            d.tPrep
          )}</span>
        </div>
        <div class="rounded-xl bg-white/70 dark:bg-black/20 border border-black/5 dark:border-white/10 p-2">
          <span class="text-slate-500 dark:text-slate-300">Listo:</span>
          <span class="font-bold text-slate-900 dark:text-white block dur-listo">${formatDuration(
            d.tListo
          )}</span>
        </div>
        <div class="rounded-xl bg-white/70 dark:bg-black/20 border border-black/5 dark:border-white/10 p-2">
          <span class="text-slate-500 dark:text-slate-300">Camino:</span>
          <span class="font-bold text-slate-900 dark:text-white block dur-camino">${formatDuration(
            d.tCamino
          )}</span>
        </div>
      </div>

      <!-- Botones -->
      <div class="flex gap-2 flex-wrap justify-end">
        <button
          onclick="abrirDetallePedido(${p.id})"
          class="px-3 py-1.5 text-xs font-extrabold rounded-full bg-indigo-600 text-white flex items-center gap-1"
          title="Ver detalle del pedido"
        >
          <span class="material-symbols-outlined text-[16px]">visibility</span>
          <span>Ver detalle</span>
        </button>

        <button
          onclick="imprimirPedido(${p.id})"
          class="px-3 py-1.5 text-xs font-extrabold rounded-full bg-sky-600 text-white flex items-center gap-1"
        >
          <span class="material-symbols-outlined text-[16px]">print</span>
          <span>Imprimir</span>
        </button>

        ${
          permitirVolver
            ? `
          <button onclick="cambiarEstado(${p.id}, 'Recibido')"
            class="px-3 py-1.5 text-xs font-extrabold rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100">
            ← Volver
          </button>`
            : ""
        }

        ${
          (p.estado || "") === "Recibido"
            ? `
          <button onclick="cambiarEstado(${p.id}, 'En preparación')"
            class="px-3 py-1.5 text-xs font-extrabold rounded-full bg-primary text-white">
            Preparar →
          </button>`
            : ""
        }

        ${
          (p.estado || "") === "En preparación"
            ? `
          <button onclick="cambiarEstado(${p.id}, 'Listo')"
            class="px-3 py-1.5 text-xs font-extrabold rounded-full bg-emerald-600 text-white">
            Marcar listo ✓
          </button>`
            : ""
        }
      </div>
    </div>
  `;
}

// ================================
// ⏱️ Tick: actualiza duraciones + countdown histórico
// ================================
function tickTimers() {
  const cards = document.querySelectorAll('[data-pedido="1"]');
  if (!cards || cards.length === 0) return;

  let necesitaRefresh = false;

  cards.forEach((card) => {
    const p = {
      id: card.dataset.id,
      estado: card.dataset.estado,
      created_at: card.dataset.created_at,
      recibido_at: card.dataset.recibido_at,
      en_preparacion_at: card.dataset.prep_at,
      listo_at: card.dataset.listo_at,
      en_camino_at: card.dataset.camino_at,
      entregado_at: card.dataset.entregado_at,
    };

    const d = calcDuraciones(p);

    const set = (selector, val) => {
      const el = card.querySelector(selector);
      if (el) el.textContent = val;
    };

    set(".dur-estado", formatDuration(d.tEstadoActual));
    set(".dur-total", formatDuration(d.tTotal));
    set(".dur-rec", formatDuration(d.tRec));
    set(".dur-prep", formatDuration(d.tPrep));
    set(".dur-listo", formatDuration(d.tListo));
    set(".dur-camino", formatDuration(d.tCamino));

    if ((p.estado || "") === "Listo") {
      let listoAt = parseDate(p.listo_at);

      if (!listoAt) {
        const iso = new Date().toISOString();
        setLocalTs(p.id, "listo_at", iso);
        listoAt = new Date(iso);
        card.dataset.listo_at = iso;
      }

      const el = card.querySelector(".hist-countdown");
      if (el && listoAt) {
        const ms = Date.now() - listoAt.getTime();
        const remain = HISTORICO_DELAY_MS - ms;
        el.textContent = formatCountdown(remain);
        if (remain <= 0) necesitaRefresh = true;
      }
    }
  });

  if (necesitaRefresh && Date.now() - lastAutoRefresh > 3000) {
    lastAutoRefresh = Date.now();
    cargarPedidos();
  }

  checkDemoras();
}

// ================================
// ⚠️ Demoras
// ================================
function checkDemoras() {
  if (demoraAbierta) return;

  for (const p of pedidosCache) {
    if (!p || !p.id) continue;
    if (!p.estado) continue;

    const start = getEstadoStart(p);
    const ms = Date.now() - start.getTime();
    if (ms <= UMBRAL_DEMORA_MS) continue;

    let avisado = false;
    try {
      avisado = localStorage.getItem(keyAvisado(p.id, p.estado)) === "1";
    } catch (_) {}
    if (avisado) continue;

    let until = 0;
    try {
      until =
        parseInt(
          localStorage.getItem(keyPosponer(p.id, p.estado)) || "0",
          10
        ) || 0;
    } catch (_) {
      until = 0;
    }
    if (until && Date.now() < until) continue;

    abrirModalDemora(p, ms);
    return;
  }
}

// ================================
// 🧾 MODAL DETALLE (editable)
// ================================
let detalleAbierto = null; // { id, originalText }

function setupModalDetalle() {
  const modal = document.getElementById("modalDetalle");
  if (!modal) return;

  // click fuera -> cerrar
  modal.addEventListener("click", (e) => {
    if (e.target === modal) cerrarDetallePedido();
  });

  // ESC -> cerrar
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const m = document.getElementById("modalDetalle");
      if (m && !m.classList.contains("hidden")) cerrarDetallePedido();
    }
  });

  const ta = document.getElementById("detalleTexto");
  if (ta) {
    ta.addEventListener("input", () => {
      syncDetalleButtons();
    });
  }
}

function abrirDetallePedido(id) {
  const modal = document.getElementById("modalDetalle");
  if (!modal) {
    showModal("No existe el modal de detalle (#modalDetalle).");
    return;
  }

  const pedido = pedidosCache.find((p) => String(p.id) === String(id));
  if (!pedido) {
    showModal(`No se encontró el pedido #${id} en memoria.`);
    return;
  }

  const setText = (elId, v) => {
    const el = document.getElementById(elId);
    if (el) el.textContent = (v ?? "—").toString();
  };

  setText("detalleTitulo", `Pedido #${pedido.id}`);
  setText("detalleCliente", pedido.nombre_cliente || "—");
  setText("detalleCelular", pedido.celular_cliente || "—");
  setText("detalleDireccion", pedido.direccion_cliente || "—");
  setText("detalleEstado", pedido.estado || "—");

  const txt = (pedido.resumen_pedido ?? "").toString();
  const ta = document.getElementById("detalleTexto");
  if (ta) ta.value = txt;

  detalleAbierto = { id: pedido.id, originalText: txt };

  syncDetalleButtons();
  modal.classList.remove("hidden");
}

function cerrarDetallePedido() {
  const modal = document.getElementById("modalDetalle");
  if (!modal) return;
  modal.classList.add("hidden");
  detalleAbierto = null;
}

function cancelarCambiosDetalle() {
  if (!detalleAbierto) return cerrarDetallePedido();
  const ta = document.getElementById("detalleTexto");
  if (ta) ta.value = detalleAbierto.originalText || "";
  syncDetalleButtons();
}

function syncDetalleButtons() {
  const btnGuardar = document.getElementById("btnGuardarDetalle");
  const btnCancelar = document.getElementById("btnCancelarDetalle");
  const ta = document.getElementById("detalleTexto");

  if (!btnGuardar || !btnCancelar || !ta || !detalleAbierto) return;

  const actual = (ta.value ?? "").toString();
  const original = (detalleAbierto.originalText ?? "").toString();
  const changed = actual !== original;

  btnGuardar.disabled = !changed;
  btnGuardar.classList.toggle("opacity-50", !changed);
  btnGuardar.classList.toggle("cursor-not-allowed", !changed);

  btnCancelar.disabled = !changed;
  btnCancelar.classList.toggle("opacity-50", !changed);
  btnCancelar.classList.toggle("cursor-not-allowed", !changed);
}

async function guardarDetallePedido() {
  if (!detalleAbierto) return cerrarDetallePedido();

  const ta = document.getElementById("detalleTexto");
  if (!ta) return;

  const nuevo = (ta.value ?? "").toString();
  const original = (detalleAbierto.originalText ?? "").toString();
  if (nuevo === original) return; // nada que guardar

  try {
    showLoader("Guardando detalle...");

    const res = await fetch("/api/pedidos/resumen", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: detalleAbierto.id, resumen_pedido: nuevo }),
    });

    hideLoader();

    if (!res.ok) {
      showModal("No se pudo guardar el detalle.");
      return;
    }

    // actualiza cache local
    const idx = pedidosCache.findIndex(
      (p) => String(p.id) === String(detalleAbierto.id)
    );
    if (idx >= 0)
      pedidosCache[idx] = { ...pedidosCache[idx], resumen_pedido: nuevo };

    detalleAbierto.originalText = nuevo;
    syncDetalleButtons();
    showModal(`Detalle guardado para Pedido #${detalleAbierto.id}`);
  } catch (e) {
    hideLoader();
    console.error(e);
    showModal("Error inesperado guardando el detalle.");
  }
}

// ================================
// 🖨 Imprimir pedido
// ================================
async function imprimirPedido(id) {
  try {
    let config = {};
    try {
      config = JSON.parse(localStorage.getItem("configImpresora") || "{}");
    } catch (e) {
      config = {};
    }

    if (!config.nombre) {
      showModal(
        "No hay una impresora configurada. Ve a 'Configurar impresora' en el menú."
      );
      return;
    }

    const ip = config.nombre;
    const port = config.puerto || config.port || 9100;

    showLoader("Enviando pedido a la impresora...");

    const res = await fetch("/api/pedidos/imprimir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ip, port }),
    });

    hideLoader();

    let data = {};
    try {
      data = await res.json();
    } catch (_) {
      data = {};
    }

    if (!res.ok) {
      console.error("Error al imprimir pedido:", data);
      showModal(data.error || "No se pudo imprimir el pedido.");
      return;
    }

    showModal(`Pedido #${id} enviado a la impresora.`);
  } catch (err) {
    hideLoader();
    console.error("Error general imprimiendo pedido:", err);
    showModal("Error inesperado al intentar imprimir el pedido.");
  }
}

// ================================
// 🔵 Mostrar nombre del local
// ================================
function mostrarNombreLocal(usuario) {
  const titulo = document.getElementById("tituloLocal");
  if (!titulo) return;

  const puntoVenta =
    usuario?.PuntoVenta || usuario?.puntoventa || usuario?.puntoVenta;

  if (!puntoVenta) {
    titulo.textContent = "Panel de Pedidos";
    return;
  }
  titulo.textContent = `Panel de Pedidos – ${puntoVenta}`;
}

// ================================
// ✅ Ir a histórico
// ================================
function irHistorico() {
  window.location.href = "/historico.html";
}

// ================================
// 🔴 Cerrar sesión
// ================================
async function cerrarSesion() {
  try {
    showLoader("Cerrando sesión...");
    localStorage.removeItem("usuario");
    hideLoader();
    showModal("Sesión cerrada correctamente.");

    setTimeout(() => {
      window.location.href = "/login.html";
    }, 1200);
  } catch (err) {
    hideLoader();
    showModal("No se pudo cerrar la sesión.");
    console.error("Error cerrando sesión:", err);
  }
}
function getUsuarioLoginSafe() {
  try {
    return JSON.parse(localStorage.getItem("usuario") || "null");
  } catch (_) {
    return null;
  }
}

function getPuntoVenta(usuario) {
  return (
    usuario?.PuntoVenta ||
    usuario?.puntoventa ||
    usuario?.puntoVenta ||
    "Sin punto de venta"
  );
}

function getConfigImpresoraSafe() {
  try {
    return JSON.parse(localStorage.getItem("configImpresora") || "{}");
  } catch (_) {
    return {};
  }
}

/**
 * Abre Gmail con el correo prellenado.
 * Intenta abrir la app de Gmail (Android/iOS). Si no, cae a Gmail Web.
 */
function abrirGmailPrefill({ to, subject, body }) {
  const gmailWeb =
    "https://mail.google.com/mail/?view=cm&fs=1" +
    `&to=${encodeURIComponent(to)}` +
    `&su=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  // URL scheme para abrir app Gmail (puede depender del dispositivo)
  const gmailApp =
    "googlegmail:///co?to=" +
    encodeURIComponent(to) +
    "&subject=" +
    encodeURIComponent(subject) +
    "&body=" +
    encodeURIComponent(body);

  // Intento 1: app (móvil)
  // Si falla (desktop o móvil sin Gmail), abrimos web.
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    // Intentar abrir app
    window.location.href = gmailApp;

    // Fallback a web si no abre (muy común)
    setTimeout(() => {
      window.open(gmailWeb, "_blank", "noopener,noreferrer");
    }, 600);
  } else {
    // Desktop: Gmail web
    window.open(gmailWeb, "_blank", "noopener,noreferrer");
  }
}

/**
 * Botón del footer: soporte exclusivo del local
 */
function contactarSoporteGmail(tipo = "App") {
  const usuario = getUsuarioLoginSafe();
  const pv = getPuntoVenta(usuario);

  const cfg = getConfigImpresoraSafe();
  const impresora = cfg?.nombre
    ? `${cfg.nombre}:${cfg.puerto || cfg.port || 9100}`
    : "No configurada";

  // Puedes cambiar este correo al real del soporte
  const to = "ingenierosistemas@tierraquerida.com.co";

  const subject = `[Soporte ${pv}] ${tipo}`;

  const body = `Hola soporte,

Necesito ayuda con: ${tipo}

Datos del local:
- Punto de venta: ${pv}
- Usuario (correo): ${usuario?.correo || "—"}

Impresora actual:
- ${impresora}

Descripción del problema:
(Escribe aquí qué pasó, qué estabas haciendo, y si hay un ID de pedido)

IDs de pedidos relacionados (si aplica):
- Pedido #_____

Gracias.`;

  abrirGmailPrefill({ to, subject, body });
}
