/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bread: {
          50: '#FFF8DC',
          100: '#FAEBD7',
          200: '#F5DEB3',
          300: '#DEB887',
          400: '#D2B48C',
          500: '#C4A574',
          600: '#8B4513',
          700: '#654321',
          800: '#3D2314',
          900: '#2C1810',
        },
        crust: {
          50: '#FAF0E6',
          100: '#F5E6D3',
          200: '#E8D4C4',
          300: '#D4B896',
          400: '#C19A6B',
          500: '#A67B5B',
          600: '#8B6914',
          700: '#6B4423',
          800: '#4A2C17',
          900: '#2D1B0E',
        }
      },
      fontFamily: {
        'display': ['Playfair Display', 'Georgia', 'serif'],
        'body': ['Source Sans Pro', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'thumb': ['1.125rem', { lineHeight: '1.75rem' }],
        'thumb-lg': ['1.25rem', { lineHeight: '1.875rem' }],
      },
      spacing: {
        'thumb': '3.5rem',
        'thumb-lg': '4rem',
      },
      borderRadius: {
        'bread': '1rem',
      },
      boxShadow: {
        'bread': '0 4px 14px 0 rgba(139, 69, 19, 0.15)',
        'bread-lg': '0 10px 30px 0 rgba(139, 69, 19, 0.2)',
      }
    },
  },
  plugins: [],
}

