/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./js/**/*.js",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
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
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      maxWidth: {
        '8xl': '88rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 0 0 1px rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      transitionDuration: {
        '250': '250ms',
      },
    }
  },
  plugins: [],
} 