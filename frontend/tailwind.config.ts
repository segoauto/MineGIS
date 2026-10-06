import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Telangana Government official blue palette
        gov: {
          50:  '#F0F5FA',
          100: '#E1ECF4',
          200: '#C3D9E9',
          300: '#95B8D6',
          400: '#5C90BF',
          500: '#2A6BA3',
          600: '#0B3C5D',   // Official Indian/Telangana Government Deep Navy Blue
          700: '#082D47',
          800: '#062033',
          900: '#041521',
        },
        // Indian National Tricolor accents
        tricolor: {
          saffron: '#FF671F',
          white:   '#FFFFFF',
          green:   '#046A38',
          navy:    '#06038D',
        },
        saffron: {
          400: '#FF9E43',
          500: '#FF671F',
          600: '#E65100',
        },
        // Mine status colors (high-contrast official badges)
        mine: {
          active:     '#0B3C5D',
          expired:    '#475569',
          pending:    '#B45309',
          suspended:  '#B91C1C',
          surrendered:'#6D28D9',
        },
        // Vehicle status colors
        vehicle: {
          moving:  '#15803D',
          stopped: '#1D4ED8',
          offline: '#64748B',
          alert:   '#DC2626',
        },
        // Official Government Light Portal theme
        map: {
          bg:      '#F1F5F9', // Clean light gray canvas
          panel:   '#FFFFFF', // Crisp white official panels
          border:  '#CBD5E1', // Slate-300 clean borders
          text:    '#0F172A', // Deep slate-900 readable text
          muted:   '#475569', // Slate-600 readable labels
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
