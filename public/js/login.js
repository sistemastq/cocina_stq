document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const correo = document.getElementById("correo").value;
    const password = document.getElementById("password").value;
    const msg = document.getElementById("msg");

    const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password })
    });

    const data = await res.json();

    if (!res.ok) {
        msg.textContent = data.error;
        msg.style.color = "red";
        return;
    }

    msg.textContent = "Ingreso exitoso";
    msg.style.color = "green";

    setTimeout(() => {
        window.location.href = "/login.html";
    }, 800);
});

