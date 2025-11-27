// src/server.ts
import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";

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

// Importación de rutas
import authRoutes from "./routes/auth";
import apiRoutes from "./index";   // rutas API agrupadas

// Montar rutas
app.use("/api", authRoutes);
app.use("/api", apiRoutes);

// Levantar servidor
app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});
