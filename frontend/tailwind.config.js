/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aicte: {
          navy: '#0b1d3a',       // Deep navy blue navigation
          header: '#08152b',     // Top government bar
          blue: '#1a56db',       // Primary AICTE action blue
          light: '#f0f5ff',      // Soft blue tint
          gold: '#c29214',       // Emblem gold
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
      },
    },
  },
  plugins: [],
}
