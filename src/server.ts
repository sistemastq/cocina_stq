// src/server.ts
import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import net from "net";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Servir la carpeta PUBLIC
app.use(express.static(path.join(__dirname, "../public")));

// Ruta por defecto para login
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/login.html"));
});

// ✅ Ruta “bonita” opcional (aunque con static ya funciona /impresoras.html)
app.get("/impresoras", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/impresoras.html"));
});

// ================================
// ✅ API: Prueba de impresión (RAW TCP 9100)
// POST /api/impresoras/test
// body: { ip, port, text, cutter?, timeout?, copies? }
// ================================
app.post("/api/impresoras/test", async (req, res) => {
  try {
    const ip = String(req.body?.ip || "").trim();
    const port = Number(req.body?.port || 9100);
    const text = String(req.body?.text || "").toString();
    const cutter = req.body?.cutter !== undefined ? !!req.body.cutter : true;
    const timeout = Math.max(1000, Number(req.body?.timeout || 8000));
    const copies = Math.max(1, Number(req.body?.copies || 1));

    if (!ip) return res.status(400).json({ error: "Falta ip/host" });
    if (!port || !Number.isFinite(port)) return res.status(400).json({ error: "Puerto inválido" });
    if (!text) return res.status(400).json({ error: "Falta text" });

    const cutCmd = Buffer.from([0x1d, 0x56, 0x41, 0x00]); // GS V A 0

    const payloads: Buffer[] = [];
    for (let i = 0; i < copies; i++) {
      payloads.push(Buffer.from(text + "\n", "utf8"));
      if (cutter) payloads.push(cutCmd);
    }

    await new Promise<void>((resolve, reject) => {
      const socket = new net.Socket();
      let done = false;

      const finishOk = () => {
        if (done) return;
        done = true;
        try { socket.destroy(); } catch (_) {}
        resolve();
      };

      const finishErr = (err: any) => {
        if (done) return;
        done = true;
        try { socket.destroy(); } catch (_) {}
        reject(err);
      };

      socket.setTimeout(timeout);

      socket.on("timeout", () => finishErr(new Error("Timeout conectando/imprimiendo")));
      socket.on("error", (err) => finishErr(err));

      socket.connect(port, ip, () => {
        try {
          for (const b of payloads) socket.write(b);
          socket.end();
        } catch (e) {
          finishErr(e);
        }
      });

      socket.on("close", () => finishOk());
    });

    return res.json({ ok: true });
  } catch (err: any) {
    console.error("Error /api/impresoras/test:", err);
    return res.status(500).json({ error: err?.message || "Error imprimiendo prueba" });
  }
});

// Importación de rutas
import authRoutes from "./routes/auth";
import apiRoutes from "./index"; // rutas API agrupadas

// Montar rutas
app.use("/api", authRoutes);
app.use("/api", apiRoutes);

// Levantar servidor
app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});
