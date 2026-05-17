import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4318ff',
        secondary: '#00b5d8',
        'bg-color': '#f4f7fe',
        'card-bg': '#ffffff',
        'text-main': '#2b3674',
        'text-muted': '#a3aed1',
        'border-color': '#e2e8f0',
        danger: '#ee5d50',
        success: '#05cd99',
        warning: '#ffce20',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 5px 14px rgba(0, 0, 0, 0.05)',
        md: '0 10px 24px rgba(112, 144, 176, 0.15)',
      },
      borderRadius: {
        'xl': '20px',
        'lg': '14px',
      }
    },
  },
  plugins: [],
};
export default config;
