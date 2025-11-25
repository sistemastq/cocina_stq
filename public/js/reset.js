document.getElementById("resetForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const correo = document.getElementById("correo").value;
    const msg = document.getElementById("msg");

    const res = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo })
    });

    const data = await res.json();

    if (!res.ok) {
        msg.textContent = data.error;
        msg.style.color = "red";
        return;
    }

    msg.textContent = "Correo enviado";
    msg.style.color = "green";
});
