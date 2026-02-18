import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import escudoImg from "@/assets/escudo.webp";
import normyImg from "@/assets/normy-placeholder.webp";
import cailicoLogo from "@/assets/cailico-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { saveSession, getSession, HijoData } from "@/hooks/useSession";

const Index = () => {
  const [identificacion, setIdentificacion] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [showContrasena, setShowContrasena] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Si ya hay sesión activa, redirigir sin pedir contraseña
  useEffect(() => {
    const session = getSession();
    if (session.codigo) {
      if (session.cargo === 'Rector' || session.cargo === 'Coordinador(a)') {
        navigate("/dashboard-rector", { replace: true });
      } else if (session.cargo === 'Estudiante') {
        navigate("/dashboard-estudiante", { replace: true });
      } else if (session.cargo === 'Padre de familia') {
        navigate("/dashboard-padre", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const idInput = identificacion.trim();
    const passInput = contrasena.trim();

    if (!idInput) {
      toast({ title: "Error", description: "Por favor ingresa tu # de identidad", variant: "destructive" });
      return;
    }
    if (!passInput) {
      toast({ title: "Error", description: "Por favor ingresa tu contraseña", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      // 1. Buscar en Internos por código de identidad
      const { data: usuario, error } = await supabase
        .from('Internos')
        .select('*')
        .eq('codigo', parseInt(idInput))
        .maybeSingle();

      if (error) {
        toast({ title: "Error", description: "Error al verificar", variant: "destructive" });
        setLoading(false);
        return;
      }

      if (usuario) {
        // Verificar contraseña de interno
        const contrasenaCorrecta = usuario.contrasena
          ? usuario.contrasena === passInput
          : String(usuario.codigo) === passInput;

        if (!contrasenaCorrecta) {
          toast({ title: "Error", description: "Contraseña incorrecta", variant: "destructive" });
          setLoading(false);
          return;
        }

        const cargosPermitidos = ['Profesor(a)', 'Rector', 'Coordinador(a)'];
        if (!cargosPermitidos.includes(usuario.cargo)) {
          toast({ title: "Acceso denegado", description: "No tienes permisos de acceso", variant: "destructive" });
          setLoading(false);
          return;
        }

        saveSession(String(usuario.codigo), usuario.nombres || "", usuario.apellidos || "", usuario.cargo || "");
        toast({ title: "Bienvenido(a)", description: `${usuario.nombres} ${usuario.apellidos}` });

        if (usuario.cargo === 'Rector' || usuario.cargo === 'Coordinador(a)') {
          navigate("/dashboard-rector");
        } else {
          navigate("/dashboard");
        }
        return;
      }

      // 2. Buscar en Perfiles_Generales como Estudiante
      const { data: perfilEstudiante, error: errEstudiante } = await supabase
        .from('Perfiles_Generales')
        .select('*')
        .eq('estudiante_codigo', idInput)
        .not('perfil', 'is', null)
        .maybeSingle();

      if (errEstudiante) {
        toast({ title: "Error", description: "Error al verificar", variant: "destructive" });
        setLoading(false);
        return;
      }

      if (perfilEstudiante) {
        if (perfilEstudiante.contrasena !== passInput) {
          toast({ title: "Error", description: "Contraseña incorrecta", variant: "destructive" });
          setLoading(false);
          return;
        }

        // Buscar datos del estudiante en tabla Estudiantes
        const { data: estData } = await supabase
          .from('Estudiantes')
          .select('*')
          .eq('codigo_estudiantil', idInput)
          .maybeSingle();

        const nivel = estData?.nivel_estudiante || perfilEstudiante.estudiante_nivel || '';
        const grado = estData?.grado_estudiante || perfilEstudiante.estudiante_grado || '';
        const salon = estData?.salon_estudiante || perfilEstudiante.estudiante_salon || '';
        const nombre = estData?.nombre_estudiante || perfilEstudiante.estudiante_nombre || '';
        const apellidos = estData?.apellidos_estudiante || perfilEstudiante.estudiante_apellidos || '';

        saveSession(idInput, nombre, apellidos, 'Estudiante', nivel, grado, salon);
        toast({ title: "Bienvenido(a)", description: `${nombre} ${apellidos}` });
        navigate("/dashboard-estudiante");
        return;
      }

      // 3. Buscar en Perfiles_Generales como Padre de familia
      const { data: perfilPadre, error: errPadre } = await supabase
        .from('Perfiles_Generales')
        .select('*')
        .eq('padre_codigo', idInput)
        .not('perfil', 'is', null)
        .maybeSingle();

      if (errPadre) {
        toast({ title: "Error", description: "Error al verificar", variant: "destructive" });
        setLoading(false);
        return;
      }

      if (perfilPadre) {
        if (perfilPadre.contrasena !== passInput) {
          toast({ title: "Error", description: "Contraseña incorrecta", variant: "destructive" });
          setLoading(false);
          return;
        }

        // Construir lista de hijos
        const hijos: HijoData[] = [];
        const numMap: Record<string, number> = { "1 (uno)": 1, "2 (dos)": 2, "3 (tres)": 3 };
        const numHijos = numMap[perfilPadre.padre_numero_de_estudiantes] || 0;

        for (let i = 1; i <= numHijos; i++) {
          const codigoHijo = perfilPadre[`padre_estudiante${i}_codigo` as keyof typeof perfilPadre];
          if (!codigoHijo) continue;

          // Buscar datos actualizados del hijo en Estudiantes
          const { data: hijoData } = await supabase
            .from('Estudiantes')
            .select('*')
            .eq('codigo_estudiantil', String(codigoHijo))
            .maybeSingle();

          if (hijoData) {
            hijos.push({
              codigo: String(hijoData.codigo_estudiantil),
              nombre: hijoData.nombre_estudiante || '',
              apellidos: hijoData.apellidos_estudiante || '',
              nivel: hijoData.nivel_estudiante || '',
              grado: hijoData.grado_estudiante || '',
              salon: hijoData.salon_estudiante || '',
            });
          } else {
            // Fallback: usar datos del perfil
            hijos.push({
              codigo: String(codigoHijo),
              nombre: (perfilPadre as any)[`padre_estudiante${i}_nombre`] || '',
              apellidos: (perfilPadre as any)[`padre_estudiante${i}_apellidos`] || '',
              nivel: (perfilPadre as any)[`padre_estudiante${i}_nivel`] || '',
              grado: (perfilPadre as any)[`padre_estudiante${i}_grado`] || '',
              salon: (perfilPadre as any)[`padre_estudiante${i}_salon`] || '',
            });
          }
        }

        const nombrePadre = perfilPadre.padre_nombre || '';
        saveSession(idInput, nombrePadre, '', 'Padre de familia', null, null, null, hijos);
        toast({ title: "Bienvenido(a)", description: nombrePadre });
        navigate("/dashboard-padre");
        return;
      }

      // 4. No encontrado en ninguna tabla
      toast({ title: "Error", description: "Identificación no encontrada", variant: "destructive" });
    } catch {
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Columna Izquierda - Imagen de Normy */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12 bg-secondary/50">
        <div className="animate-scale-in">
          <img
            src={normyImg}
            alt="Normy - Mascota de Notas Normy"
            className="w-64 h-64 lg:w-80 lg:h-80 object-cover rounded-full shadow-soft border-4 border-primary/20"
          />
        </div>
      </div>

      {/* Columna Derecha - Formulario de Login */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Escudo */}
          <div className="flex justify-center">
            <img
              src={escudoImg}
              alt="Escudo Escuela Normal Superior de Corozal"
              className="w-28 h-auto object-contain"
            />
          </div>

          {/* Títulos */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
              Notas Normy
            </h1>
            <p className="text-muted-foreground text-sm lg:text-base">
              Escuela Normal Superior de Corozal
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="identificacion"
                className="block text-sm font-medium text-foreground"
              >
                Digita tu # de identidad
              </label>
              <Input
                id="identificacion"
                type="text"
                inputMode="numeric"
                placeholder="Número de identidad"
                value={identificacion}
                onChange={(e) => setIdentificacion(e.target.value)}
                className="w-full h-12 text-base border-input bg-background focus:ring-2 focus:ring-primary/20 transition-all"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="contrasena"
                className="block text-sm font-medium text-foreground"
              >
                Digita tu contraseña
              </label>
              <div className="relative">
                <Input
                  id="contrasena"
                  type={showContrasena ? "text" : "password"}
                  placeholder="Contraseña"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  className="w-full h-12 text-base border-input bg-background focus:ring-2 focus:ring-primary/20 transition-all pr-12"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowContrasena(!showContrasena)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showContrasena ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold shadow-button hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
              disabled={loading}
            >
              {loading ? "Verificando..." : "Ingresar"}
            </Button>
          </form>

          {/* Desarrollado por */}
          <div className="text-center pt-4 space-y-2">
            <p className="text-xs text-muted-foreground">Desarrollado por:</p>
            <img
              src={cailicoLogo}
              alt="Cailico"
              className="h-8 mx-auto"
            />
            <a
              href="https://cailico.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              cailico.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
