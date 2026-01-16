import Cookies from 'js-cookie';

// Función para obtener el dominio base para cookies compartidas
const getCookieDomain = (): string | undefined => {
  const hostname = window.location.hostname;
  // Para subdominios de lovable.app, usar el dominio base
  if (hostname.includes('lovable.app')) {
    return '.lovable.app';
  }
  // Para localhost o dominios personalizados, no especificar dominio
  return undefined;
};

const getCookieOptions = () => {
  const domain = getCookieDomain();
  return {
    expires: 30,
    ...(domain ? { domain } : {}),
    sameSite: 'lax' as const,
    secure: window.location.protocol === 'https:'
  };
};

export interface SessionData {
  codigo: string | null;
  nombres: string | null;
  apellidos: string | null;
  cargo: string | null;
}

export const saveSession = (codigo: string, nombres: string, apellidos: string, cargo: string = 'Profesor(a)') => {
  const cookieOptions = getCookieOptions();
  
  // Guardar en localStorage
  localStorage.setItem("codigo", codigo);
  localStorage.setItem("nombres", nombres);
  localStorage.setItem("apellidos", apellidos);
  localStorage.setItem("cargo", cargo);
  
  // Guardar en cookies como respaldo (con dominio compartido)
  Cookies.set('normy_codigo', codigo, cookieOptions);
  Cookies.set('normy_nombres', nombres, cookieOptions);
  Cookies.set('normy_apellidos', apellidos, cookieOptions);
  Cookies.set('normy_cargo', cargo, cookieOptions);
};

export const getSession = (): SessionData => {
  // Intentar obtener de localStorage primero, luego de cookies
  let codigo = localStorage.getItem("codigo") || Cookies.get('normy_codigo') || null;
  let nombres = localStorage.getItem("nombres") || Cookies.get('normy_nombres') || null;
  let apellidos = localStorage.getItem("apellidos") || Cookies.get('normy_apellidos') || null;
  let cargo = localStorage.getItem("cargo") || Cookies.get('normy_cargo') || null;
  
  // Si hay cookie pero no localStorage, restaurar localStorage
  if (codigo && !localStorage.getItem("codigo")) {
    localStorage.setItem("codigo", codigo);
  }
  if (nombres && !localStorage.getItem("nombres")) {
    localStorage.setItem("nombres", nombres);
  }
  if (apellidos && !localStorage.getItem("apellidos")) {
    localStorage.setItem("apellidos", apellidos);
  }
  if (cargo && !localStorage.getItem("cargo")) {
    localStorage.setItem("cargo", cargo);
  }
  
  return { codigo, nombres, apellidos, cargo };
};

export const clearSession = () => {
  const cookieOptions = getCookieOptions();
  
  // Limpiar localStorage
  localStorage.removeItem("codigo");
  localStorage.removeItem("nombres");
  localStorage.removeItem("apellidos");
  localStorage.removeItem("cargo");
  localStorage.removeItem("materiaSeleccionada");
  localStorage.removeItem("gradoSeleccionado");
  localStorage.removeItem("salonSeleccionado");
  localStorage.removeItem("modoVisualizacion");
  localStorage.removeItem("estudianteSeleccionado");
  
  // Limpiar cookies (con dominio compartido)
  Cookies.remove('normy_codigo', cookieOptions);
  Cookies.remove('normy_nombres', cookieOptions);
  Cookies.remove('normy_apellidos', cookieOptions);
  Cookies.remove('normy_cargo', cookieOptions);
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
