/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        charcoal: {
          950: '#0e0e10',
          900: '#141416',
          875: '#17171a',
          850: '#1a1a1d',
          800: '#1f1f23',
          750: '#25252a',
          700: '#2c2c32',
          650: '#34343b',
          600: '#3d3d45',
          500: '#52525b',
          400: '#71717a',
          300: '#a1a1aa',
          200: '#d4d4d8',
          100: '#e4e4e7',
        },
        brand: {
          50: '#fff5ed',
          100: '#ffe6d4',
          200: '#ffc8a8',
          300: '#ffa471',
          400: '#ff8038',
          500: '#ff6b1a',
          600: '#f04e00',
          700: '#c63d00',
          800: '#9d3300',
          900: '#7d2c05',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-orange': '0 0 0 1px rgba(255, 107, 26, 0.15), 0 4px 16px -4px rgba(255, 107, 26, 0.25)',
      },
    },
  },
  plugins: [],
};
