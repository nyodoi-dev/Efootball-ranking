/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // The theme. Values live in src/index.css and switch with .dark.
        app: v('bg'),
        card: v('card'),
        card2: v('card-2'),
        nav: v('nav'),
        line: v('line'),
        ink: v('ink'),
        muted: v('muted'),
        brand: { DEFAULT: v('brand'), strong: v('brand-strong') },
        onBrand: v('on-brand'),
        accent: v('accent'),
        danger: v('danger'),
        win: v('win'),
        turf: v('pitch'),

        // Older names used across the pages, pointed at the theme.
        teal: { DEFAULT: v('brand'), 400: v('brand'), 500: v('brand'), 600: v('brand') },
        tealLight: v('brand-strong'),
        tealMuted: v('muted'),
        pitch: v('bg'),
        panel: v('card'),
        panelAlt: v('card-2'),
        chalk: v('ink'),
        lime: v('brand'),
        coral: v('danger'),
        gold: v('accent'),
        surface: v('bg'),
        border: v('line'),
        inkMuted: v('muted'),
      },
      fontFamily: {
        display: ['"Big Shoulders Display"', 'Impact', 'sans-serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
