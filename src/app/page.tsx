import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";

export default function Home() {
  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: 2,
        }}
      >
        <Typography
          variant="h2"
          component="h1"
          sx={{
            fontWeight: 700,
            background: "linear-gradient(90deg, #00379E 0%, #00B7EC 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          PlanR
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ textAlign: "center" }}>
          Resource Planning — BU Documentale & SAP
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
          MVP in sviluppo
        </Typography>
      </Box>
    </Container>
  );
}
