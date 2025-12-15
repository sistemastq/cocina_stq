"use strict";
// src/printer.ts
// Utilidad para imprimir texto en impresora térmica por IP
Object.defineProperty(exports, "__esModule", { value: true });
exports.imprimirTextoEnIp = imprimirTextoEnIp;
// Estas libs son CommonJS, las adaptamos un poco a TypeScript
// eslint-disable-next-line @typescript-eslint/no-var-requires
const escpos = require("escpos");
// eslint-disable-next-line @typescript-eslint/no-var-requires
escpos.Network = require("escpos-network");
function imprimirTextoEnIp(ip, texto, port = 9100) {
    return new Promise((resolve, reject) => {
        const device = new escpos.Network(ip, port);
        const options = { encoding: "CP437" }; // ajusta encoding si tu impresora usa otro
        const printer = new escpos.Printer(device, options);
        device.open((error) => {
            if (error) {
                console.error("No se pudo abrir conexión con la impresora:", error);
                return reject(error);
            }
            printer
                .align("lt")
                .text(texto)
                .text("")
                .cut()
                .close(() => {
                console.log("Impresión completada y conexión cerrada.");
                resolve();
            });
        });
    });
}
