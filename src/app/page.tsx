export const dynamic = "force-dynamic";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function getCounts() {
  try {
    const [resourceCount, appCount, contractCount, initiativeCount] =
      await Promise.all([
        prisma.resource.count(),
        prisma.application.count(),
        prisma.contract.count(),
        prisma.initiative.count(),
      ]);
    return { resourceCount, appCount, contractCount, initiativeCount };
  } catch {
    return { resourceCount: 0, appCount: 0, contractCount: 0, initiativeCount: 0 };
  }
}

export default async function Dashboard() {
  const { resourceCount, appCount, contractCount, initiativeCount } =
    await getCounts();

  const stats = [
    { label: "Risorse", count: resourceCount, href: "/risorse", color: "#00379E" },
    { label: "Applicativi", count: appCount, href: "/applicativi", color: "#0C538E" },
    { label: "Contratti", count: contractCount, href: "/contratti", color: "#00B7EC" },
    { label: "Iniziative", count: initiativeCount, href: "/iniziative", color: "#0095C0" },
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Dashboard
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 2,
        }}
      >
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <Card
              elevation={0}
              sx={{
                cursor: "pointer",
                transition: "box-shadow 0.2s",
                "&:hover": { boxShadow: 3 },
              }}
            >
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {s.label}
                </Typography>
                <Typography
                  variant="h3"
                  component="p"
                  sx={{ fontWeight: 700, color: s.color, mt: 1 }}
                >
                  {s.count}
                </Typography>
              </CardContent>
            </Card>
          </Link>
        ))}
      </Box>
    </Box>
  );
}
