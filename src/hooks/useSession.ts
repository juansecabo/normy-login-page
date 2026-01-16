import Cookies from 'js-cookie';

const COOKIE_OPTIONS = { expires: 30 };

export interface SessionData {
  codigo: string | null;
  nombres: string | null;
  apellidos: string | null;
}

export const saveSession = (codigo: string, nombres: string, apellidos: string) => {
  // Guardar en localStorage
  localStorage.setItem("codigo", codigo);
  localStorage.setItem("nombres", nombres);
  localStorage.setItem("apellidos", apellidos);
  
  // Guardar en cookies como respaldo
  Cookies.set('normy_codigo', codigo, COOKIE_OPTIONS);
  Cookies.set('normy_nombres', nombres, COOKIE_OPTIONS);
  Cookies.set('normy_apellidos', apellidos, COOKIE_OPTIONS);
};

export const getSession = (): SessionData => {
  // Intentar obtener de localStorage primero, luego de cookies
  let codigo = localStorage.getItem("codigo") || Cookies.get('normy_codigo') || null;
  let nombres = localStorage.getItem("nombres") || Cookies.get('normy_nombres') || null;
  let apellidos = localStorage.getItem("apellidos") || Cookies.get('normy_apellidos') || null;
  
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
  
  return { codigo, nombres, apellidos };
};

export const clearSession = () => {
  // Limpiar localStorage
  localStorage.removeItem("codigo");
  localStorage.removeItem("nombres");
  localStorage.removeItem("apellidos");
  localStorage.removeItem("materiaSeleccionada");
  localStorage.removeItem("gradoSeleccionado");
  localStorage.removeItem("salonSeleccionado");
  
  // Limpiar cookies
  Cookies.remove('normy_codigo');
  Cookies.remove('normy_nombres');
  Cookies.remove('normy_apellidos');
};

export const hasValidSession = (): boolean => {
  const { codigo } = getSession();
  return !!codigo;
};
