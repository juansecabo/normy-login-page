export function getPeriodoActual(): number {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const periodos = [
    { numero: 1, inicio: new Date(y, 0, 19), fin: new Date(y, 2, 29) },
    { numero: 2, inicio: new Date(y, 3, 6), fin: new Date(y, 5, 14) },
    { numero: 3, inicio: new Date(y, 6, 6), fin: new Date(y, 8, 13) },
    { numero: 4, inicio: new Date(y, 8, 14), fin: new Date(y, 10, 29) },
  ];
  for (const p of periodos) {
    if (hoy >= p.inicio && hoy <= p.fin) return p.numero;
  }
  for (const p of periodos) {
    if (hoy < p.inicio) return p.numero;
  }
  return 1;
}
