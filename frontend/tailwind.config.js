/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'space-blue': '#0B1426',
        'space-purple': '#1A0B2E',
        'star-yellow': '#F4D03F',
        'cosmic-blue': '#3498DB',
        'nebula-purple': '#8E44AD',
      },
      backgroundImage: {
        'starry-night': "radial-gradient(circle at 25% 25%, #1A0B2E 0%, #0B1426 25%, #000814 75%)",
      },
      animation: {
        'twinkle': 'twinkle 2s infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.3 },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
