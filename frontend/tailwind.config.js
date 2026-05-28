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
        elderly: {
          bg: '#F8FAFC',
          text: '#0F172A',
          primary: '#1E3A8A', // Strong dark blue
          secondary: '#EAB308', // High contrast vibrant yellow
          accent: '#EF4444', // High contrast red for SOS
          success: '#22C55E', // Accessible dark green
          warning: '#F97316', // Orange stock alert
        }
      },
      fontSize: {
        'elderly-base': '1.25rem', // Large baseline font size (20px)
        'elderly-lg': '1.5rem',   // 24px
        'elderly-xl': '1.75rem',  // 28px
        'elderly-2xl': '2.25rem', // 36px
        'elderly-3xl': '3rem',    // 48px
      }
    },
  },
  plugins: [],
}
