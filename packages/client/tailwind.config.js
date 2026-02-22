/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#080810',
        surface: '#0f0f1a',
        'surface-2': '#161624',
        'surface-3': '#1e1e2e',
        border: '#252538',
        'border-2': '#333350',
        muted: '#5555a0',
        accent: '#ff6b6b',
        green: '#6bcb77',
      },
      fontFamily: {
        mono: ['"Space Mono"', 'monospace'],
        display: ['"Syncopate"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
