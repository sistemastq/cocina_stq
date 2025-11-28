// ./js/register.js

const form = document.getElementById("registerForm");
const msg = document.getElementById("msg");
const card = document.getElementById("registerCard");
const btnRegister = document.getElementById("btnRegister");

// Helpers para modales
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("show");
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("show");
}

// Exponer closeModal para el onclick del HTML
window.closeModal = closeModal;

// Mensajes debajo del formulario
function setMsg(text, type) {
  if (!msg) return;
  msg.textContent = text || "";
  msg.classList.remove("msg-error", "msg-success");

  if (type === "error") {
    msg.classList.add("msg-error");
  } else if (type === "success") {
    msg.classList.add("msg-success");
  }
}

// Animación shake en caso de error
function shakeCard() {
  if (!card) return;
  card.classList.remove("shake");
  void card.offsetWidth;
  card.classList.add("shake");
}

// Lógica de registro
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const administrador = document
      .getElementById("administrador")
      .value.trim();
    const correo = document.getElementById("correo").value.trim();
    const password = document.getElementById("password").value;
    const puntoVenta = document.getElementById("puntoVenta").value.trim();

    if (!administrador || !correo || !password || !puntoVenta) {
      setMsg("Por favor completa todos los campos.", "error");
      shakeCard();
      return;
    }

    try {
      setMsg("");
      openModal("modalLoading");
      if (btnRegister) btnRegister.disabled = true;

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          administrador,
          correo,
          password: password,
          puntoVenta: puntoVenta,
        }),
      });

      const data = await res.json().catch(() => ({}));
      closeModal("modalLoading");

      if (!res.ok) {
        const errorText =
          data.error ||
          "No se pudo registrar el usuario. Revisa los datos e inténtalo de nuevo.";
        setMsg(errorText, "error");

        const modalErrorText = document.getElementById(
          "modalErrorTextRegister"
        );
        if (modalErrorText) modalErrorText.textContent = errorText;

        openModal("modalErrorRegister");
        shakeCard();
        if (btnRegister) btnRegister.disabled = false;
        return;
      }

      // Éxito
      setMsg("Usuario registrado correctamente", "success");
      openModal("modalRegister");

      // Redirigir al login
      setTimeout(() => {
        window.location.href = "/login.html";
      }, 1200);
    } catch (err) {
      console.error("Error en registro:", err);
      closeModal("modalLoading");

      const text =
        "No se pudo conectar con el servidor. Intenta nuevamente en unos segundos.";
      setMsg(text, "error");

      const modalErrorText = document.getElementById(
        "modalErrorTextRegister"
      );
      if (modalErrorText) modalErrorText.textContent = text;

      openModal("modalErrorRegister");
      shakeCard();
      if (btnRegister) btnRegister.disabled = false;
    }
  });
}
