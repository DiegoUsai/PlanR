"use client";

import { signIn } from "next-auth/react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export default function SignInPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#F5F5F5",
      }}
    >
      <Card elevation={2} sx={{ maxWidth: 400, width: "100%", mx: 2 }}>
        <CardContent sx={{ textAlign: "center", p: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              mb: 0.5,
              background: "linear-gradient(90deg, #00379E 0%, #00B7EC 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            PlanR
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Resource Planning — BU Documentale &amp; SAP
          </Typography>
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            sx={{ textTransform: "none", py: 1.2 }}
          >
            Accedi con Google
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
            Accesso riservato agli account del dominio aziendale.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
