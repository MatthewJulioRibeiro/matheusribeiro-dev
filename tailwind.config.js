/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.{html,js}"],
  darkMode: 'class', // Ativa o modo escuro via classe CSS
  theme: {
    extend: {
      colors: {
        // "ibm" namespace kept for minimal churn across templates; v3 moves
        // to a comic-noir palette (deep red + ink) instead of the blue v2 set.
        ibm: {
          blue: '#B3122A',
          'blue-bright': '#E8323F',
          royal: '#B3122A',
          'royal-bright': '#E8323F',
          hover: '#7A0E18',
          text: '#1A1210',
          gray: '#6B5D52',
          light: '#F2ECE0'
        }
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        display: ['Anton', 'Impact', 'sans-serif'],
      }
    }
  },
  plugins: [],
}