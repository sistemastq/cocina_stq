"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/server.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Servir la carpeta PUBLIC
app.use(express_1.default.static(path_1.default.join(__dirname, "../public")));
// Ruta por defecto para login
app.get("/", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../public/login.html"));
});
// Importación de rutas
const auth_1 = __importDefault(require("./routes/auth"));
const index_1 = __importDefault(require("./index")); // rutas API agrupadas
// Montar rutas
app.use("/api", auth_1.default);
app.use("/api", index_1.default);
// Levantar servidor
app.listen(3000, () => {
    console.log("Servidor corriendo en http://localhost:3000");
});
