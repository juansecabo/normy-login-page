import { supabase } from "@/integrations/supabase/client";

// Obtener IDs vistos de Supabase para un usuario y sección
export const getSeenIds = async (seccion: string, codigo: string): Promise<Set<number>> => {
  try {
    const { data } = await supabase
      .from('Notificaciones_Vistas')
      .select('ids_vistos')
      .eq('usuario_codigo', codigo)
      .eq('seccion', seccion)
      .single();

    if (data?.ids_vistos && Array.isArray(data.ids_vistos)) {
      return new Set(data.ids_vistos);
    }
  } catch {}
  return new Set();
};

// Marcar IDs como vistos en Supabase
export const markAsSeen = async (seccion: string, codigo: string, ids: number[]) => {
  try {
    await supabase
      .from('Notificaciones_Vistas')
      .upsert(
        {
          usuario_codigo: codigo,
          seccion: seccion,
          ids_vistos: ids,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'usuario_codigo,seccion' }
      );
  } catch {}
};

// Obtener todos los registros de un usuario de una vez (para optimizar dashboard)
export const getAllSeenForUser = async (codigo: string): Promise<Record<string, Set<number>>> => {
  const result: Record<string, Set<number>> = {};
  try {
    const { data } = await supabase
      .from('Notificaciones_Vistas')
      .select('seccion, ids_vistos')
      .eq('usuario_codigo', codigo);

    data?.forEach((row: any) => {
      if (row.ids_vistos && Array.isArray(row.ids_vistos)) {
        result[row.seccion] = new Set(row.ids_vistos);
      }
    });
  } catch {}
  return result;
};

// Contar no vistos usando un mapa pre-cargado de IDs vistos
export const countUnseenFromMap = (currentIds: number[], seenSet: Set<number> | undefined): number => {
  if (!seenSet) return currentIds.length;
  return currentIds.filter(id => !seenSet.has(id)).length;
};
