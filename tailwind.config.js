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
          50: '#F6F8FA',
          100: '#E9EEF3',
          200: '#D3DAE6',
          300: '#B7C3D8',
          400: '#8CA3BE',
          500: '#5B7A99',
          600: '#3B5670',
          700: '#25344A',
        },
        accent: {
          50: '#F3FBFA',
          100: '#D6F5F0',
          200: '#AEE7DF',
          300: '#7AD6C8',
          400: '#4FC3B3',
          500: '#2A9D8F',
          600: '#21756B',
          700: '#174F47',
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
      }
    }
  },
  plugins: [],
} 