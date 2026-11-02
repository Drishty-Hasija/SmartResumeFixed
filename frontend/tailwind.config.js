/** @type {import('tailwindcss').Config} */
// Colours are CSS variables (see index.css), so light/dark themes switch at runtime
// without rebuilding. The "<alpha-value>" placeholder keeps opacity modifiers like bg-canvas/95 working.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: v('ink'), soft: v('ink-soft'), muted: v('ink-muted') },
        canvas: v('canvas'),
        surface: { DEFAULT: v('surface'), soft: v('surface-soft') },
        line: { DEFAULT: v('line'), strong: v('line-strong') },
        accent: { DEFAULT: v('accent'), dark: v('accent-dark'), soft: v('accent-soft') },
        'on-accent': v('on-accent'),
        success: { DEFAULT: v('success'), soft: v('success-soft') },
        warning: { DEFAULT: v('warning'), soft: v('warning-soft') },
        danger: { DEFAULT: v('danger'), soft: v('danger-soft') },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: { xs: '2px', sm: '4px', DEFAULT: '6px', md: '6px', lg: '10px', xl: '14px' },
      maxWidth: { marketing: '1200px', app: '1200px', prose: '70ch' },
      boxShadow: {
        menu: '0 10px 30px -8px rgb(0 0 0 / 0.18)',
        modal: '0 24px 60px -12px rgb(0 0 0 / 0.28)',
        focus: '0 0 0 3px rgb(var(--accent) / 0.22)',
      },
      transitionTimingFunction: { out: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      keyframes: {
        reveal: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        pop: { from: { opacity: '0', transform: 'scale(0.98)' }, to: { opacity: '1', transform: 'none' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        spin: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        reveal: 'reveal 260ms cubic-bezier(0.16,1,0.3,1) both',
        pop: 'pop 180ms cubic-bezier(0.16,1,0.3,1) both',
        shimmer: 'shimmer 1.6s linear infinite',
        spin: 'spin 0.9s linear infinite',
      },
    },
  },
  plugins: [],
}
