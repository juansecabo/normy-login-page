import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EstudianteOption {
  codigo: string;
  nombre: string;
}

interface FiltrosEstadisticasProps {
  nivelAnalisis: string;
  setNivelAnalisis: (value: string) => void;
  periodoSeleccionado: string;
  setPeriodoSeleccionado: (value: string) => void;
  gradoSeleccionado?: string;
  setGradoSeleccionado?: (value: string) => void;
  salonSeleccionado?: string;
  setSalonSeleccionado?: (value: string) => void;
  materiaSeleccionada?: string;
  setMateriaSeleccionada?: (value: string) => void;
  estudianteSeleccionado?: string;
  setEstudianteSeleccionado?: (value: string) => void;
  grados: string[];
  salones: { grado: string; salon: string }[];
  materias: string[];
  estudiantes?: EstudianteOption[];
}

export const FiltrosEstadisticas = ({
  nivelAnalisis,
  setNivelAnalisis,
  periodoSeleccionado,
  setPeriodoSeleccionado,
  gradoSeleccionado,
  setGradoSeleccionado,
  salonSeleccionado,
  setSalonSeleccionado,
  materiaSeleccionada,
  setMateriaSeleccionada,
  estudianteSeleccionado,
  setEstudianteSeleccionado,
  grados,
  salones,
  materias,
  estudiantes = []
}: FiltrosEstadisticasProps) => {
  
  // Ordenar salones numéricamente
  const salonesDelGrado = gradoSeleccionado 
    ? salones
        .filter(s => s.grado === gradoSeleccionado)
        .sort((a, b) => {
          const numA = parseInt(a.salon) || 0;
          const numB = parseInt(b.salon) || 0;
          return numA - numB;
        })
    : [];

  return (
    <div className="bg-card rounded-lg shadow-soft p-4 mb-6">
      <h3 className="font-semibold text-foreground mb-4">Filtros de análisis</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Período - PRIMERO */}
        <div>
          <label className="text-sm text-muted-foreground mb-1.5 block">Período</label>
          <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Período 1</SelectItem>
              <SelectItem value="2">Período 2</SelectItem>
              <SelectItem value="3">Período 3</SelectItem>
              <SelectItem value="4">Período 4</SelectItem>
              <SelectItem value="anual">Acumulado Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Nivel de análisis - SEGUNDO */}
        <div>
          <label className="text-sm text-muted-foreground mb-1.5 block">Nivel de Análisis</label>
          <Select value={nivelAnalisis} onValueChange={(val) => {
            setNivelAnalisis(val);
            // Reset otros filtros según el nivel
            if (val === "institucion") {
              setGradoSeleccionado?.("");
              setSalonSeleccionado?.("");
              setMateriaSeleccionada?.("");
              setEstudianteSeleccionado?.("");
            }
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar nivel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="institucion">Institución</SelectItem>
              <SelectItem value="grado">Por Grado</SelectItem>
              <SelectItem value="salon">Por Salón</SelectItem>
              <SelectItem value="materia">Por Materia</SelectItem>
              <SelectItem value="estudiante">Por Estudiante</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grado - visible para niveles grado, salon, estudiante, materia */}
        {(nivelAnalisis === "grado" || nivelAnalisis === "salon" || nivelAnalisis === "estudiante" || nivelAnalisis === "materia") && setGradoSeleccionado && (
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">
              Grado {nivelAnalisis === "materia" ? "(opcional)" : ""}
            </label>
            <Select value={gradoSeleccionado || ""} onValueChange={(val) => {
              setGradoSeleccionado(val);
              setSalonSeleccionado?.("");
              setEstudianteSeleccionado?.("");
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar grado" />
              </SelectTrigger>
              <SelectContent>
                {nivelAnalisis === "materia" && <SelectItem value="all">Todos los grados</SelectItem>}
                {grados.map(grado => (
                  <SelectItem key={grado} value={grado}>{grado}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Salón - visible para niveles salon, estudiante, materia */}
        {(nivelAnalisis === "salon" || nivelAnalisis === "estudiante" || nivelAnalisis === "materia") && setSalonSeleccionado && gradoSeleccionado && gradoSeleccionado !== "all" && (
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">
              Salón {nivelAnalisis === "materia" ? "(opcional)" : ""}
            </label>
            <Select value={salonSeleccionado || ""} onValueChange={(val) => {
              setSalonSeleccionado(val);
              setEstudianteSeleccionado?.("");
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar salón" />
              </SelectTrigger>
              <SelectContent>
                {nivelAnalisis === "materia" && <SelectItem value="all">Todos los salones</SelectItem>}
                {salonesDelGrado.map(s => (
                  <SelectItem key={s.salon} value={s.salon}>{s.salon}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Estudiante - visible para nivel estudiante */}
        {nivelAnalisis === "estudiante" && setEstudianteSeleccionado && gradoSeleccionado && salonSeleccionado && (
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Estudiante</label>
            <Select value={estudianteSeleccionado || ""} onValueChange={setEstudianteSeleccionado}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estudiante" />
              </SelectTrigger>
              <SelectContent>
                {estudiantes.map(est => (
                  <SelectItem key={est.codigo} value={est.codigo}>{est.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Materia - visible para nivel materia */}
        {nivelAnalisis === "materia" && setMateriaSeleccionada && (
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Materia</label>
            <Select value={materiaSeleccionada || ""} onValueChange={setMateriaSeleccionada}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar materia" />
              </SelectTrigger>
              <SelectContent>
                {materias.map(mat => (
                  <SelectItem key={mat} value={mat}>{mat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
};
