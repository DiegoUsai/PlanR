"use client";

import { useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import Upload from "@mui/icons-material/Upload";
import CheckCircle from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";

interface ImportResult {
  id: string;
  totalRows: number;
  importedRows: number;
  updatedRows: number;
  errorRows: number;
  errors: { row: number; field: string; message: string }[];
}

interface ImportLogEntry {
  id: string;
  type: string;
  filename: string;
  totalRows: number;
  importedRows: number;
  updatedRows: number;
  errorRows: number;
  errors: { row: number; field: string; message: string }[] | null;
  createdAt: string;
}

function ImportTab({
  title,
  description,
  endpoint,
  csvFormat,
}: {
  title: string;
  description: string;
  endpoint: string;
  csvFormat: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Errore durante l'import");
        return;
      }

      setResult(data);
      setFile(null);
    } catch {
      setError("Errore di rete durante l'upload");
    } finally {
      setLoading(false);
    }
  };

  const errorColumns: GridColDef[] = [
    { field: "row", headerName: "Riga", width: 80 },
    { field: "field", headerName: "Campo", width: 150 },
    { field: "message", headerName: "Errore", flex: 1 },
  ];

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {description}
      </Typography>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Formato CSV atteso (separatore ;)
          </Typography>
          <Box
            component="pre"
            sx={{
              bgcolor: "grey.100",
              p: 1.5,
              borderRadius: 1,
              fontSize: 12,
              overflow: "auto",
            }}
          >
            {csvFormat}
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
        <Button
          component="label"
          variant="outlined"
          startIcon={<Upload />}
        >
          Seleziona file CSV
          <input
            type="file"
            accept=".csv"
            hidden
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setResult(null);
              setError(null);
            }}
          />
        </Button>
        {file && (
          <Typography variant="body2" color="text.secondary">
            {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </Typography>
        )}
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!file || loading}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading ? "Importazione..." : "Importa"}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Box sx={{ mb: 2 }}>
          <Alert
            severity={result.errorRows > 0 ? "warning" : "success"}
            icon={result.errorRows > 0 ? <ErrorIcon /> : <CheckCircle />}
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Import completato
              </Typography>
              <Box sx={{ display: "flex", gap: 2, mt: 0.5 }}>
                <Chip
                  label={`${result.totalRows} righe identificate`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`${result.importedRows} create`}
                  size="small"
                  color="success"
                />
                <Chip
                  label={`${result.updatedRows} aggiornate`}
                  size="small"
                  color="info"
                />
                {result.errorRows > 0 && (
                  <Chip
                    label={`${result.errorRows} errori`}
                    size="small"
                    color="error"
                  />
                )}
              </Box>
            </Box>
          </Alert>

          {result.errors.length > 0 && (
            <Box sx={{ height: 300 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Dettaglio errori
              </Typography>
              <DataGrid
                rows={result.errors.map((e, i) => ({ id: i, ...e }))}
                columns={errorColumns}
                density="compact"
                disableRowSelectionOnClick
                pageSizeOptions={[10, 25]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 10 } },
                }}
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

function PlaceholderTab() {
  return (
    <Box sx={{ py: 4, textAlign: "center" }}>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
        In attesa del tracciato Jira
      </Typography>
      <Typography variant="body2" color="text.secondary">
        L'import delle iniziative da Jira sara disponibile quando il formato
        CSV di estrazione verra condiviso.
      </Typography>
    </Box>
  );
}

export default function ImportPage() {
  const [tab, setTab] = useState(0);
  const [logs, setLogs] = useState<ImportLogEntry[]>([]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/import/log");
      if (res.ok) setLogs(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const logColumns: GridColDef[] = [
    {
      field: "createdAt",
      headerName: "Data",
      width: 160,
      valueFormatter: (value: string) =>
        new Date(value).toLocaleString("it-IT"),
    },
    {
      field: "type",
      headerName: "Tipo",
      width: 130,
      renderCell: (params) => {
        const labels: Record<string, string> = {
          RISORSE: "Risorse",
          ASSENZE: "Assenze",
          INIZIATIVE_JIRA: "Jira",
          CONSUNTIVO: "Consuntivo",
        };
        return <Chip label={labels[params.value] || params.value} size="small" />;
      },
    },
    { field: "filename", headerName: "File", flex: 1 },
    { field: "totalRows", headerName: "Totali", width: 80, type: "number" },
    { field: "importedRows", headerName: "Create", width: 80, type: "number" },
    { field: "updatedRows", headerName: "Aggiornate", width: 100, type: "number" },
    {
      field: "errorRows",
      headerName: "Errori",
      width: 80,
      type: "number",
      renderCell: (params) =>
        params.value > 0 ? (
          <Chip label={params.value} size="small" color="error" />
        ) : (
          "0"
        ),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Import dati
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Risorse" />
        <Tab label="Assenze" />
        <Tab label="Iniziative (Jira)" />
      </Tabs>

      {tab === 0 && (
        <ImportTab
          title="Import risorse da CSV"
          description="Carica l'anagrafica delle risorse. Le risorse gia presenti (match per nominativo) vengono aggiornate."
          endpoint="/api/import/risorse"
          csvFormat={`nominativo;ruolo;livello;tipologia;appartenenza;pool;is_ptf;note\nRossi Mario;BE;Mid;Interna;BU Documentale;Evolutiva;false;\nBianchi Anna;FE;Senior;Interna;BU Documentale;Evolutiva;true;Referente Firma`}
        />
      )}

      {tab === 1 && (
        <ImportTab
          title="Import assenze da Factorial"
          description="Carica le assenze pianificate estratte da Factorial. Deduplicazione per risorsa + data."
          endpoint="/api/import/assenze"
          csvFormat={`nominativo;giorno;ore_assenza\nRossi Mario;2026-09-01;8\nBianchi Anna;2026-09-15;4`}
        />
      )}

      {tab === 2 && <PlaceholderTab />}

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Storico importazioni
        </Typography>
        <Box sx={{ height: 400 }}>
          <DataGrid
            rows={logs}
            columns={logColumns}
            density="compact"
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
