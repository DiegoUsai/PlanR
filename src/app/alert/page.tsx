"use client";

import { useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { DataGrid, GridColDef, GridActionsCellItem } from "@mui/x-data-grid";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import {
  ALERT_TYPE_LABELS,
  ALERT_SEVERITY_LABELS,
  ALERT_STATUS_LABELS,
} from "@/lib/constants";

interface AlertEntry {
  id: string;
  type: string;
  severity: string;
  status: string;
  entityType: string;
  entityId: string;
  message: string;
  silenceReason: string | null;
  createdAt: string;
}

export default function AlertPage() {
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [computeResult, setComputeResult] = useState<{
    generated: number;
    resolved: number;
  } | null>(null);
  const [tab, setTab] = useState(0);
  const [silenceDialog, setSilenceDialog] = useState<string | null>(null);
  const [silenceReason, setSilenceReason] = useState("");

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) setAlerts(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleCompute = async () => {
    setComputing(true);
    setComputeResult(null);
    try {
      const res = await fetch("/api/alerts", { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        setComputeResult(result);
        fetchAlerts();
      }
    } catch {
      /* ignore */
    } finally {
      setComputing(false);
    }
  };

  const handleAction = async (
    id: string,
    status: string,
    reason?: string
  ) => {
    const body: Record<string, string> = { status };
    if (reason) body.silenceReason = reason;

    const res = await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      fetchAlerts();
      setSilenceDialog(null);
      setSilenceReason("");
    }
  };

  const filteredAlerts =
    tab === 0
      ? alerts
      : tab === 1
        ? alerts.filter((a) => a.severity === "OPERATIVO")
        : alerts.filter((a) => a.severity === "STRATEGICO");

  const columns: GridColDef[] = [
    {
      field: "severity",
      headerName: "Severita",
      width: 120,
      renderCell: (params) => (
        <Chip
          label={ALERT_SEVERITY_LABELS[params.value] || params.value}
          size="small"
          color={params.value === "STRATEGICO" ? "error" : "warning"}
        />
      ),
    },
    {
      field: "type",
      headerName: "Tipo",
      width: 180,
      valueFormatter: (value: string) => ALERT_TYPE_LABELS[value] || value,
    },
    {
      field: "message",
      headerName: "Dettaglio",
      flex: 1,
    },
    {
      field: "status",
      headerName: "Stato",
      width: 140,
      renderCell: (params) => {
        const colors: Record<
          string,
          "default" | "primary" | "success" | "warning"
        > = {
          ATTIVO: "warning",
          PRESO_IN_CARICO: "primary",
          SILENZIATO: "default",
          RISOLTO: "success",
        };
        return (
          <Chip
            label={ALERT_STATUS_LABELS[params.value] || params.value}
            size="small"
            color={colors[params.value] || "default"}
          />
        );
      },
    },
    {
      field: "createdAt",
      headerName: "Data",
      width: 140,
      valueFormatter: (value: string) =>
        new Date(value).toLocaleDateString("it-IT"),
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Azioni",
      width: 150,
      getActions: (params) => {
        const actions = [];
        if (params.row.status === "ATTIVO") {
          actions.push(
            <GridActionsCellItem
              key="take"
              icon={<AssignmentTurnedInIcon />}
              label="Prendi in carico"
              onClick={() => handleAction(params.id as string, "PRESO_IN_CARICO")}
            />
          );
        }
        if (
          params.row.status === "ATTIVO" ||
          params.row.status === "PRESO_IN_CARICO"
        ) {
          actions.push(
            <GridActionsCellItem
              key="silence"
              icon={<VisibilityOffIcon />}
              label="Silenzia"
              onClick={() => setSilenceDialog(params.id as string)}
            />,
            <GridActionsCellItem
              key="resolve"
              icon={<CheckCircleIcon />}
              label="Risolvi"
              onClick={() => handleAction(params.id as string, "RISOLTO")}
            />
          );
        }
        return actions;
      },
    },
  ];

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Alert
          </Typography>
          <Chip
            label={alerts.length}
            color={alerts.length > 0 ? "error" : "default"}
            size="small"
          />
        </Box>
        <Button
          variant="contained"
          startIcon={
            computing ? <CircularProgress size={16} /> : <RefreshIcon />
          }
          onClick={handleCompute}
          disabled={computing}
        >
          {computing ? "Calcolo..." : "Ricalcola alert"}
        </Button>
      </Box>

      {computeResult && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setComputeResult(null)}>
          Ricalcolo completato: {computeResult.generated} nuovi alert,{" "}
          {computeResult.resolved} risolti automaticamente.
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Tutti (${alerts.length})`} />
        <Tab
          label={`Operativi (${alerts.filter((a) => a.severity === "OPERATIVO").length})`}
        />
        <Tab
          label={`Strategici (${alerts.filter((a) => a.severity === "STRATEGICO").length})`}
        />
      </Tabs>

      <Box sx={{ height: 600 }}>
        <DataGrid
          rows={filteredAlerts}
          columns={columns}
          loading={loading}
          density="compact"
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
        />
      </Box>

      <Dialog
        open={!!silenceDialog}
        onClose={() => {
          setSilenceDialog(null);
          setSilenceReason("");
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Silenzia alert</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Motivazione (obbligatoria)"
            value={silenceReason}
            onChange={(e) => setSilenceReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSilenceDialog(null);
              setSilenceReason("");
            }}
          >
            Annulla
          </Button>
          <Button
            variant="contained"
            disabled={!silenceReason.trim()}
            onClick={() => {
              if (silenceDialog) {
                handleAction(silenceDialog, "SILENZIATO", silenceReason);
              }
            }}
          >
            Silenzia
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
