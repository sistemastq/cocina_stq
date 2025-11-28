// src/printer.ts
// Utilidad para imprimir texto en impresora térmica por IP

// Estas libs son CommonJS, las adaptamos un poco a TypeScript
// eslint-disable-next-line @typescript-eslint/no-var-requires
const escpos = require("escpos");
// eslint-disable-next-line @typescript-eslint/no-var-requires
escpos.Network = require("escpos-network");

export function imprimirTextoEnIp(
  ip: string,
  texto: string,
  port = 9100
): Promise<void> {
  return new Promise((resolve, reject) => {
    const device = new escpos.Network(ip, port);
    const options = { encoding: "CP437" }; // ajusta encoding si tu impresora usa otro
    const printer = new escpos.Printer(device, options);

    device.open((error: any) => {
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
