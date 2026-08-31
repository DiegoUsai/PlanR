"use client";

import { useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import Save from "@mui/icons-material/Save";
import Add from "@mui/icons-material/Add";
import Delete from "@mui/icons-material/Delete";
import Upload from "@mui/icons-material/Upload";
import CheckCircle from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

// --- Tab 0: Parametri BU ---

interface BUConfig {
  id: string;
  annualBudget: number | null;
  weeklyHoursBuffer: number;
  saturationMin: number;
  saturationMax: number;
  saturationAlarm: number;
}

function ParametriBUTab() {
  const [config, setConfig] = useState<BUConfig | null>(null);
  const [form, setForm] = useState({
    annualBudget: "",
    weeklyHoursBuffer: "8",
    saturationMin: "75",
    saturationMax: "85",
    saturationAlarm: "90",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/configuration")
      .then((r) => r.json())
      .then((data: BUConfig) => {
        setConfig(data);
        setForm({
          annualBudget: data.annualBudget?.toString() || "",
          weeklyHoursBuffer: data.weeklyHoursBuffer.toString(),
          saturationMin: data.saturationMin.toString(),
          saturationMax: data.saturationMax.toString(),
          saturationAlarm: data.saturationAlarm.toString(),
        });
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await fetch("/api/configuration", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        annualBudget: form.annualBudget ? Number(form.annualBudget) : null,
        weeklyHoursBuffer: Number(form.weeklyHoursBuffer),
        saturationMin: Number(form.saturationMin),
        saturationMax: Number(form.saturationMax),
        saturationAlarm: Number(form.saturationAlarm),
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!config) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Parametri BU
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        <TextField
          label="Budget annuale"
          type="number"
          value={form.annualBudget}
          onChange={(e) => setForm({ ...form, annualBudget: e.target.value })}
          size="small"
          helperText="Importo in euro"
          sx={{ gridColumn: "1 / -1" }}
        />
        <TextField
          label="Buffer ore settimanali (default)"
          type="number"
          value={form.weeklyHoursBuffer}
          onChange={(e) => setForm({ ...form, weeklyHoursBuffer: e.target.value })}
          size="small"
          helperText="Ore riservate per attivita non pianificabili"
        />
        <Box />
        <TextField
          label="Saturazione minima (%)"
          type="number"
          value={form.saturationMin}
          onChange={(e) => setForm({ ...form, saturationMin: e.target.value })}
          size="small"
          helperText="Soglia sotto-utilizzo"
        />
        <TextField
          label="Saturazione massima (%)"
          type="number"
          value={form.saturationMax}
          onChange={(e) => setForm({ ...form, saturationMax: e.target.value })}
          size="small"
          helperText="Soglia fine fascia ottimale"
        />
        <TextField
          label="Soglia allarme saturazione (%)"
          type="number"
          value={form.saturationAlarm}
          onChange={(e) => setForm({ ...form, saturationAlarm: e.target.value })}
          size="small"
          helperText="Soglia sovra-allocazione"
        />
      </Box>
      <Box sx={{ display: "flex", gap: 2, mt: 3, alignItems: "center" }}>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} /> : <Save />}
          onClick={handleSave}
          disabled={saving}
        >
          Salva
        </Button>
        {saved && (
          <Alert severity="success" sx={{ py: 0 }}>
            Parametri salvati
          </Alert>
        )}
      </Box>
    </Box>
  );
}

// --- Tab 1: Clienti ---

interface Client {
  slug: string;
  name: string;
  notes: string | null;
  _count: { contracts: number };
}

function ClientiTab() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/clients");
    setClients(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), notes: newNotes.trim() || undefined }),
    });
    if (res.ok) {
      setDialogOpen(false);
      setNewName("");
      setNewNotes("");
      fetchClients();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/clients?slug=${deleteTarget.slug}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Impossibile eliminare");
    }
    setDeleteTarget(null);
    fetchClients();
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Clienti</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<Add />}
          onClick={() => setDialogOpen(true)}
        >
          Nuovo Cliente
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : clients.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          Nessun cliente registrato.
        </Typography>
      ) : (
        <List disablePadding>
          {clients.map((c) => (
            <ListItem
              key={c.slug}
              divider
              secondaryAction={
                <IconButton
                  edge="end"
                  size="small"
                  title="Elimina"
                  onClick={() => setDeleteTarget(c)}
                  disabled={c._count.contracts > 0}
                >
                  <Delete fontSize="small" />
                </IconButton>
              }
            >
              <ListItemText
                primary={c.name}
                secondary={
                  <>
                    {c._count.contracts > 0
                      ? `${c._count.contracts} contratti`
                      : "Nessun contratto"}
                    {c.notes ? ` — ${c.notes}` : ""}
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nuovo Cliente</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome cliente"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            fullWidth
            size="small"
            autoFocus
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            label="Note"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annulla</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!newName.trim()}>
            Crea
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Elimina Cliente"
        message={`Eliminare il cliente "${deleteTarget?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}

// --- Tab 2: Import ---

interface ImportResult {
  id: string;
  totalRows: number;
  importedRows: number;
  updatedRows: number;
  errorRows: number;
  errors: { row: number; field: string; message: string }[];
}

function ImportSection({
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
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {description}
      </Typography>

      <Card variant="outlined" sx={{ mb: 1.5 }}>
        <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Formato CSV atteso (separatore ;)
          </Typography>
          <Box
            component="pre"
            sx={{
              bgcolor: "grey.100",
              p: 1,
              borderRadius: 1,
              fontSize: 11,
              overflow: "auto",
              mt: 0.5,
              mb: 0,
            }}
          >
            {csvFormat}
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 1.5 }}>
        <Button component="label" variant="outlined" size="small" startIcon={<Upload />}>
          Seleziona CSV
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
          <Typography variant="caption" color="text.secondary">
            {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </Typography>
        )}
        <Button
          variant="contained"
          size="small"
          onClick={handleUpload}
          disabled={!file || loading}
          startIcon={loading ? <CircularProgress size={14} /> : undefined}
        >
          {loading ? "Importazione..." : "Importa"}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}

      {result && (
        <Box sx={{ mb: 1.5 }}>
          <Alert
            severity={result.errorRows > 0 ? "warning" : "success"}
            icon={result.errorRows > 0 ? <ErrorIcon /> : <CheckCircle />}
            sx={{ mb: 1 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Import completato</Typography>
            <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
              <Chip label={`${result.totalRows} righe`} size="small" variant="outlined" />
              <Chip label={`${result.importedRows} create`} size="small" color="success" />
              <Chip label={`${result.updatedRows} aggiornate`} size="small" color="info" />
              {result.errorRows > 0 && (
                <Chip label={`${result.errorRows} errori`} size="small" color="error" />
              )}
            </Box>
          </Alert>
          {result.errors.length > 0 && (
            <Box sx={{ height: 200 }}>
              <DataGrid
                rows={result.errors.map((e, i) => ({ id: i, ...e }))}
                columns={errorColumns}
                density="compact"
                disableRowSelectionOnClick
                pageSizeOptions={[10]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

function ImportTab() {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Import dati
      </Typography>
      <ImportSection
        title="Risorse"
        description="Carica l'anagrafica risorse. Match per nominativo: le esistenti vengono aggiornate."
        endpoint="/api/import/risorse"
        csvFormat={`nominativo;ruolo;livello;tipologia;appartenenza;pool;is_ptf;note\nRossi Mario;BE;Mid;Interna;BU Documentale;Evolutiva;false;`}
      />
      <ImportSection
        title="Assenze (Factorial)"
        description="Carica assenze pianificate da Factorial. Deduplicazione per risorsa + data."
        endpoint="/api/import/assenze"
        csvFormat={`nominativo;giorno;ore_assenza\nRossi Mario;2026-09-01;8`}
      />
    </Box>
  );
}

// --- Tab 3: Integrazioni & Log ---

interface ImportLogEntry {
  id: string;
  type: string;
  filename: string;
  totalRows: number;
  importedRows: number;
  updatedRows: number;
  errorRows: number;
  createdAt: string;
}

function IntegrazioniTab() {
  const [logs, setLogs] = useState<ImportLogEntry[]>([]);

  useEffect(() => {
    fetch("/api/import/log")
      .then((r) => r.json())
      .then(setLogs)
      .catch(() => {});
  }, []);

  const logColumns: GridColDef[] = [
    {
      field: "createdAt",
      headerName: "Data",
      width: 160,
      valueFormatter: (value: string) => new Date(value).toLocaleString("it-IT"),
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
      <Typography variant="h6" sx={{ mb: 2 }}>
        Integrazioni
      </Typography>

      <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Jira
        </Typography>
        <Typography variant="body2" color="text.secondary">
          L'integrazione con Jira (sincronizzazione epiche Proceed, worklog, stati) sara
          configurabile qui quando attivata. Al momento Jira e in sola lettura.
        </Typography>
      </Card>

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
  );
}

// --- Main Page ---

export default function ImpostazioniPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Impostazioni
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Parametri BU" />
        <Tab label="Clienti" />
        <Tab label="Import" />
        <Tab label="Integrazioni" />
      </Tabs>

      {tab === 0 && <ParametriBUTab />}
      {tab === 1 && <ClientiTab />}
      {tab === 2 && <ImportTab />}
      {tab === 3 && <IntegrazioniTab />}
    </Box>
  );
}
