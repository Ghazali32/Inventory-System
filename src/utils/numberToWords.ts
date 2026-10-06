/**
 * Utility to convert numbers to Indian numbering system words format.
 * Example: 32999 -> "Thirty Two Thousand Nine Hundred Ninety Nine Rupees Only"
 */

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertBelowThousand(n: number): string {
  let str = '';
  if (n >= 100) {
    str += `${ONES[Math.floor(n / 100)]} Hundred `;
    n %= 100;
  }
  if (n >= 20) {
    str += `${TENS[Math.floor(n / 10)]} `;
    n %= 10;
  }
  if (n > 0) {
    str += `${ONES[n]} `;
  }
  return str.trim();
}

export function numberToWords(amount: number | string | null | undefined): string {
  if (amount == null) return '';
  let num: number;
  if (typeof amount === 'string') {
    const cleaned = amount.replace(/[^0-9.-]/g, '');
    num = parseFloat(cleaned);
  } else {
    num = amount;
  }
  if (isNaN(num) || num === 0) return 'Zero Rupees Only';

  const absNum = Math.abs(num);
  const integerPart = Math.floor(absNum);
  const decimalPart = Math.round((absNum - integerPart) * 100);

  let result = '';

  // Indian numbering system: Crores, Lakhs, Thousands, Hundreds
  let remaining = integerPart;

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;

  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;

  const hundred = remaining;

  if (crore > 0) {
    result += `${convertBelowThousand(crore)} Crore `;
  }
  if (lakh > 0) {
    result += `${convertBelowThousand(lakh)} Lakh `;
  }
  if (thousand > 0) {
    result += `${convertBelowThousand(thousand)} Thousand `;
  }
  if (hundred > 0) {
    result += `${convertBelowThousand(hundred)} `;
  }

  result = result.trim() + ' Rupees';

  if (decimalPart > 0) {
    result += ` and ${convertBelowThousand(decimalPart)} Paise`;
  }

  result += ' Only';

  return result.replace(/\s+/g, ' ').trim();
}
