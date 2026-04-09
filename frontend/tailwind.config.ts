import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Telangana Government blue palette
        gov: {
          50:  '#EFF4FB',
          100: '#D6E4F4',
          200: '#ADC9E9',
          300: '#84AEDF',
          400: '#5B93D4',
          500: '#3278C9',
          600: '#1A3C6E',   // Primary government blue
          700: '#163261',
          800: '#112754',
          900: '#0C1C47',
        },
        // Saffron accent (Indian flag inspired)
        saffron: {
          400: '#FFB347',
          500: '#FF6B2B',
          600: '#E85A1A',
        },
        // Mine status colors
        mine: {
          active:     '#2563A8',
          expired:    '#6B7280',
          pending:    '#CA8A04',
          suspended:  '#DC2626',
          surrendered:'#7C3AED',
        },
        // Vehicle status colors
        vehicle: {
          moving:  '#22C55E',
          stopped: '#3B82F6',
          offline: '#9CA3AF',
          alert:   '#EF4444',
        },
        // Map background
        map: {
          bg:      '#0F172A',
          panel:   '#1E293B',
          border:  '#334155',
          text:    '#F1F5F9',
          muted:   '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up':   'slideUp 0.3s ease-out',
        'fade-in':    'fadeIn 0.2s ease-out',
        'ping-slow':  'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        slideUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
