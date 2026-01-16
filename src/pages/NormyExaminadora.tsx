import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import escudoImg from "@/assets/escudo.png";
import normyImg from "@/assets/normy-examinadora.png";
import { getSession, clearSession } from "@/hooks/useSession";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Asignacion {
  "Materia(s)": string[];
  "Grado(s)": string[];
  "Salon(es)": string[];
}

const NormyExaminadora = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [enviando, setEnviando] = useState(false);
  
  // Form state
  const [tipoActividad, setTipoActividad] = useState<string>("");
  const [materiaSeleccionada, setMateriaSeleccionada] = useState<string>("");
  const [gradoSeleccionado, setGradoSeleccionado] = useState<string>("");
  const [salonSeleccionado, setSalonSeleccionado] = useState<string>("");
  const [tema, setTema] = useState("");
  const [instrucciones, setInstrucciones] = useState("");
  const [preguntasMultiple, setPreguntasMultiple] = useState<string>("5");
  const [preguntasAbiertas, setPreguntasAbiertas] = useState<string>("0");
  
  // Data from DB
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [materias, setMaterias] = useState<string[]>([]);
  const [grados, setGrados] = useState<string[]>([]);
  const [salones, setSalones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [idProfesor, setIdProfesor] = useState<string>("");

  useEffect(() => {
    const session = getSession();
    
    if (!session.codigo) {
      navigate("/");
      return;
    }

    setNombres(session.nombres || "");
    setApellidos(session.apellidos || "");

    const fetchAsignaciones = async () => {
      try {
        const { data: profesor, error: profesorError } = await supabase
          .from('Internos')
          .select('id')
          .eq('codigo', parseInt(session.codigo!))
          .single();

        if (profesorError || !profesor) {
          setLoading(false);
          return;
        }

        // Guardar el id del profesor
        setIdProfesor(profesor.id);

        const { data: asignacionesData, error: asignacionError } = await supabase
          .from('Asignación Profesores')
          .select('"Materia(s)", "Grado(s)", "Salon(es)"')
          .eq('id', profesor.id);

        if (asignacionError || !asignacionesData) {
          setLoading(false);
          return;
        }

        setAsignaciones(asignacionesData as Asignacion[]);
        
        // Extract unique materias
        const todasMaterias = asignacionesData
          ?.flatMap(a => a['Materia(s)'] || [])
          .flat() || [];
        const materiasUnicas = [...new Set(todasMaterias)].sort((a, b) => a.localeCompare(b, 'es'));
        setMaterias(materiasUnicas);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAsignaciones();
  }, [navigate]);

  // Update grados when materia changes
  useEffect(() => {
    if (!materiaSeleccionada) {
      setGrados([]);
      setGradoSeleccionado("");
      return;
    }

    const gradosParaMateria = asignaciones
      .filter(a => a['Materia(s)']?.includes(materiaSeleccionada))
      .flatMap(a => a['Grado(s)'] || [])
      .flat();
    
    const gradosUnicos = [...new Set(gradosParaMateria)].sort((a, b) => a.localeCompare(b, 'es'));
    setGrados(gradosUnicos);
    setGradoSeleccionado("");
    setSalonSeleccionado("");
  }, [materiaSeleccionada, asignaciones]);

  // Update salones when grado changes
  useEffect(() => {
    if (!gradoSeleccionado || !materiaSeleccionada) {
      setSalones([]);
      setSalonSeleccionado("");
      return;
    }

    const salonesParaGrado = asignaciones
      .filter(a => 
        a['Materia(s)']?.includes(materiaSeleccionada) && 
        a['Grado(s)']?.includes(gradoSeleccionado)
      )
      .flatMap(a => a['Salon(es)'] || [])
      .flat();
    
    const salonesUnicos = [...new Set(salonesParaGrado)].sort((a, b) => a.localeCompare(b, 'es'));
    setSalones(salonesUnicos);
    setSalonSeleccionado("");
  }, [gradoSeleccionado, materiaSeleccionada, asignaciones]);

  const handleLogout = () => {
    clearSession();
    navigate("/");
  };

  // Get display label for tipoActividad (capitalized)
  const getTipoActividadLabel = (tipo: string): string => {
    switch (tipo) {
      case 'evaluacion': return 'Evaluación';
      case 'taller': return 'Taller';
      case 'quiz': return 'Quiz';
      default: return tipo;
    }
  };

  const handleCrear = async () => {
    setEnviando(true);

    try {
      // Build payload with idProfesor first
      const payload: Record<string, unknown> = {
        idProfesor,
        timestamp: new Date().toISOString(),
        nombre: nombres,
        apellidos: apellidos,
        tipoActividad,
        materiaSeleccionada,
        gradoSeleccionado,
      };

      // Optional: salonSeleccionado (after gradoSeleccionado)
      if (salonSeleccionado) {
        payload.salonSeleccionado = salonSeleccionado;
      }

      // Required: tema
      payload.tema = tema;

      // Optional: instrucciones
      if (instrucciones && instrucciones.trim()) {
        payload.instrucciones = instrucciones.trim();
      }

      // Always include these last two
      payload.preguntasMultiple = parseInt(preguntasMultiple) || 0;
      payload.preguntasAbiertas = parseInt(preguntasAbiertas) || 0;

      const response = await fetch(
        "https://n8n.srv966880.hstgr.cloud/webhook/41f121b5-276e-453a-98b2-f300227e2e99",
        {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      // Check if response is a binary file (docx)
      const contentType = response.headers.get("Content-Type") || "";
      
      if (contentType.includes("application/vnd.openxmlformats") || 
          contentType.includes("application/octet-stream") ||
          contentType.includes("application/msword")) {
        // It's a file - download it
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        
        // Build filename: TipoActividad_Materia_Grado_Salon.docx
        const tipoLabel = getTipoActividadLabel(tipoActividad).toUpperCase();
        const materiaLabel = materiaSeleccionada.toUpperCase().replace(/ /g, "_");
        const gradoLabel = gradoSeleccionado;
        const salonLabel = salonSeleccionado || "";
        const fileName = salonLabel 
          ? `${tipoLabel}_${materiaLabel}_${gradoLabel}_${salonLabel}.docx`
          : `${tipoLabel}_${materiaLabel}_${gradoLabel}.docx`;
        
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      // Use correct grammatical gender: Evaluación (f) vs Taller/Quiz (m)
      const esFemenino = tipoActividad === 'evaluacion';
      toast({
        title: "¡Éxito!",
        description: `${getTipoActividadLabel(tipoActividad)} ${esFemenino ? 'generada' : 'generado'} exitosamente`,
      });
    } catch (error) {
      console.error("Error enviando al webhook:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar la actividad. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-2 md:py-3 px-3 md:px-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity cursor-pointer">
            <img
              src={escudoImg}
              alt="Escudo"
              className="w-10 h-10 md:w-16 md:h-16 object-contain -my-1 md:-my-2"
            />
            <h1 className="text-base md:text-xl font-bold">Notas Normy</h1>
          </Link>
          <Button
            variant="secondary"
            onClick={handleLogout}
            className="font-medium text-xs md:text-sm px-2 md:px-4 py-1 md:py-2"
          >
            Cerrar sesión
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-8">
        {/* Back button - at top */}
        <div className="max-w-3xl mx-auto mb-4">
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
          >
            ← Volver al Dashboard
          </Button>
        </div>

        {/* Title Section with Normy */}
        <div className="bg-card rounded-lg shadow-soft p-6 md:p-8 max-w-3xl mx-auto text-center mb-8 relative overflow-hidden">
          {/* Normy in background - hidden on mobile */}
          <img
            src={normyImg}
            alt="Normy Examinadora"
            className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 h-full w-auto object-contain pointer-events-none"
          />
          <div className="relative z-10">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
              Normy Examinadora
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Crea tus actividades académicas
            </p>
            <p className="text-base md:text-lg text-primary font-semibold mt-4">
              {nombres} {apellidos}
            </p>
          </div>
              {/* Normy image below text on mobile */}
              <img
                src={normyImg}
                alt="Normy Examinadora"
                className="md:hidden mx-auto mt-4 -mb-6 h-32 w-auto object-contain"
              />
            </div>

        {/* Form Section */}
        <div className="bg-card rounded-lg shadow-soft p-8 max-w-3xl mx-auto">
          {loading ? (
            <div className="text-center text-muted-foreground">
              Cargando...
            </div>
          ) : (
            <div className="space-y-6">
              {/* 1. Tipo de actividad */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">1. Quiero crear:</Label>
                <Select value={tipoActividad} onValueChange={setTipoActividad}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Selecciona el tipo de actividad" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="evaluacion">Evaluación</SelectItem>
                    <SelectItem value="taller">Taller</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 2. Materia */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">2. Materia:</Label>
                <Select value={materiaSeleccionada} onValueChange={setMateriaSeleccionada}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Selecciona la materia" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {materias.map((materia) => (
                      <SelectItem key={materia} value={materia}>
                        {materia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 3. Grado */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">3. Grado:</Label>
                <Select 
                  value={gradoSeleccionado} 
                  onValueChange={setGradoSeleccionado}
                  disabled={!materiaSeleccionada}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder={materiaSeleccionada ? "Selecciona el grado" : "Primero selecciona una materia"} />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {grados.map((grado) => (
                      <SelectItem key={grado} value={grado}>
                        {grado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 4. Salón (opcional) */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">4. Salón (opcional):</Label>
                <Select 
                  value={salonSeleccionado} 
                  onValueChange={setSalonSeleccionado}
                  disabled={!gradoSeleccionado}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder={gradoSeleccionado ? "Selecciona el salón" : "Primero selecciona un grado"} />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {salones.map((salon) => (
                      <SelectItem key={salon} value={salon}>
                        {salon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 5. Tema */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">5. Tema:</Label>
                <Input
                  type="text"
                  placeholder="Escribe el tema de la actividad"
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                  className="bg-background"
                />
              </div>

              {/* 6. Instrucciones (Opcional) */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">6. Instrucciones (Opcional):</Label>
                <Textarea
                  placeholder="Escribe instrucciones adicionales para la actividad"
                  value={instrucciones}
                  onChange={(e) => setInstrucciones(e.target.value)}
                  className="bg-background min-h-[100px]"
                />
              </div>

              {/* 7. Número de preguntas */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">7. Número de preguntas:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Selección múltiple:</Label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={parseInt(preguntasMultiple || "0") <= 0}
                        onClick={() => setPreguntasMultiple(String(Math.max(0, parseInt(preguntasMultiple || "0") - 1)))}
                        className="sm:hidden flex items-center justify-center w-10 h-10 rounded-md bg-muted hover:bg-muted/80 text-foreground font-bold text-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-muted"
                      >
                        −
                      </button>
                      <Input
                        type="number"
                        min={0}
                        max={30}
                        value={preguntasMultiple}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          if (val > 30) {
                            toast({
                              title: "Límite alcanzado",
                              description: "El máximo de preguntas de selección múltiple es 30",
                              variant: "destructive",
                            });
                            setPreguntasMultiple("30");
                          } else if (val < 0) {
                            setPreguntasMultiple("0");
                          } else {
                            setPreguntasMultiple(e.target.value);
                          }
                        }}
                        onFocus={(e) => {
                          if (e.target.value === "0") {
                            setPreguntasMultiple("");
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === "") {
                            setPreguntasMultiple("0");
                          }
                        }}
                        className="bg-background flex-1 text-center [appearance:textfield] sm:[appearance:auto] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none sm:[&::-webkit-outer-spin-button]:appearance-auto sm:[&::-webkit-inner-spin-button]:appearance-auto"
                      />
                      <button
                        type="button"
                        disabled={parseInt(preguntasMultiple || "0") >= 30}
                        onClick={() => setPreguntasMultiple(String(Math.min(30, parseInt(preguntasMultiple || "0") + 1)))}
                        className="sm:hidden flex items-center justify-center w-10 h-10 rounded-md bg-muted hover:bg-muted/80 text-foreground font-bold text-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-muted"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Preguntas abiertas:</Label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={parseInt(preguntasAbiertas || "0") <= 0}
                        onClick={() => setPreguntasAbiertas(String(Math.max(0, parseInt(preguntasAbiertas || "0") - 1)))}
                        className="sm:hidden flex items-center justify-center w-10 h-10 rounded-md bg-muted hover:bg-muted/80 text-foreground font-bold text-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-muted"
                      >
                        −
                      </button>
                      <Input
                        type="number"
                        min={0}
                        max={30}
                        value={preguntasAbiertas}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          if (val > 30) {
                            toast({
                              title: "Límite alcanzado",
                              description: "El máximo de preguntas abiertas es 30",
                              variant: "destructive",
                            });
                            setPreguntasAbiertas("30");
                          } else if (val < 0) {
                            setPreguntasAbiertas("0");
                          } else {
                            setPreguntasAbiertas(e.target.value);
                          }
                        }}
                        onFocus={(e) => {
                          if (e.target.value === "0") {
                            setPreguntasAbiertas("");
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === "") {
                            setPreguntasAbiertas("0");
                          }
                        }}
                        className="bg-background flex-1 text-center [appearance:textfield] sm:[appearance:auto] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none sm:[&::-webkit-outer-spin-button]:appearance-auto sm:[&::-webkit-inner-spin-button]:appearance-auto"
                      />
                      <button
                        type="button"
                        disabled={parseInt(preguntasAbiertas || "0") >= 30}
                        onClick={() => setPreguntasAbiertas(String(Math.min(30, parseInt(preguntasAbiertas || "0") + 1)))}
                        className="sm:hidden flex items-center justify-center w-10 h-10 rounded-md bg-muted hover:bg-muted/80 text-foreground font-bold text-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-muted"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón Crear */}
              <Button
                onClick={handleCrear}
                className="w-full bg-gradient-to-r from-primary to-green-600 hover:from-green-600 hover:to-primary text-white font-semibold py-6 text-lg"
                disabled={!tipoActividad || !materiaSeleccionada || !gradoSeleccionado || !tema || enviando}
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generando {getTipoActividadLabel(tipoActividad)}...
                  </>
                ) : (
                  "Crear"
                )}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default NormyExaminadora;
