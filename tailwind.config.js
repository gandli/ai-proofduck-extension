/** @type {import('tailwindcss').Config} */
export default {
  content: ['./entrypoints/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#ff5a11',
          ink: '#171717',
          sand: '#fff6ef',
        },
      },
    },
  },
  plugins: [],
};

