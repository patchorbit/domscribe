/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'rgb(15, 23, 42)',
          accent: 'rgb(59, 130, 246)',
        },
      },
    },
  },
  plugins: [],
};
