const VALID_IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export interface CalculationResult {
  results: Record<string, unknown>;
  errors: Record<string, string>;
}

export function evaluateCalculations(
  calcs: Record<string, string>,
  context: Record<string, unknown>,
): CalculationResult {
  const results: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  const vars: Record<string, unknown> = { ...context };

  for (const [name, expr] of Object.entries(calcs)) {
    try {
      const keys = Object.keys(vars).filter((k) => VALID_IDENTIFIER.test(k));
      const fn = new Function(...keys, `"use strict"; return (${expr});`);
      const value = fn(...keys.map((k) => vars[k]));
      results[name] = value;
      vars[name] = value;
    } catch (e) {
      errors[name] = (e as Error).message;
    }
  }

  return { results, errors };
}

export function interpolateTemplate(
  template: string,
  context: Record<string, unknown>,
): string {
  return template.replace(/\{\{\s*([\w$]+)\s*\}\}/g, (match, key: string) => {
    if (key in context && context[key] !== undefined) {
      return String(context[key]);
    }
    return match;
  });
}
