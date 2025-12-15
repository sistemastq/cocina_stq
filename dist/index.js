"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = require("express");
// Importa aquí todas las rutas que quieras agrupar
const pedidos_1 = __importDefault(require("./routes/pedidos"));
const router = (0, express_1.Router)();
// Agrupa tus rutas API
router.use("/pedidos", pedidos_1.default);
exports.default = router;
