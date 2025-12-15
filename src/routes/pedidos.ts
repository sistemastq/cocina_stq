// src/routes/pedidos.ts
import { Router } from "express";
import { supabase } from "../supabase";
import { imprimirTextoEnIp } from "../printer";

const router = Router();

const HISTORICO_DELAY_MS = 5 * 60 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function mapEstadoToTimestampField(estado: string) {
  // tabla: recibido_at, en_preparacion_at, listo_at, en_camino_at, entregado_at
  if (estado === "Recibido") return "recibido_at";
  if (estado === "En preparación") return "en_preparacion_at";
  if (estado === "Listo") return "listo_at";
  if (estado === "En camino") return "en_camino_at";
  if (estado === "Entregado") return "entregado_at";
  return null;
}

/*
 |------------------------------
 |  GET /api/pedidos
 |  Opcional: ?correo=user@example.com
 |  ✅ HOME: devuelve todos, pero excluye Listo >= 5 min
 |------------------------------
*/
router.get("/", async (req, res) => {
  try {
    const { correo } = req.query as { correo?: string };

    let puntoVenta: string | null = null;

    if (correo) {
      const { data: usuario, error: errorUsuario } = await supabase
        .from("usercocina")
        .select("PuntoVenta")
        .eq("correo", correo)
        .maybeSingle();

      if (errorUsuario) {
        console.error("Error buscando usuario:", errorUsuario);
        return res.status(500).json({ error: errorUsuario.message });
      }

      if (!usuario) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      puntoVenta = (usuario as any).PuntoVenta ?? null;
    }

    let query = supabase.from("pedidos").select("*").order("id", { ascending: true });

    // En pedidos la columna es: puntoventa
    if (puntoVenta) {
      query = query.eq("puntoventa", puntoVenta);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error cargando pedidos:", error);
      return res.status(500).json({ error: error.message });
    }

    const cutoff = Date.now() - HISTORICO_DELAY_MS;

    // ✅ HOME: excluye Listo que ya pasaron 5 min
    const dashboard = (data || []).filter((p: any) => {
      if (p.estado !== "Listo") return true;
      if (!p.listo_at) return true; // si no hay timestamp, que se quede en home
      return new Date(p.listo_at).getTime() >= cutoff; // solo "Listo" recientes
    });

    return res.json(dashboard);
  } catch (err) {
    console.error("Error general cargando pedidos:", err);
    return res.status(500).json({ error: "Error general cargando pedidos" });
  }
});

/*
 |------------------------------
 |  GET /api/pedidos/historico
 |  ?correo=user@example.com
 |  ✅ HISTÓRICO: SOLO Listo >= 5 min
 |------------------------------
*/
router.get("/historico", async (req, res) => {
  try {
    const { correo } = req.query as { correo?: string };
    if (!correo) return res.status(400).json({ error: "Falta correo" });

    // Obtener PuntoVenta del usuario
    const { data: usuario, error: errorUsuario } = await supabase
      .from("usercocina")
      .select("PuntoVenta")
      .eq("correo", correo)
      .maybeSingle();

    if (errorUsuario) {
      console.error("Error buscando usuario (historico):", errorUsuario);
      return res.status(500).json({ error: errorUsuario.message });
    }
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

    const puntoVenta = (usuario as any).PuntoVenta ?? null;

    // Trae solo Listo (lo más eficiente) y filtra por puntoventa
    let q = supabase
      .from("pedidos")
      .select("*")
      .eq("estado", "Listo")
      .order("listo_at", { ascending: false })
      .limit(500);

    if (puntoVenta) q = q.eq("puntoventa", puntoVenta);

    const { data, error } = await q;
    if (error) {
      console.error("Error cargando historico:", error);
      return res.status(500).json({ error: error.message });
    }

    const cutoff = Date.now() - HISTORICO_DELAY_MS;

    // ✅ HISTÓRICO: Listo >= 5 min
    const historico = (data || []).filter((p: any) => {
      if (!p.listo_at) return false;
      return new Date(p.listo_at).getTime() < cutoff;
    });

    return res.json(historico);
  } catch (err) {
    console.error("Error general histórico:", err);
    return res.status(500).json({ error: "Error general histórico" });
  }
});

/*
 |------------------------------
 |  PUT /api/pedidos/estado
 |  Body: { id, estado }
 |  ✅ actualiza estado y guarda timestamp real en la columna correspondiente
 |------------------------------
*/
router.put("/estado", async (req, res) => {
  try {
    const { id, estado } = req.body as { id?: number | string; estado?: string };

    if (!id || !estado) {
      return res.status(400).json({ error: "Faltan datos: id y estado" });
    }

    // Armamos patch con timestamp según el estado
    const patch: any = { estado };
    const field = mapEstadoToTimestampField(estado);
    if (field) patch[field] = nowIso();

    const { error } = await supabase.from("pedidos").update(patch).eq("id", id);

    if (error) {
      console.error("Error actualizando estado:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ message: "Estado actualizado", patch });
  } catch (err) {
    console.error("Error general actualizando estado:", err);
    return res.status(500).json({ error: "Error general actualizando estado" });
  }
});

/*
 |------------------------------
 |  PUT /api/pedidos/resumen
 |  Body: { id, resumen_pedido }
 |  ✅ guarda resumen_pedido (para el modal editable)
 |------------------------------
*/
router.put("/resumen", async (req, res) => {
  try {
    const { id, resumen_pedido } = req.body as { id?: number | string; resumen_pedido?: string };

    if (!id) return res.status(400).json({ error: "Falta id" });

    const txt = (resumen_pedido ?? "").toString();

    const { data, error } = await supabase
      .from("pedidos")
      .update({ resumen_pedido: txt })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Error guardando resumen:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ ok: true, pedido: data });
  } catch (err) {
    console.error("Error general guardando resumen:", err);
    return res.status(500).json({ error: "Error general guardando resumen" });
  }
});

/*
 |------------------------------
 |  POST /api/pedidos/imprimir
 |  Body: { id, ip, port? }
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
