/**
 * Calculates a pet's age from their date of birth and returns
 * a descriptive localized string (e.g., "3 years", "8 months", "1 year and 2 months").
 */
export function calcularEdadMascota(fechaNacimiento: string): string {
  const locale = (typeof localStorage !== 'undefined' ? localStorage.getItem('petplant_locale') : 'es') || 'es';
  const isEn = locale === 'en';

  if (!fechaNacimiento) {
    return isEn ? 'Unknown age' : 'Edad desconocida';
  }
  
  const birthDate = new Date(fechaNacimiento);
  const today = new Date();
  
  // If date of birth is invalid, return unknown age
  if (isNaN(birthDate.getTime())) {
    return isEn ? 'Unknown age' : 'Edad desconocida';
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
    return isEn ? 'Newborn' : 'Recién nacido';
  }
  
  if (years === 0) {
    if (months === 0) {
      return isEn ? 'Less than 1 month' : 'Menos de 1 mes';
    }
    if (isEn) {
      return months === 1 ? '1 month' : `${months} months`;
    }
    return months === 1 ? '1 mes' : `${months} meses`;
  }
  
  if (months === 0) {
    if (isEn) {
      return years === 1 ? '1 year' : `${years} years`;
    }
    return years === 1 ? '1 año' : `${years} años`;
  }
  
  if (isEn) {
    const yearsText = years === 1 ? '1 year' : `${years} years`;
    const monthsText = months === 1 ? '1 month' : `${months} months`;
    return `${yearsText} and ${monthsText}`;
  } else {
    const aniosText = years === 1 ? '1 año' : `${years} años`;
    const mesesText = months === 1 ? '1 mes' : `${months} meses`;
    return `${aniosText} y ${mesesText}`;
  }
}
