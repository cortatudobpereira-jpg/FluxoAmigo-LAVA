export const formatCurrencyInput = (value: string): string => {
  if (!value) return '';
  
  // Remove everything except numbers, commas, and dots
  let clean = value.replace(/[^\d,.]/g, '');
  if (!clean) return '';

  // Handle cases where a dot is used instead of a comma for decimals (e.g., 50.50 -> 50,50)
  const dotParts = clean.split('.');
  if (dotParts.length === 2 && !clean.includes(',') && dotParts[1].length <= 2) {
    clean = clean.replace('.', ',');
  } else {
    // Strip all dots (assume they are thousand separators)
    clean = clean.replace(/\./g, '');
  }

  const commaParts = clean.split(',');
  
  let integerPart = commaParts[0] || '0';
  let decimalPart = commaParts[1];

  // Force two decimal places
  if (decimalPart === undefined) {
    decimalPart = '00';
  } else if (decimalPart.length === 0) {
    decimalPart = '00';
  } else if (decimalPart.length === 1) {
    decimalPart += '0';
  } else if (decimalPart.length > 2) {
    decimalPart = decimalPart.substring(0, 2);
  }

  // Remove leading zeros from integer part
  integerPart = integerPart.replace(/^0+/, '');
  if (integerPart === '') {
    integerPart = '0';
  }

  // Add thousand separators
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${integerPart},${decimalPart}`;
};
