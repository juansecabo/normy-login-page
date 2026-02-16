import Cookies from 'js-cookie';

// Función para obtener el dominio base para cookies compartidas
const getCookieDomain = (): string | undefined => {
  const hostname = window.location.hostname;
  if (hostname.includes('lovable.app')) {
    return '.lovable.app';
  }
  return undefined;
};

const getCookieOptions = () => {
  const domain = getCookieDomain();
  return {
    ...(domain ? { domain } : {}),
    sameSite: 'lax' as const,
    secure: window.location.protocol === 'https:'
  };
};

export interface HijoData {
  codigo: string;
  nombre: string;
  apellidos: string;
  nivel: string;
  grado: string;
  salon: string;
}

export interface SessionData {
  codigo: string | null;
  nombres: string | null;
  apellidos: string | null;
  cargo: string | null;
  nivel: string | null;
  grado: string | null;
  salon: string | null;
  hijos: HijoData[] | null;
}

// Cookie de sesión (sin expires → muere cuando el navegador se cierra)
const SESSION_COOKIE = 'normy_session_active';

export const saveSession = (
  codigo: string,
  nombres: string,
  apellidos: string,
  cargo: string = 'Profesor(a)',
  nivel?: string | null,
  grado?: string | null,
  salon?: string | null,
  hijos?: HijoData[] | null
) => {
  const cookieOptions = getCookieOptions();

  // Guardar datos en localStorage (persiste entre pestañas)
  localStorage.setItem("codigo", codigo);
  localStorage.setItem("nombres", nombres);
  localStorage.setItem("apellidos", apellidos);
  localStorage.setItem("cargo", cargo);

  if (nivel) localStorage.setItem("nivel", nivel);
  else localStorage.removeItem("nivel");

  if (grado) localStorage.setItem("grado", grado);
  else localStorage.removeItem("grado");

  if (salon) localStorage.setItem("salon", salon);
  else localStorage.removeItem("salon");

  if (hijos && hijos.length > 0) localStorage.setItem("hijos", JSON.stringify(hijos));
  else localStorage.removeItem("hijos");

  // Cookie de sesión sin expires → se borra al cerrar el navegador
  Cookies.set(SESSION_COOKIE, '1', cookieOptions);
};

export const getSession = (): SessionData => {
  // Si la cookie de sesión no existe, el navegador se reinició → limpiar todo
  if (!Cookies.get(SESSION_COOKIE)) {
    localStorage.removeItem("codigo");
    localStorage.removeItem("nombres");
    localStorage.removeItem("apellidos");
    localStorage.removeItem("cargo");
    localStorage.removeItem("nivel");
    localStorage.removeItem("grado");
    localStorage.removeItem("salon");
    localStorage.removeItem("hijos");
    return { codigo: null, nombres: null, apellidos: null, cargo: null, nivel: null, grado: null, salon: null, hijos: null };
  }

  const codigo = localStorage.getItem("codigo") || null;
  const nombres = localStorage.getItem("nombres") || null;
  const apellidos = localStorage.getItem("apellidos") || null;
  const cargo = localStorage.getItem("cargo") || null;
  const nivel = localStorage.getItem("nivel") || null;
  const grado = localStorage.getItem("grado") || null;
  const salon = localStorage.getItem("salon") || null;

  let hijos: HijoData[] | null = null;
  const hijosStr = localStorage.getItem("hijos");
  if (hijosStr) {
    try { hijos = JSON.parse(hijosStr); } catch { hijos = null; }
  }

  return { codigo, nombres, apellidos, cargo, nivel, grado, salon, hijos };
};

export const clearSession = () => {
  const cookieOptions = getCookieOptions();

  localStorage.removeItem("codigo");
  localStorage.removeItem("nombres");
  localStorage.removeItem("apellidos");
  localStorage.removeItem("cargo");
  localStorage.removeItem("nivel");
  localStorage.removeItem("grado");
  localStorage.removeItem("salon");
  localStorage.removeItem("hijos");
  localStorage.removeItem("asignaturaSeleccionada");
  localStorage.removeItem("gradoSeleccionado");
  localStorage.removeItem("salonSeleccionado");
  localStorage.removeItem("modoVisualizacion");
  localStorage.removeItem("estudianteSeleccionado");
  localStorage.removeItem("hijoSeleccionado");

  Cookies.remove(SESSION_COOKIE, cookieOptions);
};

export const hasValidSession = (): boolean => {
  const { codigo } = getSession();
  return !!codigo;
};

export const isRectorOrCoordinador = (): boolean => {
  const { cargo } = getSession();
  return cargo === 'Rector' || cargo === 'Coordinador(a)';
};

export const isProfesor = (): boolean => {
  const { cargo } = getSession();
  return cargo === 'Profesor(a)';
};

export const isEstudiante = (): boolean => {
  const { cargo } = getSession();
  return cargo === 'Estudiante';
};

export const isPadreDeFamilia = (): boolean => {
  const { cargo } = getSession();
  return cargo === 'Padre de familia';
};
