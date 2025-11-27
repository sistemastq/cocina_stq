// src/index.ts
import { Router } from "express";

// Importa aquí todas las rutas que quieras agrupar
import pedidosRoutes from "./routes/pedidos";

const router = Router();

// Agrupa tus rutas API
router.use("/pedidos", pedidosRoutes);

export default router;

