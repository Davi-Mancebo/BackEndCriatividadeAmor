const BRAZIL_MOBILE_REGEX = /^\(\d{2}\) \d{5}-\d{4}$/;

export function extractDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function formatBrazilianCellPhone(value?: string | null) {
  if (!value) {
    return null;
  }

  const digits = extractDigits(value);

  if (digits.length !== 11) {
    return null;
  }

  const ddd = digits.slice(0, 2);
  const firstChunk = digits.slice(2, 7);
  const lastChunk = digits.slice(7);

  return `(${ddd}) ${firstChunk}-${lastChunk}`;
}

export function isBrazilianCellPhone(value?: string | null) {
  if (!value) {
    return false;
  }

  if (BRAZIL_MOBILE_REGEX.test(value)) {
    return true;
  }

  return formatBrazilianCellPhone(value) !== null;
}

export { BRAZIL_MOBILE_REGEX };
