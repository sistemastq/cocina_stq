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
// 🔵 Cargar pedidos del backend
// ================================
document.addEventListener("DOMContentLoaded", () => {
  cargarPedidos();
});

async function cargarPedidos() {
  try {
    showLoader("Cargando pedidos...");

    // 🔹 Obtener usuario logueado (solo correo y contraseña)
    const usuarioLogin = JSON.parse(localStorage.getItem("usuario"));
    if (!usuarioLogin || !usuarioLogin.correo) {
      hideLoader();
      showModal("No se ha iniciado sesión.");
      return;
    }

    // 🔹 Consultar datos completos del usuario desde la base de datos
    const resUsuario = await fetch(`/api/usuario?correo=${encodeURIComponent(usuarioLogin.correo)}`);
    if (!resUsuario.ok) {
      hideLoader();
      showModal("Error al obtener información del usuario.");
      return;
    }
    const usuario = await resUsuario.json(); // Debe traer {correo, contraseña, PuntoVenta, administrador}

    // 🔹 Consultar todos los pedidos
    const resPedidos = await fetch("/api/pedidos");
    if (!resPedidos.ok) {
      hideLoader();
      showModal("Error al cargar pedidos.");
      console.error("Error al consultar /api/pedidos");
      return;
    }
    let pedidos = await resPedidos.json();

    // 🔹 Filtrar por PuntoVenta del usuario
    if (usuario && usuario.PuntoVenta) {
      pedidos = pedidos.filter(p => p.PuntoVenta === usuario.PuntoVenta);
    }

    // 🔹 Filtrado por estado
    const recibido = pedidos.filter(p => p.estado === "Recibido");
    const preparacion = pedidos.filter(p => p.estado === "En preparación");
    const listo = pedidos.filter(p => p.estado === "Listo");

    renderColumna("recibido", recibido);
    renderColumna("preparacion", preparacion);
    renderColumna("listo", listo);

    // 🔹 Mostrar nombre del local
    mostrarNombreLocal(usuario);

    hideLoader();

  } catch (err) {
    hideLoader();
    showModal("No se pudo conectar al servidor.");
    console.error("Error conectando al backend:", err);
  }
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
      console.error("Error al actualizar estado");
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
  document.getElementById(id).innerHTML = pedidos
    .map((p) => crearTarjeta(p))
    .join("");
}

// ================================
// 🟣 Crear tarjeta visual
// ================================
function crearTarjeta(p) {
  return `
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 mb-4">

      <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-2">
        Pedido #${p.id}
      </h3>

      <pre class="recibo">${p.resumen_pedido}</pre>

      <div class="flex gap-2 mt-3 flex-wrap">

        ${
          p.estado !== "Recibido"
            ? `
          <button onclick="cambiarEstado(${p.id}, 'Recibido')"
            class="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white p-2 rounded-lg font-bold">
            ← Volver
          </button>`
            : ""
        }

        ${
          p.estado === "Recibido"
            ? `
          <button onclick="cambiarEstado(${p.id}, 'En preparación')"
            class="flex-1 bg-primary text-white p-2 rounded-lg font-bold">
            Preparar → 
          </button>`
            : ""
        }

        ${
          p.estado === "En preparación"
            ? `
          <button onclick="cambiarEstado(${p.id}, 'Listo')"
            class="flex-1 bg-green-600 text-white p-2 rounded-lg font-bold">
            Marcar listo ✓
          </button>`
            : ""
        }

      </div>
    </div>
  `;
}

// ================================
// 🔵 Mostrar nombre del local
// ================================
function mostrarNombreLocal(usuario) {
  if (!usuario || !usuario.PuntoVenta) {
    document.getElementById("tituloLocal").textContent = "Panel de Pedidos";
    return;
  }
  document.getElementById("tituloLocal").textContent = `Panel de Pedidos – ${usuario.PuntoVenta}`;
}

// ================================
// 🔴 Cerrar sesión (ARREGLADO)
// ================================
async function cerrarSesion() {
  try {
    showLoader("Cerrando sesión...");

    // 🔥 Elimina la sesión del usuario
    localStorage.removeItem("usuario");

    hideLoader();

    // Muestra modal de cierre
    showModal("Sesión cerrada correctamente.");

    // Redirige después de 1.2s
    setTimeout(() => {
      window.location.href = "/login.html";
    }, 1200);

  } catch (err) {
    hideLoader();
    showModal("No se pudo cerrar la sesión.");
    console.error("Error cerrando sesión:", err);
  }
}

