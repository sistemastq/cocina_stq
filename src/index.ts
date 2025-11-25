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

// Ruta por defecto que carga el login o index
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/login.html"));
});

// Aquí van tus rutas de API
import authRoutes from "../src/routes/auth";
app.use("/api", authRoutes);


app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});


