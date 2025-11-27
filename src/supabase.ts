import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Carga el .env SIEMPRE desde la raíz del proyecto
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

export const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_KEY as string
);


