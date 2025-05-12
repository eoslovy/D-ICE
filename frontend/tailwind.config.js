/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color)',
        secondary: 'var(--secondary-color)',
        tertiary: 'var(--tertiary-color)',
        quaternary: 'var(--quaternary-color)',
        quinary: 'var(--quinary-color)',
      },
    },
  },
  plugins: [
    plugin(function ({ addVariant }) {
      addVariant('dark', '&:is(.dark, .dark-mode)');
    }),
  ],
};
