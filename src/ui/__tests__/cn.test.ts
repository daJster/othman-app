import { cn } from '@/ui/cn';

describe('cn', () => {
  it('drops falsy entries', () => {
    expect(cn('p-2', false, undefined, null, 'p-2')).toBe('p-2');
  });

  it('lets later utilities win over earlier ones', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-sm', 'text-foreground', 'text-lg')).toBe(
      'text-foreground text-lg',
    );
  });

  it('merges conditional objects and arrays', () => {
    expect(cn(['rounded-lg', { 'bg-primary': true, 'bg-card': false }])).toBe(
      'rounded-lg bg-primary',
    );
  });

  it('keeps custom (non-Tailwind) classes untouched', () => {
    expect(cn('card-surface', 'p-4')).toBe('card-surface p-4');
  });
});
