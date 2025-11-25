document
  .getElementById("registerForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const administrador = document.getElementById("administrador").value;
    const correo = document.getElementById("correo").value;
    const password = document.getElementById("password").value;
    const puntoVenta = document.getElementById("puntoVenta").value;

    const msg = document.getElementById("msg");

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

    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data.error;
      msg.style.color = "red";
      return;
    }

    msg.textContent = "Usuario registrado correctamente";
    msg.style.color = "green";

    setTimeout(() => {
      window.location.href = "/login.html";
    }, 1200);
  });
