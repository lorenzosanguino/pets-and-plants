/**
 * Calcula la edad de una mascota a partir de su fecha de nacimiento
 * y devuelve un texto descriptivo en español (ej. "3 años", "8 meses", "1 año y 2 meses").
 */
export function calcularEdadMascota(fechaNacimiento: string): string {
  if (!fechaNacimiento) return 'Edad desconocida';
  
  const birthDate = new Date(fechaNacimiento);
  const today = new Date();
  
  // Si la fecha de nacimiento no es válida, retornar edad desconocida
  if (isNaN(birthDate.getTime())) {
    return 'Edad desconocida';
  }

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  const days = today.getDate() - birthDate.getDate();
  
  if (days < 0) {
    months--;
  }
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  if (years < 0) {
    return 'Recién nacido';
  }
  
  if (years === 0) {
    if (months === 0) {
      return 'Menos de 1 mes';
    }
    return months === 1 ? '1 mes' : `${months} meses`;
  }
  
  if (months === 0) {
    return years === 1 ? '1 año' : `${years} años`;
  }
  
  const aniosText = years === 1 ? '1 año' : `${years} años`;
  const mesesText = months === 1 ? '1 mes' : `${months} meses`;
  return `${aniosText} y ${mesesText}`;
}
