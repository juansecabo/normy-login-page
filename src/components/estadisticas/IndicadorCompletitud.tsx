import { useState } from "react";
import { CheckCircle, AlertCircle, Users, BookOpen, GraduationCap, Building, FileCheck, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { DetalleIncompleto, ResumenIncompletitud, ResumenCompleto } from "@/hooks/useCompletitud";

interface IndicadorCompletitudProps {
  completo: boolean;
  detalles: DetalleIncompleto[];
  resumen: ResumenIncompletitud;
  resumenCompleto?: ResumenCompleto;
  nivel: string;
  periodo: string;
}

// Agrupar detalles por profesor -> materias -> grados/salones
interface PendienteProfesor {
  nombreProfesor: string;
  materias: Map<string, {
    grados: Set<string>;
    salones: Set<string>;
  }>;
}

const agruparPorProfesor = (detalles: DetalleIncompleto[]): PendienteProfesor[] => {
  const profesoresMap = new Map<string, PendienteProfesor>();

  detalles.forEach(d => {
    const nombreProfesor = d.profesor || "Profesor desconocido";
    
    if (!profesoresMap.has(nombreProfesor)) {
      profesoresMap.set(nombreProfesor, {
        nombreProfesor,
        materias: new Map()
      });
    }
    
    const prof = profesoresMap.get(nombreProfesor)!;
    const materia = d.materia || "Sin materia";
    
    if (!prof.materias.has(materia)) {
      prof.materias.set(materia, {
        grados: new Set(),
        salones: new Set()
      });
    }
    
    const mat = prof.materias.get(materia)!;
    if (d.grado) mat.grados.add(d.grado);
    if (d.salon) mat.salones.add(d.salon);
  });

  // Convertir a array y ordenar por nombre
  return Array.from(profesoresMap.values()).sort((a, b) => 
    a.nombreProfesor.localeCompare(b.nombreProfesor)
  );
};

export const IndicadorCompletitud = ({ 
  completo, 
  detalles, 
  resumen, 
  resumenCompleto,
  nivel, 
  periodo 
}: IndicadorCompletitudProps) => {
  const [open, setOpen] = useState(false);

  // Contenido cuando está COMPLETO
  if (completo) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-medium hover:bg-green-200 transition-colors cursor-pointer"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Completo</span>
        </button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                ✅ Registro Completo - {nivel} {periodo}
              </DialogTitle>
              <DialogDescription>
                El {periodo.toLowerCase()} está completamente registrado para {nivel.toLowerCase()}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Resumen de verificación */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-green-800">
                  <FileCheck className="w-4 h-4" />
                  📊 RESUMEN DE VERIFICACIÓN
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm text-green-700">
                  {resumenCompleto && (
                    <>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Total de estudiantes: <strong>{resumenCompleto.totalEstudiantes}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        <span>Asignaciones verificadas: <strong>{resumenCompleto.totalAsignacionesVerificadas}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        <span>Total de salones: <strong>{resumenCompleto.totalSalones}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        <span>Total de profesores: <strong>{resumenCompleto.totalProfesores}</strong></span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Confirmaciones */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>Todas las asignaciones tienen actividades que suman 100%</span>
                </div>
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>Todos los estudiantes tienen notas en todas las actividades</span>
                </div>
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>Todos los salones tienen registros completos</span>
                </div>
              </div>

              {/* Materias verificadas */}
              {resumenCompleto && resumenCompleto.materiasPorSalon.size > 0 && (
                <div className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    📝 MATERIAS VERIFICADAS
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Array.from(resumenCompleto.materiasPorSalon.entries()).map(([materia, cantidad]) => (
                      <div key={materia} className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        <span>{materia} - {cantidad} salones ✓</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensaje final */}
              <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  💚 El período está listo para generar reportes y estadísticas confiables.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Contenido cuando está INCOMPLETO
  const profesoresPendientes = agruparPorProfesor(detalles);

  // Función auxiliar para formatear los salones de un grado
  const formatearSalones = (grado: string, salones: Set<string>): string => {
    const salonesArr = Array.from(salones).sort();
    if (salonesArr.length === 3) {
      return `${grado} (todos los salones)`;
    }
    if (salonesArr.length === 1) {
      return `${grado} (salón: ${salonesArr[0]})`;
    }
    return `${grado} (salones: ${salonesArr.join(", ")})`;
  };

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
            <DialogDescription>
              Los siguientes profesores tienen registros pendientes de notas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Lista de profesores con pendientes */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                📋 PROFESORES CON NOTAS PENDIENTES:
              </h4>

              {profesoresPendientes.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                  <p className="font-medium">⚠️ No se encontraron detalles específicos</p>
                  <p className="mt-1 text-xs">
                    Esto puede ocurrir si no hay asignaciones de profesores configuradas o si los grados/salones no coinciden con los estudiantes registrados.
                  </p>
                  <p className="mt-2 text-xs">
                    Revisa la consola del navegador para ver los mensajes de debug con más información.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {profesoresPendientes.map((prof, idx) => (
                    <div key={prof.nombreProfesor} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-sm font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">{prof.nombreProfesor}</span>
                        </div>
                      </div>
                      
                      <div className="ml-8 space-y-1">
                        {Array.from(prof.materias.entries()).map(([materia, datos]) => {
                          // Agrupar salones por grado
                          const gradosInfo = Array.from(datos.grados).map(grado => {
                            // Filtrar salones que corresponden a este grado (simplificado: mostrar todos)
                            return formatearSalones(grado, datos.salones);
                          });
                          
                          return (
                            <div key={materia} className="flex items-start gap-2 text-sm">
                              <span className="text-muted-foreground">•</span>
                              <div>
                                <span className="font-medium">{materia}</span>
                                <span className="text-muted-foreground"> - </span>
                                <span className="text-muted-foreground">
                                  {gradosInfo.join(", ")}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total de profesores */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>Total:</strong> {profesoresPendientes.length} profesor{profesoresPendientes.length !== 1 ? 'es' : ''} debe{profesoresPendientes.length !== 1 ? 'n' : ''} completar sus registros de notas
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export type { DetalleIncompleto, ResumenIncompletitud, ResumenCompleto };
