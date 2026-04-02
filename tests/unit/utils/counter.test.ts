import { describe, it, expect } from 'vitest';

describe('counter logic', () => {
  it('should increment counter', () => {
    let count = 0;
    const increment = () => count++;
    increment();
    expect(count).toBe(1);
  });

  it('should decrement counter', () => {
    let count = 1;
    const decrement = () => count--;
    decrement();
    expect(count).toBe(0);
  });

  it('should reset counter', () => {
    let count = 5;
    const reset = () => (count = 0);
    reset();
    expect(count).toBe(0);
  });
});

describe('string utilities', () => {
  it('should format template strings', () => {
    const format = (template: string, vars: Record<string, string>) => {
      return template.replace(/\$(\w+)\$/g, (_, key) => vars[key] || '');
    };
    expect(format('Hello $NAME$', { NAME: 'World' })).toBe('Hello World');
  });

  it('should handle missing variables', () => {
    const format = (template: string, vars: Record<string, string>) => {
      return template.replace(/\$(\w+)\$/g, (_, key) => vars[key] || '');
    };
    expect(format('Hello $NAME$', {})).toBe('Hello ');
  });
});
