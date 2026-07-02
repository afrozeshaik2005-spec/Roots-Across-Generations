/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ancestral: {
          50: '#fbfaf7',
          100: '#f5f2eb',
          200: '#e6dfd1',
          300: '#cca05a', // Accent Gold
          400: '#b0813e',
          500: '#2c4c38', // Forest Green Primary
          600: '#203929',
          700: '#16281d',
          800: '#0d1811',
          900: '#060c08',
        },
        gold: {
          50: '#fbf8eb',
          100: '#f5eecc',
          200: '#eade93',
          300: '#dbca55',
          400: '#ceb12b',
          500: '#bda122',
          600: '#947a17',
          700: '#6f5914',
          800: '#4c3b10',
          900: '#34280b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-hover': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
      },
      backdropFilter: {
        none: 'none',
        blur: 'blur(20px)',
      },
    },
  },
  plugins: [],
}
