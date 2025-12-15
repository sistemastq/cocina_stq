"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../supabase");
const bcrypt_1 = __importDefault(require("bcrypt"));
const router = (0, express_1.Router)();
//REGISTRO DE USUARIO
router.post("/register", async (req, res) => {
    console.log("REQ BODY:", req.body);
    const { administrador, correo, password, puntoVenta } = req.body;
    if (!administrador || !correo || !password || !puntoVenta) {
        return res.status(400).json({ error: "Faltan datos" });
    }
    try {
        // Verificar si ya existe correo
        const { data: existeCorreo } = await supabase_1.supabase
            .from("usercocina")
            .select("*")
            .eq("correo", correo)
            .single();
        if (existeCorreo) {
            return res.status(400).json({ error: "Este correo ya está registrado" });
        }
        // Encriptar la contraseña
        const hashed = await bcrypt_1.default.hash(password, 10);
        // Insertar usuario
        const { error } = await supabase_1.supabase.from("usercocina").insert([
            {
                administrador,
                correo,
                contraseña: hashed,
                PuntoVenta: puntoVenta,
            },
        ]);
        if (error)
            throw error;
        return res.json({ mensaje: "Usuario registrado correctamente" });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
//LOGIN
router.post("/login", async (req, res) => {
    const { correo, password } = req.body;
    if (!correo || !password) {
        return res.status(400).json({ error: "Correo y contraseña requeridos" });
    }
    try {
        // Buscar usuario
        const { data: usuario, error } = await supabase_1.supabase
            .from("usercocina")
            .select("*")
            .eq("correo", correo)
            .single();
        if (error || !usuario) {
            return res.status(400).json({ error: "Usuario no encontrado" });
        }
        // Comparar contraseña
        const esCorrecta = await bcrypt_1.default.compare(password, usuario.contraseña);
        if (!esCorrecta) {
            return res.status(401).json({ error: "Contraseña incorrecta" });
        }
        return res.json({
            mensaje: "Inicio de sesión exitoso",
            usuario: {
                id: usuario.id,
                administrador: usuario.administrador,
                correo: usuario.correo,
                puntoVenta: usuario.PuntoVenta,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
