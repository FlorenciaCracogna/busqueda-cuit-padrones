/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bordo: {
          50: '#fdf2f4',
          100: '#fce7ea',
          200: '#f9d0d8',
          300: '#f3a7b7',
          400: '#ea6e87',
          500: '#db3a5a',
          600: '#c6143a',
          700: '#99042f',
          800: '#8a0429',
          900: '#710522',
          950: '#3e000f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
