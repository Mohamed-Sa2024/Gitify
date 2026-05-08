/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        bg: "#0a0a0c",
        surface: "#111114",
        surface2: "#15151a",
        border: "#1f1f24",
        borderHi: "#2a2a31",
        textP: "#e8e8ec",
        textDim: "#8a8a93",
        textMute: "#5a5a63",
        accent: "#c8ff3e",
        accentDim: "#9bcc2e",
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-in-right": "slideInRight 240ms cubic-bezier(0.32, 0.72, 0, 1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideInRight: {
          "0%": { transform: "translateX(20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
