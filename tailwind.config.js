/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FF4A5D',
        primaryDark: '#E63D50',
        primarySoft: '#FFF0F2',
        primaryPale: '#FFF7F8',
        softBg: '#FAFAFB',
        ink: '#18181B',
        secondary: '#71717A',
        muted: '#A1A1AA',
        line: '#E4E4E7',
        success: '#22A06B',
        warning: '#D99A2E',
        error: '#D94F55'
      },
      borderRadius: { xl2: '20px' },
      minHeight: { touch: '44px', cta: '52px' },
      minWidth: { touch: '44px' }
    }
  },
  plugins: []
}
