/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0d1016",
          900: "#12151c",
          800: "#1a1f2b",
          700: "#232938",
          600: "#2f3648",
        },
        amber: {
          glow: "#ffc069",
          DEFAULT: "#ffb84d",
        },
        teal: {
          glow: "#7cf5df",
          DEFAULT: "#5eead4",
        },
        alertred: "#ff6b6b",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        spin_slow: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        pulse_glow: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.6 },
        },
      },
      animation: {
        "spin-fan": "spin_slow 0.9s linear infinite",
        "pulse-glow": "pulse_glow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
