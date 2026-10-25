import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        huit: {
          blue: {
            50: "#eef6ff",
            100: "#d9eaff",
            200: "#bcdbff",
            500: "#0284c7",
            600: "#004080",
            700: "#003366",
            800: "#00274d",
            900: "#001a33",
          },
          orange: {
            500: "#f97316",
            600: "#f37021",
            700: "#c2410c",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
