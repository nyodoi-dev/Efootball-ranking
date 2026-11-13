/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // legacy dark theme (kept for admin)
        pitch: '#13201A',
        panel: '#1D2E25',
        panelAlt: '#243A2F',
        chalk: '#F4F1E8',
        muted: '#8FAE9C',
        lime: '#9FE870',
        coral: '#FF6B5B',
        gold: '#E8C468',
        // new light theme
        surface: '#F0F4F8',
        card: '#FFFFFF',
        border: '#DDE3EA',
        teal: '#1B4D5C',
        tealLight: '#2A6478',
        tealMuted: '#5E8F9E',
        ink: '#0F1E26',
        inkMuted: '#4A6273',
      },
      fontFamily: {
        display: ['Teko', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
        sans: ['"Work Sans"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.08)',
        cardHover: '0 4px 16px rgba(0,0,0,0.14)',
      },
    },
  },
  plugins: [],
};
