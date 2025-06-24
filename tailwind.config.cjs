module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './*.{html,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#00BF9A',
          secondary: '#002B49',
          dark: '#1A2E4A',
          light: '#00B6D6',
        },
        teal: {
          50: '#F0FDF9',
          100: '#DCFCEF',
          200: '#ABF1DE',
          300: '#7EE6CB',
          400: '#4BD9B6',
          500: '#00BF9A',
          600: '#00AB89',
          700: '#008B6D',
          800: '#006D51',
          900: '#004E33',
        },
        navy: {
          50: '#F2F5FA',
          100: '#E2E8F0',
          200: '#C5D0E1',
          300: '#A7B8D2',
          400: '#8AA1C3',
          500: '#6C89B4',
          600: '#4D6D9A',
          700: '#3B5680',
          800: '#2A3F66',
          900: '#1A2E4A',
        },
        primary: {
          DEFAULT: '#00BF9A',
          focus: '#00AB89',
          content: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#002B49',
          focus: '#001F35',
          content: '#FFFFFF',
        },
        success: {
          DEFAULT: '#12B76A',
          focus: '#0E9355',
          content: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#F59E0B',
          focus: '#D97706',
          content: '#FFFFFF',
        },
        error: {
          DEFAULT: '#EF4444',
          focus: '#DC2626',
          content: '#FFFFFF',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #00BF9A, #002B49)',
        'gradient-text': 'linear-gradient(to right, #00B6D6, #ffffff)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        fadeIn: 'fadeIn 0.3s ease-out',
      },
    },
  },
  plugins: [],
}; 