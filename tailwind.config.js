/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: '#F8F6F0', 50: '#FDFCF9', 100: '#F8F6F0', 200: '#EDE9DE' },
        primary: { DEFAULT: '#4776E6', 50: '#EEF3FD', 100: '#D5E2FA', 500: '#4776E6', 600: '#3562D4', 700: '#2950B8' },
        surface: { DEFAULT: '#FFFFFF', secondary: '#F9FAFB', border: '#E5E7EB', hover: '#F3F4F6' },
        ink: { DEFAULT: '#111827', secondary: '#4B5563', muted: '#9CA3AF' },
        success: { DEFAULT: '#10B981', light: '#D1FAE5', dark: '#065F46' },
        warning: { DEFAULT: '#F59E0B', light: '#FEF3C7', dark: '#92400E' },
        danger: { DEFAULT: '#EF4444', light: '#FEE2E2', dark: '#991B1B' },
        info: { DEFAULT: '#0EA5E9', light: '#E0F2FE', dark: '#0C4A6E' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { xl: '12px', '2xl': '16px', '3xl': '20px', '4xl': '24px' },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
        modal: '0 20px 60px rgba(0,0,0,0.15)',
        glow: '0 0 0 3px rgba(71,118,230,0.15)',
        'glow-lg': '0 0 40px rgba(71,118,230,0.2)',
      },
      backgroundOpacity: { 8: '0.08' },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'bounce-sm': 'bounceSm 0.4s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideInRight: { '0%': { transform: 'translateX(100%)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
        bounceSm: { '0%': { transform: 'scale(0.95)' }, '60%': { transform: 'scale(1.05)' }, '100%': { transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
};
