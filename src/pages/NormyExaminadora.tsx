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
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { subirArchivos, ArchivoSubido } from "@/lib/storage";

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
  const [archivos, setArchivos] = useState<File[]>([]);
  const [soloDeArchivos, setSoloDeArchivos] = useState(false);
  const [preguntasMultiple, setPreguntasMultiple] = useState<number>(5);
  const [preguntasAbiertas, setPreguntasAbiertas] = useState<number>(0);
  
  // Data from DB
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [materias, setMaterias] = useState<string[]>([]);
  const [grados, setGrados] = useState<string[]>([]);
  const [salones, setSalones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

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

  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(file => 
        allowedTypes.includes(file.type)
      );
      setArchivos(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    const newArchivos = archivos.filter((_, i) => i !== index);
    setArchivos(newArchivos);
    if (newArchivos.length === 0) {
      setSoloDeArchivos(false);
    }
  };


  // Calculate total file size
  const totalFileSize = archivos.reduce((acc, file) => acc + file.size, 0);
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    // Validate total file size
    if (totalFileSize > MAX_FILE_SIZE) {
      toast({
        title: "Error",
        description: "Los archivos son demasiado grandes. El límite es 5MB en total.",
        variant: "destructive",
      });
      return;
    }

    setEnviando(true);

    try {
      // Upload files to Supabase Storage and get URLs
      let archivosSubidos: ArchivoSubido[] = [];
      if (archivos.length > 0) {
        archivosSubidos = await subirArchivos(archivos);
      }

      // Build payload in exact UI order
      const payload: Record<string, unknown> = {
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

      // Optional: archivos + soloDeArchivos (only if there are files)
      if (archivosSubidos.length > 0) {
        payload.archivos = archivosSubidos;
        payload.soloDeArchivos = soloDeArchivos;
      }

      // Always include these last two
      payload.preguntasMultiple = preguntasMultiple;
      payload.preguntasAbiertas = preguntasAbiertas;

      const response = await fetch(
        "https://n8n.srv966880.hstgr.cloud/webhook-test/41f121b5-276e-453a-98b2-f300227e2e99",
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

      // Get the DOCX file from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${getTipoActividadLabel(tipoActividad)}_${materiaSeleccionada}_${tema}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

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
        <div className="container mx-auto flex items-center justify-between gap-2">
          <Link to="/dashboard" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity cursor-pointer min-w-0">
            <img
              src={escudoImg}
              alt="Escudo"
              className="w-10 h-10 md:w-16 md:h-16 object-contain flex-shrink-0"
            />
            <h1 className="text-base md:text-xl font-bold truncate">Notas Normy</h1>
          </Link>
          <Button
            variant="secondary"
            onClick={handleLogout}
            className="font-medium text-xs md:text-sm px-2 md:px-4 py-1 md:py-2 flex-shrink-0"
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

        {/* Title Section with Normy in background */}
        <div className="bg-card rounded-lg shadow-soft p-4 md:p-8 max-w-3xl mx-auto text-center mb-8 relative overflow-hidden">
          {/* Normy in background - hidden on mobile, shown on desktop */}
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
            <p className="text-base md:text-lg text-primary font-semibold mt-3 md:mt-4">
              {nombres} {apellidos}
            </p>
          </div>
          {/* Normy image below text on mobile */}
          <img
            src={normyImg}
            alt="Normy Examinadora"
            className="md:hidden mx-auto mt-4 h-32 w-auto object-contain"
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

              {/* 7. Archivos */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">7. Archivos de referencia:</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Haz clic para subir archivos (PDF, Word, TXT)
                    </span>
                  </label>
                </div>
                {archivos.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <div className={`text-sm font-medium ${totalFileSize > MAX_FILE_SIZE ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {archivos.length} archivo{archivos.length > 1 ? 's' : ''} ({formatFileSize(totalFileSize)})
                      {totalFileSize > MAX_FILE_SIZE && ' - Excede el límite de 5MB'}
                    </div>
                    {archivos.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-muted p-3 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          <span className="text-sm truncate max-w-xs">{file.name}</span>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Checkbox - solo visible cuando hay archivos */}
                <div className={`flex items-center space-x-2 mt-4 ${archivos.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Checkbox
                    id="solo-archivos"
                    checked={soloDeArchivos}
                    onCheckedChange={(checked) => setSoloDeArchivos(checked === true)}
                    disabled={archivos.length === 0}
                  />
                  <label
                    htmlFor="solo-archivos"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Hacer preguntas solo de los archivos
                  </label>
                </div>
              </div>

              {/* 8. Número de preguntas */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">8. Número de preguntas:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Selección múltiple:</Label>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={preguntasMultiple}
                      onChange={(e) => setPreguntasMultiple(parseInt(e.target.value) || 0)}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Preguntas abiertas:</Label>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={preguntasAbiertas}
                      onChange={(e) => setPreguntasAbiertas(parseInt(e.target.value) || 0)}
                      className="bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* Botón Crear */}
              <Button
                onClick={handleCrear}
                className="w-full bg-gradient-to-r from-primary to-green-600 hover:from-green-600 hover:to-primary text-white font-semibold py-6 text-lg"
                disabled={!tipoActividad || !materiaSeleccionada || !gradoSeleccionado || !tema || enviando || totalFileSize > MAX_FILE_SIZE}
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
