/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F7F7FA',
          100: '#EDEDF0',
          200: '#D1D1D6',
          300: '#B0B0B8',
          400: '#8E8E93',
          500: '#636366',
          600: '#48484A',
          700: '#1C1C1E',
        },
        accent: {
          50: '#F0FDF9',
          100: '#CCF2E9',
          200: '#99E5D3',
          300: '#66D6BC',
          400: '#33C9A6',
          500: '#00B894',
          600: '#00997A',
          700: '#007A61',
        },
        error: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
        darkbg: '#181A1B',
        darkcard: '#23272A',
        darktext: '#E5E7EB',
      }
    }
  },
  plugins: [],
} 