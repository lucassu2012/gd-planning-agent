/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'PingFang SC'", "'Microsoft YaHei'", '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'sans-serif'],
      },
      colors: {
        ink: {
          900: '#0a0a0a',
          850: '#0f0f0f',
          800: '#141414',
          700: '#1a1a1a',
          600: '#242424',
        },
        navy: '#02041a',
      },
      fontSize: {
        caption: ['10px', '14px'],
        'body-sm': ['11px', '16px'],
      },
    },
  },
  plugins: [],
};
