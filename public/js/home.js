// ================================
// 🔵 LOADER GLOBAL
// ================================
function showLoader(text = "Cargando...") {
  const loader = document.getElementById("loader");
  if (!loader) return;

  loader.querySelector("p").textContent = text;
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

  document.getElementById("modal-text").textContent = msg;
  modal.classList.remove("hidden");
}

function cerrarModal() {
  const modal = document.getElementById("modal");
  if (!modal) return;

  modal.classList.add("hidden");
}

// ================================
// 🔵 Estado global para nuevos pedidos
// ================================
let ultimoIdsPedidos = new Set();
let primeraCarga = true;

// ================================
// 🔵 Cargar pedidos del backend
// ================================
document.addEventListener("DOMContentLoaded", () => {
  cargarPedidos();
  setInterval(cargarPedidos, 10000);
});

async function cargarPedidos() {
  try {
    if (primeraCarga) {
      showLoader("Cargando pedidos...");
    }

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

    if (puntoVentaUsuario) {
      pedidos = pedidos.filter((p) => {
        const pvPedido = p.PuntoVenta || p.puntoventa || p.puntoVenta;
        return pvPedido === puntoVentaUsuario;
      });
    }

    detectarNuevosPedidos(pedidos);

    const recibido = pedidos.filter((p) => p.estado === "Recibido");
    const preparacion = pedidos.filter(
      (p) => p.estado === "En preparación"
    );
    const listo = pedidos.filter((p) => p.estado === "Listo");

    renderColumna("recibido", recibido);
    renderColumna("preparacion", preparacion);
    renderColumna("listo", listo);

    actualizarContadores(recibido.length, preparacion.length, listo.length);

    mostrarNombreLocal(usuarioLogin);

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
// 🟠 Actualizar contadores en header
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
// 🟣 Crear tarjeta visual
// ================================
function crearTarjeta(p) {
  const puntoVenta = p.PuntoVenta || p.puntoventa || p.puntoVenta || "";

  return `
    <div class="bg-white/95 dark:bg-slate-800 rounded-xl shadow-sm border border-black/5 dark:border-white/10 p-3 sm:p-4">
      <div class="flex items-center justify-between mb-2">
        <div>
          <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">
            Pedido #${p.id}
          </h3>
          ${
            puntoVenta
              ? `<p class="text-[11px] text-slate-500 dark:text-slate-400">Punto de venta: ${puntoVenta}</p>`
              : ""
          }
        </div>
        <span class="text-[11px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200">
          ${p.estado}
        </span>
      </div>

      <pre class="recibo mb-3">${p.resumen_pedido}</pre>

      <div class="flex gap-2 flex-wrap justify-end">
        <!-- Botón de imprimir SIEMPRE disponible -->
        <button
          onclick="imprimirPedido(${p.id})"
          class="px-3 py-1.5 text-xs font-bold rounded-full bg-sky-600 text-white flex items-center gap-1"
        >
          <span class="material-symbols-outlined text-[16px]">print</span>
          <span>Imprimir</span>
        </button>

        ${
          p.estado !== "Recibido"
            ? `
          <button onclick="cambiarEstado(${p.id}, 'Recibido')"
            class="px-3 py-1.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100">
            ← Volver
          </button>`
            : ""
        }

        ${
          p.estado === "Recibido"
            ? `
          <button onclick="cambiarEstado(${p.id}, 'En preparación')"
            class="px-3 py-1.5 text-xs font-bold rounded-full bg-primary text-white">
            Preparar →
          </button>`
            : ""
        }

        ${
          p.estado === "En preparación"
            ? `
          <button onclick="cambiarEstado(${p.id}, 'Listo')"
            class="px-3 py-1.5 text-xs font-bold rounded-full bg-emerald-600 text-white">
            Marcar listo ✓
          </button>`
            : ""
        }
      </div>
    </div>
  `;
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
    const port =
      config.puerto || config.port || 9100;

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
