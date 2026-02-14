import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import DashboardRector from "./pages/DashboardRector";
import SeleccionarGrado from "./pages/SeleccionarGrado";
import SeleccionarSalon from "./pages/SeleccionarSalon";
import TablaNotas from "./pages/TablaNotas";
import ActividadesCalendario from "./pages/ActividadesCalendario";
import NormyExaminadora from "./pages/NormyExaminadora";
import NotFound from "./pages/NotFound";

// Rutas para Rector/Coordinador
import SeleccionarGradoRector from "./pages/rector/SeleccionarGradoRector";
import SeleccionarSalonRector from "./pages/rector/SeleccionarSalonRector";
import ModoVisualizacion from "./pages/rector/ModoVisualizacion";
import ListaAsignaturas from "./pages/rector/ListaAsignaturas";
import ListaEstudiantes from "./pages/rector/ListaEstudiantes";
import TablaNotasReadOnly from "./pages/rector/TablaNotasReadOnly";
import EstudianteConsolidado from "./pages/rector/EstudianteConsolidado";
import EstadisticasDashboard from "./pages/rector/EstadisticasDashboard";
import EstudiantesEnRiesgo from "./pages/rector/EstudiantesEnRiesgo";

// Rutas para Profesor
import EstadisticasProfesor from "./pages/profesor/EstadisticasProfesor";

// Ruta compartida
import EnviarComunicado from "./pages/EnviarComunicado";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard-rector" element={<DashboardRector />} />
          <Route path="/seleccionar-grado" element={<SeleccionarGrado />} />
          <Route path="/seleccionar-salon" element={<SeleccionarSalon />} />
          <Route path="/tabla-notas" element={<TablaNotas />} />
          <Route path="/actividades-calendario" element={<ActividadesCalendario />} />
          <Route path="/normy-examinadora" element={<NormyExaminadora />} />
          
          {/* Rutas para Rector/Coordinador */}
          <Route path="/rector/seleccionar-grado" element={<SeleccionarGradoRector />} />
          <Route path="/rector/seleccionar-salon" element={<SeleccionarSalonRector />} />
          <Route path="/rector/modo-visualizacion" element={<ModoVisualizacion />} />
          <Route path="/rector/lista-asignaturas" element={<ListaAsignaturas />} />
          <Route path="/rector/lista-estudiantes" element={<ListaEstudiantes />} />
          <Route path="/rector/tabla-notas" element={<TablaNotasReadOnly />} />
          <Route path="/rector/estudiante-consolidado" element={<EstudianteConsolidado />} />
          <Route path="/rector/estadisticas" element={<EstadisticasDashboard />} />
          <Route path="/rector/estudiantes-riesgo" element={<EstudiantesEnRiesgo />} />

          {/* Rutas para Profesor */}
          <Route path="/profesor/estadisticas" element={<EstadisticasProfesor />} />

          {/* Ruta compartida */}
          <Route path="/enviar-comunicado" element={<EnviarComunicado />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
