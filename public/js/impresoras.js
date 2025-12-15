// Panel de impresoras (localStorage)
// - Guarda lista en: "impresoras" (array)
// - Guarda activa en: "impresoraActivaId"
// - Mantiene compatibilidad con home.js guardando también:
//     localStorage.configImpresora = { nombre: host, port: puerto, ancho: mm, ... }

(function () {
  // ================================
  // 🔵 UI helpers (loader/modal)
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

  function showModal(msg) {
    const modal = document.getElementById("modal");
    if (!modal) return;
    const t = document.getElementById("modal-text");
    if (t) t.textContent = msg;
    modal.classList.remove("hidden");
  }

  window.cerrarModal = function () {
    const modal = document.getElementById("modal");
    if (!modal) return;
    modal.classList.add("hidden");
  };

  // ================================
  // 🔵 storage
  // ================================
  const KEY_LIST = "impresoras";
  const KEY_ACTIVE = "impresoraActivaId";
  const KEY_COMPAT = "configImpresora"; // home.js actual

  function loadList() {
    try {
      const raw = localStorage.getItem(KEY_LIST);
      const arr = JSON.parse(raw || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function saveList(list) {
    localStorage.setItem(KEY_LIST, JSON.stringify(list));
  }

  function getActiveId() {
    try {
      return localStorage.getItem(KEY_ACTIVE) || "";
    } catch (_) {
      return "";
    }
  }

  function setActiveId(id) {
    localStorage.setItem(KEY_ACTIVE, String(id || ""));
  }

  function toCompatConfig(prn) {
    // Compatibilidad con tu home.js:
    // home.js usa: config.nombre (IP/Host), config.puerto|port, config.ancho
    return {
      nombre: prn.host || "",
      port: Number(prn.port || 9100),
      puerto: Number(prn.port || 9100),
      ancho: Number(prn.ancho || 80),

      // extras útiles si luego mejoras backend
      alias: prn.nombre || "",
      copias: Number(prn.copias || 1),
      cutter: !!prn.cutter,
      timeout: Number(prn.timeout || 8000),
      header: prn.header || "",
      footer: prn.footer || "",
    };
  }

  function saveCompatConfig(prn) {
    localStorage.setItem(KEY_COMPAT, JSON.stringify(toCompatConfig(prn)));
  }

  // ================================
  // 🔵 DOM helpers
  // ================================
  function $(id) {
    return document.getElementById(id);
  }

  function uid() {
    return "prn_" + Math.random().toString(16).slice(2) + "_" + Date.now();
  }

  function normInt(v, fallback) {
    const n = parseInt(String(v || ""), 10);
    return Number.isFinite(n) ? n : fallback;
  }

  function normBool(v, fallback) {
    if (v === true || v === false) return v;
    if (String(v).toLowerCase() === "true") return true;
    if (String(v).toLowerCase() === "false") return false;
    return fallback;
  }

  function sanitizePrinter(p) {
    const out = {
      id: p.id || uid(),
      nombre: (p.nombre || "").trim(),
      host: (p.host || "").trim(),
      port: normInt(p.port, 9100),
      ancho: normInt(p.ancho, 80),
      copias: Math.max(1, normInt(p.copias, 1)),
      cutter: normBool(p.cutter, true),
      timeout: Math.max(1000, normInt(p.timeout, 8000)),
      header: (p.header || "").toString(),
      footer: (p.footer || "").toString(),
      updatedAt: new Date().toISOString(),
      createdAt: p.createdAt || new Date().toISOString(),
    };
    return out;
  }

  function fmtBool(b) {
    return b ? "Sí" : "No";
  }

  // ================================
  // 🔵 Render
  // ================================
  function renderActiveBox(list) {
    const box = $("activaBox");
    if (!box) return;

    const activeId = getActiveId();
    const prn = list.find((x) => String(x.id) === String(activeId));

    if (!prn) {
      box.innerHTML = `
        <p class="text-sm text-slate-700 dark:text-slate-200">Sin impresora activa.</p>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Selecciona una impresora y marca “Usar como activa”.
        </p>
      `;
      return;
    }

    box.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-sm font-extrabold text-slate-900 dark:text-white">
            ${escapeHtml(prn.nombre || "Sin nombre")}
            <span class="ml-2 inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200 px-2 py-0.5 text-[11px] font-extrabold">
              ACTIVA
            </span>
          </p>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ${escapeHtml(prn.host || "—")}:${Number(prn.port || 9100)}
            • ${Number(prn.ancho || 80)}mm • Copias: ${Number(prn.copias || 1)} • Cutter: ${fmtBool(!!prn.cutter)}
          </p>
        </div>
        <button
          class="px-3 py-2 rounded-xl text-xs font-extrabold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          onclick="copiarConfigActiva()"
          title="Copiar JSON de la impresora activa"
        >
          <span class="material-symbols-outlined text-[18px] align-middle">content_copy</span>
        </button>
      </div>
      <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        <div class="rounded-xl bg-white/70 dark:bg-black/20 border border-black/5 dark:border-white/10 p-2">
          <span class="text-slate-500 dark:text-slate-300">Timeout:</span>
          <span class="font-extrabold text-slate-900 dark:text-white">${Number(prn.timeout || 8000)} ms</span>
        </div>
        <div class="rounded-xl bg-white/70 dark:bg-black/20 border border-black/5 dark:border-white/10 p-2">
          <span class="text-slate-500 dark:text-slate-300">Actualizada:</span>
          <span class="font-extrabold text-slate-900 dark:text-white">${new Date(prn.updatedAt || Date.now()).toLocaleString()}</span>
        </div>
      </div>
    `;
  }

  function renderList(list) {
    const cont = $("listaImpresoras");
    if (!cont) return;

    const q = ($("buscar")?.value || "").trim().toLowerCase();
    const activeId = getActiveId();

    const filtered = list.filter((p) => {
      if (!q) return true;
      return (
        String(p.nombre || "").toLowerCase().includes(q) ||
        String(p.host || "").toLowerCase().includes(q) ||
        String(p.port || "").toLowerCase().includes(q)
      );
    });

    if (filtered.length === 0) {
      cont.innerHTML = `
        <div class="p-6 text-center">
          <span class="material-symbols-outlined text-3xl text-slate-400 dark:text-slate-500">print</span>
          <p class="mt-2 text-sm font-extrabold text-slate-700 dark:text-slate-200">Sin impresoras</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">Agrega una con “Nueva”.</p>
        </div>
      `;
      return;
    }

    cont.innerHTML = filtered
      .map((p) => {
        const isActive = String(p.id) === String(activeId);
        return `
          <div class="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <p class="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                  ${escapeHtml(p.nombre || "Sin nombre")}
                </p>
                ${
                  isActive
                    ? `<span class="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200 px-2 py-0.5 text-[11px] font-extrabold">ACTIVA</span>`
                    : ""
                }
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 truncate">
                ${escapeHtml(p.host || "—")}:${Number(p.port || 9100)}
                • ${Number(p.ancho || 80)}mm • Copias: ${Number(p.copias || 1)} • Cutter: ${fmtBool(!!p.cutter)}
              </p>
            </div>

            <div class="flex flex-wrap gap-2 justify-end">
              <button
                class="px-3 py-2 rounded-xl text-xs font-extrabold bg-sky-600 text-white"
                onclick="imprimirPrueba('${p.id}')"
              >
                <span class="material-symbols-outlined align-middle text-[18px] mr-1">print</span>
                Prueba
              </button>

              <button
                class="px-3 py-2 rounded-xl text-xs font-extrabold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                onclick="editar('${p.id}')"
              >
                Editar
              </button>

              <button
                class="px-3 py-2 rounded-xl text-xs font-extrabold bg-primary text-white"
                onclick="activar('${p.id}')"
                ${isActive ? "disabled" : ""}
                title="Usar como activa"
              >
                Usar
              </button>

              <button
                class="px-3 py-2 rounded-xl text-xs font-extrabold bg-red-600 text-white"
                onclick="eliminar('${p.id}')"
                title="Eliminar"
              >
                <span class="material-symbols-outlined align-middle text-[18px]">delete</span>
              </button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ================================
  // 🔵 Form (get/set)
  // ================================
  function readForm() {
    const p = {
      id: $("formId").value || "",
      nombre: $("fNombre").value || "",
      host: $("fHost").value || "",
      port: $("fPort").value || "",
      ancho: $("fAncho").value || "",
      copias: $("fCopias").value || "",
      cutter: $("fCutter").value || "true",
      timeout: $("fTimeout").value || "",
      header: $("fHeader").value || "",
      footer: $("fFooter").value || "",
    };
    return sanitizePrinter(p);
  }

  function fillForm(p) {
    $("formId").value = p.id || "";
    $("fNombre").value = p.nombre || "";
    $("fHost").value = p.host || "";
    $("fPort").value = String(p.port ?? 9100);
    $("fAncho").value = String(p.ancho ?? 80);
    $("fCopias").value = String(p.copias ?? 1);
    $("fCutter").value = String(!!p.cutter);
    $("fTimeout").value = String(p.timeout ?? 8000);
    $("fHeader").value = p.header || "";
    $("fFooter").value = p.footer || "";
  }

  function clearForm() {
    $("formId").value = "";
    $("fNombre").value = "";
    $("fHost").value = "";
    $("fPort").value = "9100";
    $("fAncho").value = "80";
    $("fCopias").value = "1";
    $("fCutter").value = "true";
    $("fTimeout").value = "8000";
    $("fHeader").value = "";
    $("fFooter").value = "";
  }

  // ================================
  // 🔵 Actions exposed to window
  // ================================
  window.refrescar = function () {
    const list = loadList();
    renderActiveBox(list);
    renderList(list);
  };

  window.nuevoRegistro = function () {
    clearForm();
    showModal("Formulario listo: agrega una impresora y pulsa Guardar.");
  };

  window.limpiarForm = function () {
    clearForm();
  };

  window.editar = function (id) {
    const list = loadList();
    const p = list.find((x) => String(x.id) === String(id));
    if (!p) return showModal("No se encontró esa impresora.");
    fillForm(p);
    showModal("Editando impresora. Ajusta y pulsa Guardar.");
  };

  window.eliminar = function (id) {
    const list = loadList();
    const p = list.find((x) => String(x.id) === String(id));
    if (!p) return showModal("No se encontró esa impresora.");

    const activeId = getActiveId();
    const next = list.filter((x) => String(x.id) !== String(id));
    saveList(next);

    if (String(activeId) === String(id)) {
      setActiveId("");
      try { localStorage.removeItem(KEY_COMPAT); } catch (_) {}
    }

    clearForm();
    window.refrescar();
    showModal(`Impresora eliminada: ${p.nombre || p.host || id}`);
  };

  window.guardar = function () {
    const prn = readForm();

    if (!prn.nombre.trim()) return showModal("El nombre (alias) es obligatorio.");
    if (!prn.host.trim()) return showModal("El IP/Host es obligatorio.");
    if (!Number(prn.port)) return showModal("El puerto es inválido.");

    const list = loadList();
    const idx = list.findIndex((x) => String(x.id) === String(prn.id));

    if (idx >= 0) {
      // update
      prn.createdAt = list[idx].createdAt || prn.createdAt;
      list[idx] = prn;
    } else {
      // new
      prn.id = prn.id || uid();
      list.unshift(prn);
    }

    saveList(list);
    fillForm(prn);
    window.refrescar();
    showModal("Impresora guardada.");
  };

  window.activar = function (id) {
    const list = loadList();
    const p = list.find((x) => String(x.id) === String(id));
    if (!p) return showModal("No se encontró esa impresora.");

    setActiveId(p.id);
    saveCompatConfig(p); // ✅ compatibilidad con home.js
    window.refrescar();
    showModal(`Impresora activa: ${p.nombre || p.host}`);
  };

  window.usarComoActivaDesdeForm = function () {
    // Guarda y activa
    window.guardar();
    const prn = readForm();
    // si era nuevo, recargar y buscar por host+nombre+port
    const list = loadList();
    const found =
      list.find((x) => String(x.id) === String(prn.id)) ||
      list.find((x) => x.host === prn.host && Number(x.port) === Number(prn.port) && x.nombre === prn.nombre);

    if (!found) return;
    window.activar(found.id);
  };

  window.exportarConfig = function () {
    try {
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        activeId: getActiveId(),
        printers: loadList(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `impresoras_config_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      showModal("No se pudo exportar.");
    }
  };

  window.copiarConfigActiva = async function () {
    const list = loadList();
    const activeId = getActiveId();
    const p = list.find((x) => String(x.id) === String(activeId));
    if (!p) return showModal("No hay impresora activa.");

    try {
      await navigator.clipboard.writeText(JSON.stringify(p, null, 2));
      showModal("Configuración copiada al portapapeles.");
    } catch (_) {
      showModal("No se pudo copiar (permisos del navegador).");
    }
  };

  // ================================
  // 🖨 Prueba (requiere endpoint opcional)
  // ================================
  function sampleText(prn) {
    const ancho = Number(prn.ancho || 80);
    const cols = ancho <= 58 ? 32 : 48;
    const line = "-".repeat(cols);

    const header = (prn.header || "").trim();
    const footer = (prn.footer || "").trim();

    return [
      header ? header : "PRUEBA DE IMPRESIÓN",
      line,
      `Alias: ${prn.nombre || "—"}`,
      `Host: ${prn.host || "—"}`,
      `Port: ${Number(prn.port || 9100)}`,
      `Ancho: ${ancho}mm`,
      `Cutter: ${fmtBool(!!prn.cutter)}`,
      `Copias: ${Number(prn.copias || 1)}`,
      line,
      "Si ves esto bien, tu impresora está OK ✅",
      line,
      footer ? footer : "",
      "\n\n",
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function doTestPrint(prn) {
    // Si no tienes el endpoint, igual avisa bonito
    const body = {
      ip: prn.host,
      port: Number(prn.port || 9100),
      ancho: Number(prn.ancho || 80),
      cutter: !!prn.cutter,
      copies: Number(prn.copias || 1),
      timeout: Number(prn.timeout || 8000),
      text: sampleText(prn),
    };

    showLoader("Enviando prueba a la impresora...");

    try {
      const res = await fetch("/api/impresoras/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      hideLoader();

      if (!res.ok) {
        let msg = "No se pudo imprimir la prueba.";
        try {
          const data = await res.json();
          msg = data.error || msg;
        } catch (_) {}
        return showModal(msg);
      }

      showModal("Prueba enviada ✅");
    } catch (e) {
      hideLoader();
      console.error(e);
      showModal("No se pudo conectar al backend para imprimir la prueba.");
    }
  }

  window.imprimirPrueba = function (id) {
    const list = loadList();
    const p = list.find((x) => String(x.id) === String(id));
    if (!p) return showModal("No se encontró esa impresora.");
    doTestPrint(p);
  };

  window.imprimirPruebaActiva = function () {
    const list = loadList();
    const activeId = getActiveId();
    const p = list.find((x) => String(x.id) === String(activeId));
    if (!p) return showModal("No hay impresora activa.");
    doTestPrint(p);
  };

  window.imprimirPruebaDesdeForm = function () {
    const prn = readForm();
    if (!prn.host.trim()) return showModal("Pon un IP/Host para imprimir la prueba.");
    doTestPrint(prn);
  };

  // ================================
  // 📥 Import
  // ================================
  function setupImport() {
    const input = document.getElementById("importFile");
    if (!input) return;

    input.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const payload = JSON.parse(text || "{}");
        const printers = Array.isArray(payload.printers) ? payload.printers : [];
        const normalized = printers.map(sanitizePrinter);

        saveList(normalized);

        const activeId = payload.activeId || "";
        if (activeId && normalized.some((x) => String(x.id) === String(activeId))) {
          setActiveId(activeId);
          const prn = normalized.find((x) => String(x.id) === String(activeId));
          if (prn) saveCompatConfig(prn);
        } else {
          setActiveId("");
        }

        clearForm();
        window.refrescar();
        showModal("Configuración importada correctamente.");
      } catch (err) {
        console.error(err);
        showModal("Archivo inválido. Debe ser JSON exportado desde este panel.");
      } finally {
        input.value = "";
      }
    });
  }

  // ================================
  // Init
  // ================================
  function ensureDefaults() {
    // Si existe configImpresora vieja pero no lista, crea una entrada para no perderla
    let compat = null;
    try {
      compat = JSON.parse(localStorage.getItem(KEY_COMPAT) || "null");
    } catch (_) {
      compat = null;
    }

    const list = loadList();
    if ((!list || list.length === 0) && compat && compat.nombre) {
      const prn = sanitizePrinter({
        id: uid(),
        nombre: compat.alias || "Impresora (importada)",
        host: compat.nombre,
        port: compat.puerto || compat.port || 9100,
        ancho: compat.ancho || 80,
        copias: compat.copias || 1,
        cutter: compat.cutter ?? true,
        timeout: compat.timeout || 8000,
        header: compat.header || "",
        footer: compat.footer || "",
      });

      saveList([prn]);
      setActiveId(prn.id);
      saveCompatConfig(prn);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    ensureDefaults();
    setupImport();

    const buscar = $("buscar");
    if (buscar) {
      buscar.addEventListener("input", () => window.refrescar());
      buscar.addEventListener("keydown", (e) => {
        if (e.key === "Enter") window.refrescar();
      });
    }

    window.refrescar();
  });
})();
