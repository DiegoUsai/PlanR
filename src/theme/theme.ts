"use client";

import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    saturation: {
      underutilized: string;
      optimal: string;
      warning: string;
      overallocated: string;
    };
  }
  interface PaletteOptions {
    saturation?: {
      underutilized?: string;
      optimal?: string;
      warning?: string;
      overallocated?: string;
    };
  }
}

const theme = createTheme({
  palette: {
    primary: {
      main: "#00379E",
      dark: "#002A78",
      light: "#0C538E",
    },
    secondary: {
      main: "#00B7EC",
      dark: "#0095C0",
    },
    text: {
      primary: "#404142",
      secondary: "#85898C",
    },
    background: {
      default: "#FFFFFF",
      paper: "#FCFCFC",
    },
    divider: "#D9D9D9",
    saturation: {
      underutilized: "#2196F3",
      optimal: "#4CAF50",
      warning: "#FFC107",
      overallocated: "#F44336",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          ...(ownerState.variant === "contained" &&
            ownerState.color === "primary" && {
              background: "linear-gradient(90deg, #00379E 0%, #00B7EC 100%)",
              "&:hover": {
                background: "linear-gradient(90deg, #002A78 0%, #0095C0 100%)",
              },
            }),
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: "1px solid #D9D9D9",
        },
      },
    },
  },
});

export default theme;
