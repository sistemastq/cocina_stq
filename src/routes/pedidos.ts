// src/routes/pedidos.ts
import { Router } from "express";
import { supabase } from "../supabase";
import { imprimirTextoEnIp } from "../printer";

const router = Router();

/*
 |------------------------------
 |  GET /api/pedidos
 |  Opcional: ?correo=user@example.com
 |------------------------------
*/
router.get("/", async (req, res) => {
  try {
    const { correo } = req.query as { correo?: string };

    let puntoVenta: string | null = null;

    if (correo) {
      const { data: usuario, error: errorUsuario } = await supabase
        .from("usercocina")
        .select("PuntoVenta") // 👈 aquí asumo que en usercocina SÍ se llama PuntoVenta
        .eq("correo", correo)
        .single();

      if (errorUsuario) {
        console.error("Error buscando usuario:", errorUsuario);
        return res.status(500).json({ error: errorUsuario.message });
      }

      if (!usuario) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      // si en usercocina la columna fuera "puntoventa", sería: usuario.puntoventa
      puntoVenta = (usuario as any).PuntoVenta;
    }

    let query = supabase
      .from("pedidos")
      .select("*")
      .order("id", { ascending: true });

    // 🔴 AQUÍ ESTABA EL PROBLEMA:
    // en la tabla pedidos la columna es "puntoventa" (todo minúsculas)
    if (puntoVenta) {
      query = query.eq("puntoventa", puntoVenta);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error cargando pedidos:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error("Error general cargando pedidos:", err);
    res.status(500).json({ error: "Error general cargando pedidos" });
  }
});

/*
 |------------------------------
 |  PUT /api/pedidos/estado
 |------------------------------
*/
router.put("/estado", async (req, res) => {
  const { id, estado } = req.body;

  if (!id || !estado) {
    return res.status(400).json({ error: "Faltan datos: id y estado" });
  }

  const { error } = await supabase
    .from("pedidos")
    .update({ estado })
    .eq("id", id);

  if (error) {
    console.error("Error actualizando estado:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ message: "Estado actualizado" });
});

/*
 |------------------------------
 |  POST /api/pedidos/imprimir
 |  Body: { id, ip, port? }
 |  Imprime el resumen_pedido del pedido indicado
 |------------------------------
*/
router.post("/imprimir", async (req, res) => {
  try {
    const { id, ip, port } = req.body as {
      id?: number;
      ip?: string;
      port?: number;
    };

    if (!id || !ip) {
      return res
        .status(400)
        .json({ error: "Faltan datos: id del pedido e ip de la impresora" });
    }

    // 1. Buscar el pedido en Supabase
    const { data: pedido, error } = await supabase
      .from("pedidos")
      .select("resumen_pedido")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error buscando pedido:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!pedido) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const texto = (pedido as any).resumen_pedido as string;

    // 2. Imprimir en la impresora POS
    await imprimirTextoEnIp(ip, texto, port || 9100);

    return res.json({ message: "Ticket enviado a la impresora" });
  } catch (err) {
    console.error("Error imprimiendo pedido:", err);
    return res
      .status(500)
      .json({ error: "No se pudo imprimir el pedido en la impresora" });
  }
});

export default router;
