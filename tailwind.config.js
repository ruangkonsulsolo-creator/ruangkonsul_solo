/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    "bg-background", "bg-card", "bg-popover", "bg-primary", "bg-secondary",
    "bg-muted", "bg-accent", "bg-destructive",
    "text-foreground", "text-card-foreground", "text-popover-foreground",
    "text-primary-foreground", "text-secondary-foreground",
    "text-muted-foreground", "text-accent-foreground",
    "text-destructive", "text-destructive-foreground",
    "border-border", "border-input", "ring-ring",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Brand Kalibri — Crimson Red ── */
        brand: {
          DEFAULT: "#8B0000",
          light:   "#A31515",
          dark:    "#6B0000",
          50:      "#FFF5F5",
          100:     "#FFE8E8",
          200:     "#FFCCCC",
          300:     "#FF9999",
          600:     "#A31515",
          700:     "#8B0000",
          800:     "#3D0000",
          900:     "#2A0000",
        },

        /* ── shadcn/ui semantic tokens (hsl CSS vars) ── */
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input:  "hsl(var(--input))",
        ring:   "hsl(var(--ring))",
      },
      borderRadius: {
        lg:    "var(--radius)",
        md:    "calc(var(--radius) - 2px)",
        sm:    "calc(var(--radius) - 4px)",
        xl:    "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        brand:        "0 4px 24px -4px rgba(139,0,0,0.25)",
        "brand-sm":   "0 2px 8px -2px rgba(139,0,0,0.20)",
        card:         "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 8px 24px -4px rgba(0,0,0,0.10)",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #8B0000 0%, #A31515 50%, #C41E3A 100%)",
        "brand-gradient-subtle":
          "linear-gradient(135deg, #FFF5F5 0%, #FFE8E8 100%)",
        "hero-gradient":
          "linear-gradient(160deg, #ffffff 0%, #FFF0F0 40%, #FFDDDD 100%)",
      },
      animation: {
        "fade-in":  "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
