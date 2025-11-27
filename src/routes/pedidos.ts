import { Router } from "express";
import { supabase } from "../supabase";

const router = Router();

/*
 |------------------------------
 |  GET /api/pedidos
 |  Opcional: ?correo=user@example.com
 |------------------------------
*/
router.get("/", async (req, res) => {
  try {
    const { correo } = req.query;

    let puntoVenta = null;

    // 🔹 Si se envía correo, buscamos el PuntoVenta del usuario
    if (correo) {
      const { data: usuario, error: errorUsuario } = await supabase
        .from("usercocina")
        .select("PuntoVenta")
        .eq("correo", correo)
        .single();

      if (errorUsuario) {
        console.error("Error buscando usuario:", errorUsuario);
        return res.status(500).json({ error: errorUsuario.message });
      }

      if (!usuario) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      puntoVenta = usuario.PuntoVenta;
    }

    // 🔹 Consultar pedidos
    let query = supabase.from("pedidos").select("*").order("id", { ascending: true });

    // 🔹 Filtrar por PuntoVenta si existe
    if (puntoVenta) {
      query = query.eq("PuntoVenta", puntoVenta);
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
 |  (el frontend envía { id, estado })
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

export default router;
