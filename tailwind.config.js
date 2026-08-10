/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.{html,js}"],
  darkMode: 'class', // Ativa o modo escuro via classe CSS
  theme: {
    extend: {
      colors: {
        ibm: {
          blue: '#0f62fe',
          hover: '#0353e9',
          text: '#161616',
          gray: '#8d8d8d',
          light: '#f4f4f4'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      }
    }
  },
  plugins: [],
}