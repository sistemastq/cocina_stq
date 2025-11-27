document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const correo = document.getElementById("correo").value;
    const password = document.getElementById("password").value;
    const msg = document.getElementById("msg");

    try {
        const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ correo, password })
        });

        const data = await res.json();

        if (!res.ok) {
            msg.textContent = data.error || "Error en el login";
            msg.style.color = "red";
            return;
        }

        msg.textContent = "Ingreso exitoso";
        msg.style.color = "green";

        // 🔥 GUARDAR SESIÓN DEL USUARIO
        localStorage.setItem("usuario", JSON.stringify(data.usuario));

        // Redirigir a la página Home
        setTimeout(() => {
            window.location.href = "/home.html";
        }, 800);

    } catch (error) {
        console.error(error);
        msg.textContent = "Ocurrió un error, intente nuevamente.";
        msg.style.color = "red";
    }
});



