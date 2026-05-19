/**
 * Compares two values based on a specified condition
 */
export function compareValues(fieldValue: unknown, condition: string, compareValue: string): boolean {
  const fieldStr = String(fieldValue);
  const compareStr = String(compareValue);

  const numField = !isNaN(Number(fieldValue)) ? Number(fieldValue) : NaN;
  const numCompare = !isNaN(Number(compareValue)) ? Number(compareValue) : NaN;

  switch (condition) {
    case '===':
      return fieldStr === compareStr;
    case '!==':
      return fieldStr !== compareStr;
    case '>':
      return !isNaN(numField) && !isNaN(numCompare) && numField > numCompare;
    case '<':
      return !isNaN(numField) && !isNaN(numCompare) && numField < numCompare;
    case '>=':
      return !isNaN(numField) && !isNaN(numCompare) && numField >= numCompare;
    case '<=':
      return !isNaN(numField) && !isNaN(numCompare) && numField <= numCompare;
    default:
      return false;
  }
}
