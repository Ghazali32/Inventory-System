/**
 * Tag Parser - Extracts product data from QR codes
 * 
 * Supported formats:
 * - "barcode" - Just product code
 * - "barcode|IMEI1" - Product + primary IMEI
 * - "barcode|IMEI1|IMEI2" - Product + both IMEIs
 * - "barcode,IMEI1,IMEI2" - Comma-separated format
 */

export interface ParsedTag {
  barcode: string;
  imei1: string | null;
  imei2: string | null;
  isValid: boolean;
  error?: string;
}

const IMEI_REGEX = /^\d{15}$/; // IMEI is always 15 digits

/**
 * Validates if a string is a valid IMEI (15 digits)
 */
function isValidIMEI(value: string): boolean {
  return IMEI_REGEX.test(value.trim());
}

/**
 * Parses a tag/QR code data to extract barcode and IMEIs
 * Supports formats: "barcode", "barcode|IMEI1", "barcode|IMEI1|IMEI2"
 */
export function parseTag(rawData: string): ParsedTag {
  try {
    // Trim whitespace
    const data = rawData.trim();

    if (!data) {
      return {
        barcode: '',
        imei1: null,
        imei2: null,
        isValid: false,
        error: 'Empty tag data',
      };
    }

    // Split by pipe or comma
    const parts = data.split(/[|,]/).map(p => p.trim()).filter(p => p.length > 0);

    if (parts.length === 0) {
      return {
        barcode: '',
        imei1: null,
        imei2: null,
        isValid: false,
        error: 'No data found in tag',
      };
    }

    // First part is always the barcode
    const barcode = parts[0];

    if (!barcode) {
      return {
        barcode: '',
        imei1: null,
        imei2: null,
        isValid: false,
        error: 'Barcode is empty',
      };
    }

    let imei1: string | null = null;
    let imei2: string | null = null;

    // Parse remaining parts as IMEIs
    if (parts.length > 1 && isValidIMEI(parts[1])) {
      imei1 = parts[1].trim();
    }

    if (parts.length > 2 && isValidIMEI(parts[2])) {
      imei2 = parts[2].trim();
    }

    return {
      barcode,
      imei1,
      imei2,
      isValid: true,
    };
  } catch (error) {
    return {
      barcode: '',
      imei1: null,
      imei2: null,
      isValid: false,
      error: 'Failed to parse tag data',
    };
  }
}

/**
 * Generates a tag string from components (reverse of parseTag)
 */
export function generateTagString(
  barcode: string,
  imei1?: string,
  imei2?: string
): string {
  let result = barcode;

  if (imei1) {
    result += `|${imei1}`;
  }

  if (imei2) {
    result += `|${imei2}`;
  }

  return result;
}

/**
 * Checks if a raw string looks like it contains multiple codes
 */
export function hasMultipleCodes(rawData: string): boolean {
  const parts = rawData.split(/[|,]/).filter(p => p.trim().length > 0);
  return parts.length > 1;
}
