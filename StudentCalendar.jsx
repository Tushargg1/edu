@import "tailwindcss";
@config "../tailwind.config.js";

/*
 * EduSync Design System — Base Styles
 * Fonts: Instrument Serif (display), DM Sans (body), JetBrains Mono (data)
 * See docs/design.md for full design system reference.
 */

@layer base {
  html {
    font-family: "DM Sans", system-ui, sans-serif;
    color: #0F172A;
    background-color: #F8FAFC;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    scroll-behavior: smooth;
  }

  body {
    margin: 0;
    min-height: 100vh;
  }

  h1 {
    font-family: "Instrument Serif", serif;
    font-size: 2rem;
    font-weight: 400;
    color: #0F172A;
  }

  h2, h3, h4, h5, h6 {
    font-family: "DM Sans", system-ui, sans-serif;
    font-weight: 600;
    color: #0F172A;
  }

  ::selection {
    background-color: #DBEAFE;
    color: #1D4ED8;
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: #CBD5E1;
    border-radius: 999px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #94A3B8;
  }
}

/* Modal entry animation */
@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
