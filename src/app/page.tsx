"use client";

import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Tooltip from "@mui/material/Tooltip";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { PieChart } from "@mui/x-charts/PieChart";
import { BarChart } from "@mui/x-charts/BarChart";
import PeopleIcon from "@mui/icons-material/People";
import AssignmentIcon from "@mui/icons-material/Assignment";
import DescriptionIcon from "@mui/icons-material/Description";
import WarningIcon from "@mui/icons-material/Warning";
import { INITIATIVE_STATUS_LABELS } from "@/lib/constants";

const SAT_COLORS = {
  under: "#2196F3",
  optimal: "#4CAF50",
  warning: "#FFC107",
  over: "#F44336",
};

function getSatColor(val: number): string {
  if (val < 75) return SAT_COLORS.under;
  if (val <= 85) return SAT_COLORS.optimal;
  if (val <= 90) return SAT_COLORS.warning;
  return SAT_COLORS.over;
}

interface OverviewData {
  totalResources: number;
  activeResources: number;
  totalInitiatives: number;
  totalContracts: number;
  activeAlerts: number;
  avgSaturation: number;
  statusDistribution: Record<string, number>;
  pipelineValue: number;
  pipelineByStatus: Record<string, number>;
  annualBudget: number;
}

interface SaturationData {
  weeks: string[];
  heatmap: {
    resourceId: string;
    resourceName: string;
    role: string;
    weeks: number[];
  }[];
  distribution: { under: number; optimal: number; warning: number; over: number };
  avgSaturation: number;
  totalResources: number;
}

interface SoftLockItem {
  id: string;
  resourceName: string;
  initiativeTitle: string;
  applicationName: string;
  effortDays: number;
  startDate: string;
  endDate: string;
  softLockExpiry: string | null;
  value: number;
}

interface SoftLockData {
  items: SoftLockItem[];
  totalValue: number;
  totalSoftLocks: number;
  uniqueResources: number;
}

function StatCard({
  label,
  value,
  icon,
  color,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <Card elevation={0}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h3" component="p" sx={{ fontWeight: 700, color, mt: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color, opacity: 0.3 }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function SaturationHeatmap({ data }: { data: SaturationData }) {
  if (data.heatmap.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        Nessuna risorsa con parametri attivi.
      </Typography>
    );
  }

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Box sx={{ minWidth: 800 }}>
        {/* Header */}
        <Box sx={{ display: "flex", mb: 0.5 }}>
          <Box sx={{ width: 160, flexShrink: 0, px: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Risorsa
            </Typography>
          </Box>
          {data.weeks.map((w) => (
            <Box key={w} sx={{ width: 52, textAlign: "center", flexShrink: 0 }}>
              <Typography variant="caption">{w}</Typography>
            </Box>
          ))}
        </Box>
        {/* Rows */}
        {data.heatmap.map((row) => (
          <Box key={row.resourceId} sx={{ display: "flex", mb: 0.25 }}>
            <Box
              sx={{
                width: 160,
                flexShrink: 0,
                px: 1,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Typography variant="caption" noWrap>
                {row.resourceName}
              </Typography>
            </Box>
            {row.weeks.map((val, i) => (
              <Tooltip key={i} title={`${val}%`} arrow>
                <Box
                  sx={{
                    width: 52,
                    height: 24,
                    flexShrink: 0,
                    mx: 0.25,
                    borderRadius: 0.5,
                    bgcolor: getSatColor(val),
                    opacity: val === 0 ? 0.15 : 0.3 + (Math.min(val, 100) / 100) * 0.7,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "default",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontSize: 10, color: "white", fontWeight: 600 }}
                  >
                    {val}
                  </Typography>
                </Box>
              </Tooltip>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function OverviewTab({ overview }: { overview: OverviewData | null }) {
  if (!overview) return null;

  const statusData = Object.entries(overview.statusDistribution).map(
    ([status, count], i) => ({
      id: i,
      value: count,
      label: INITIATIVE_STATUS_LABELS[status] || status,
    })
  );

  const pipelineData = Object.entries(overview.pipelineByStatus).map(
    ([status, value]) => ({
      status: INITIATIVE_STATUS_LABELS[status] || status,
      value: Math.round(value / 1000),
    })
  );

  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          label="Risorse attive"
          value={overview.activeResources}
          icon={<PeopleIcon sx={{ fontSize: 40 }} />}
          color="#00379E"
          subtitle={`${overview.totalResources} totali`}
        />
        <StatCard
          label="Iniziative"
          value={overview.totalInitiatives}
          icon={<AssignmentIcon sx={{ fontSize: 40 }} />}
          color="#0C538E"
        />
        <StatCard
          label="Contratti"
          value={overview.totalContracts}
          icon={<DescriptionIcon sx={{ fontSize: 40 }} />}
          color="#00B7EC"
        />
        <StatCard
          label="Alert attivi"
          value={overview.activeAlerts}
          icon={<WarningIcon sx={{ fontSize: 40 }} />}
          color={overview.activeAlerts > 0 ? "#F44336" : "#4CAF50"}
        />
      </Box>

      {/* Gauge-like average saturation */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2,
          mb: 3,
        }}
      >
        <Card elevation={0}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Saturazione media BU
            </Typography>
            <Box sx={{ textAlign: "center" }}>
              <Typography
                variant="h1"
                sx={{
                  fontWeight: 700,
                  color: getSatColor(overview.avgSaturation),
                }}
              >
                {overview.avgSaturation}%
              </Typography>
              <Chip
                label={
                  overview.avgSaturation < 75
                    ? "Sotto-utilizzo"
                    : overview.avgSaturation <= 85
                      ? "Ottimale"
                      : overview.avgSaturation <= 90
                        ? "Attenzione"
                        : "Sovra-allocazione"
                }
                size="small"
                sx={{
                  bgcolor: getSatColor(overview.avgSaturation),
                  color: "white",
                  mt: 1,
                }}
              />
            </Box>
          </CardContent>
        </Card>

        <Card elevation={0}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Distribuzione iniziative per stato
            </Typography>
            {statusData.length > 0 ? (
              <PieChart
                series={[
                  {
                    data: statusData,
                    innerRadius: 40,
                    paddingAngle: 2,
                    cornerRadius: 4,
                  },
                ]}
                height={200}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nessuna iniziativa.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Pipeline value */}
      <Card elevation={0}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="subtitle2">Pipeline value</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#00379E" }}>
              €{(overview.pipelineValue / 1000).toFixed(0)}K
            </Typography>
          </Box>
          {pipelineData.length > 0 ? (
            <BarChart
              xAxis={[{ scaleType: "band", data: pipelineData.map((d) => d.status) }]}
              series={[{ data: pipelineData.map((d) => d.value), label: "K€", color: "#00379E" }]}
              height={250}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Nessun dato pipeline.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

function SaturationTab({ saturation }: { saturation: SaturationData | null }) {
  if (!saturation) return null;

  const distData = [
    { id: 0, value: saturation.distribution.under, label: "< 75%", color: SAT_COLORS.under },
    { id: 1, value: saturation.distribution.optimal, label: "75-85%", color: SAT_COLORS.optimal },
    { id: 2, value: saturation.distribution.warning, label: "86-90%", color: SAT_COLORS.warning },
    { id: 3, value: saturation.distribution.over, label: "> 90%", color: SAT_COLORS.over },
  ];

  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2,
          mb: 3,
        }}
      >
        <Card elevation={0}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Distribuzione saturazione (settimana corrente)
            </Typography>
            <PieChart
              series={[
                {
                  data: distData,
                  innerRadius: 40,
                  paddingAngle: 2,
                  cornerRadius: 4,
                },
              ]}
              colors={[SAT_COLORS.under, SAT_COLORS.optimal, SAT_COLORS.warning, SAT_COLORS.over]}
              height={200}
            />
          </CardContent>
        </Card>

        <Card elevation={0}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Legenda
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {[
                { color: SAT_COLORS.under, label: "Sotto-utilizzo", range: "0-74%" },
                { color: SAT_COLORS.optimal, label: "Ottimale", range: "75-85%" },
                { color: SAT_COLORS.warning, label: "Attenzione", range: "86-90%" },
                { color: SAT_COLORS.over, label: "Sovra-allocazione", range: "> 90%" },
              ].map((item) => (
                <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: 0.5,
                      bgcolor: item.color,
                    }}
                  />
                  <Typography variant="body2">
                    {item.label} ({item.range})
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Card elevation={0}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Heatmap saturazione — 12 settimane
          </Typography>
          <SaturationHeatmap data={saturation} />
        </CardContent>
      </Card>
    </Box>
  );
}

function SoftLockTab({ softLock }: { softLock: SoftLockData | null }) {
  if (!softLock) return null;

  const columns: GridColDef[] = [
    { field: "resourceName", headerName: "Risorsa", width: 150 },
    { field: "initiativeTitle", headerName: "Iniziativa", flex: 1 },
    { field: "applicationName", headerName: "Applicativo", width: 140 },
    { field: "effortDays", headerName: "GG", width: 80, type: "number" },
    {
      field: "endDate",
      headerName: "Fine",
      width: 110,
      valueFormatter: (value: string) =>
        new Date(value).toLocaleDateString("it-IT"),
    },
    {
      field: "softLockExpiry",
      headerName: "Scadenza lock",
      width: 120,
      valueFormatter: (value: string | null) =>
        value ? new Date(value).toLocaleDateString("it-IT") : "—",
    },
    {
      field: "value",
      headerName: "Valore €",
      width: 110,
      type: "number",
      valueFormatter: (value: number) =>
        `€${value.toLocaleString("it-IT", { maximumFractionDigits: 0 })}`,
    },
  ];

  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          label="Soft lock attivi"
          value={softLock.totalSoftLocks}
          icon={<AssignmentIcon sx={{ fontSize: 40 }} />}
          color="#00379E"
        />
        <StatCard
          label="Risorse coinvolte"
          value={softLock.uniqueResources}
          icon={<PeopleIcon sx={{ fontSize: 40 }} />}
          color="#0C538E"
        />
        <StatCard
          label="Valore totale"
          value={`€${(softLock.totalValue / 1000).toFixed(0)}K`}
          icon={<DescriptionIcon sx={{ fontSize: 40 }} />}
          color="#00B7EC"
        />
      </Box>

      <Card elevation={0}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Dettaglio soft lock
          </Typography>
          <Box sx={{ height: 400 }}>
            <DataGrid
              rows={softLock.items}
              columns={columns}
              density="compact"
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default function Dashboard() {
  const [tab, setTab] = useState(0);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [saturation, setSaturation] = useState<SaturationData | null>(null);
  const [softLock, setSoftLock] = useState<SoftLockData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/overview")
      .then((r) => r.json())
      .then(setOverview)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 1 && !saturation) {
      fetch("/api/dashboard/saturation")
        .then((r) => r.json())
        .then(setSaturation)
        .catch(() => {});
    }
    if (tab === 2 && !softLock) {
      fetch("/api/dashboard/soft-locks")
        .then((r) => r.json())
        .then(setSoftLock)
        .catch(() => {});
    }
  }, [tab, saturation, softLock]);

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Dashboard
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Panoramica BU" />
        <Tab label="Saturazione" />
        <Tab label="Soft Lock" />
        <Tab label="Accuratezza stime" />
      </Tabs>

      {tab === 0 && <OverviewTab overview={overview} />}
      {tab === 1 && <SaturationTab saturation={saturation} />}
      {tab === 2 && <SoftLockTab softLock={softLock} />}
      {tab === 3 && (
        <Card elevation={0}>
          <CardContent sx={{ py: 6, textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              Accuratezza stime
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Disponibile con l'attivazione del modulo Consuntivo.
              <br />
              Confronto tra effort pianificato e consuntivato per iniziativa.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
