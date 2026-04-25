/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff', 100: '#d9eaff', 200: '#b7d6ff', 300: '#8abbff',
          400: '#5a97ff', 500: '#3b77f7', 600: '#285ddb', 700: '#2149ad',
          800: '#1f3f87', 900: '#1d376c',
        },
      },
    },
  },
  plugins: [],
};
