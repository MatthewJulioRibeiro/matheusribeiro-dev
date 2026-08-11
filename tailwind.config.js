/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.{html,js}"],
  darkMode: 'class', // Ativa o modo escuro via classe CSS
  theme: {
    extend: {
      colors: {
        // "ibm" namespace kept for minimal churn across templates; values now
        // point at the v2 brand palette (MuleSoft cyan + IBM ACE royal blue)
        // instead of literal IBM Blue.
        ibm: {
          blue: '#0098C9',
          'blue-bright': '#3FCBF2',
          royal: '#2A5ADB',
          'royal-bright': '#7592FF',
          hover: '#007099',
          text: '#0B1930',
          gray: '#5B6B84',
          light: '#F4F7FB'
        }
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      }
    }
  },
  plugins: [],
}