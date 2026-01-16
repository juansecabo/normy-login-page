import { useState } from "react";
import { CheckCircle, AlertCircle, Users, BookOpen, GraduationCap, Building } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DetalleIncompleto, ResumenIncompletitud } from "@/hooks/useCompletitud";

interface IndicadorCompletitudProps {
  completo: boolean;
  detalles: DetalleIncompleto[];
  resumen: ResumenIncompletitud;
  nivel: string;
  periodo: string;
}

export const IndicadorCompletitud = ({ 
  completo, 
  detalles, 
  resumen, 
  nivel, 
  periodo 
}: IndicadorCompletitudProps) => {
  const [open, setOpen] = useState(false);

  if (completo) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-medium">
        <CheckCircle className="w-4 h-4" />
        <span>Completo</span>
      </div>
    );
  }

  // Agrupar detalles por materia y profesor
  const detallesPorMateria = new Map<string, {
    profesor?: string;
    grados: Set<string>;
    salones: Set<string>;
    notasFaltantes: DetalleIncompleto[];
    porcentajesIncompletos: DetalleIncompleto[];
  }>();

  detalles.forEach(d => {
    const key = d.materia || "Sin materia";
    if (!detallesPorMateria.has(key)) {
      detallesPorMateria.set(key, {
        profesor: d.profesor,
        grados: new Set(),
        salones: new Set(),
        notasFaltantes: [],
        porcentajesIncompletos: []
      });
    }
    const grupo = detallesPorMateria.get(key)!;
    if (d.grado) grupo.grados.add(d.grado);
    if (d.salon) grupo.salones.add(d.salon);
    if (d.tipo === "nota_faltante") {
      grupo.notasFaltantes.push(d);
    } else {
      grupo.porcentajesIncompletos.push(d);
    }
  });

  // Determinar si mostrar resumen general o detalle específico
  const esNivelAlto = resumen.gradosAfectados.length > 2 || resumen.salonesAfectados.length > 5;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-medium hover:bg-amber-200 transition-colors cursor-pointer"
      >
        <AlertCircle className="w-4 h-4" />
        <span>Incompleto</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              ⚠️ {nivel} - {periodo} está incompleto
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Resumen General */}
            {esNivelAlto && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  📊 RESUMEN GENERAL
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <span><strong>{resumen.materiasIncompletas}</strong> materias con períodos incompletos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span><strong>{resumen.profesoresPendientes.length}</strong> profesores con notas pendientes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-muted-foreground" />
                    <span>Afecta a <strong>{resumen.gradosAfectados.length}</strong> grados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <span>En <strong>{resumen.salonesAfectados.length}</strong> salones</span>
                  </div>
                </div>
              </div>
            )}

            {/* Detalle por Materia */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                📝 DETALLE POR MATERIA Y PROFESOR
              </h4>
              
              {Array.from(detallesPorMateria.entries()).map(([materia, grupo]) => (
                <div key={materia} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-medium text-foreground">{materia}</h5>
                      {grupo.profesor && (
                        <p className="text-sm text-muted-foreground">
                          Prof. {grupo.profesor}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      {grupo.grados.size > 0 && (
                        <div>Grados: {Array.from(grupo.grados).join(", ")}</div>
                      )}
                      {grupo.salones.size > 0 && (
                        <div>Salones: {Array.from(grupo.salones).join(", ")}</div>
                      )}
                    </div>
                  </div>

                  {/* Porcentajes incompletos */}
                  {grupo.porcentajesIncompletos.length > 0 && (
                    <div className="space-y-1">
                      {grupo.porcentajesIncompletos.slice(0, 5).map((d, idx) => (
                        <div key={`porc-${idx}`} className="flex items-start gap-2 text-sm p-2 bg-red-50 text-red-700 rounded">
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span>{d.descripcion}</span>
                        </div>
                      ))}
                      {grupo.porcentajesIncompletos.length > 5 && (
                        <p className="text-xs text-muted-foreground italic pl-5">
                          ...y {grupo.porcentajesIncompletos.length - 5} más con porcentajes incompletos
                        </p>
                      )}
                    </div>
                  )}

                  {/* Notas faltantes */}
                  {grupo.notasFaltantes.length > 0 && (
                    <div className="space-y-1">
                      {esNivelAlto ? (
                        <div className="text-sm p-2 bg-amber-50 text-amber-700 rounded">
                          <strong>{grupo.notasFaltantes.length}</strong> notas faltantes en diferentes estudiantes
                        </div>
                      ) : (
                        <>
                          {grupo.notasFaltantes.slice(0, 10).map((d, idx) => (
                            <div key={`nota-${idx}`} className="flex items-start gap-2 text-sm p-2 bg-amber-50 text-amber-700 rounded">
                              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                              <span>{d.descripcion}</span>
                            </div>
                          ))}
                          {grupo.notasFaltantes.length > 10 && (
                            <p className="text-xs text-muted-foreground italic pl-5">
                              ...y {grupo.notasFaltantes.length - 10} notas más faltantes
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {detalles.length >= 100 && (
                <p className="text-sm text-muted-foreground italic text-center py-2">
                  Mostrando los primeros 100 problemas detectados. Hay más pendientes.
                </p>
              )}
            </div>

            {/* Recomendación */}
            {resumen.profesoresPendientes.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  💡 <strong>Profesores a contactar:</strong> {resumen.profesoresPendientes.slice(0, 5).join(", ")}
                  {resumen.profesoresPendientes.length > 5 && ` y ${resumen.profesoresPendientes.length - 5} más`}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export type { DetalleIncompleto, ResumenIncompletitud };
