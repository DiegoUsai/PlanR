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
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Checkbox from "@mui/material/Checkbox";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
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

// Shared components
function CsvFormatBox({ format }: { format: string }) {
  return (
    <Card variant="outlined" sx={{ mb: 1.5 }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          Formato CSV atteso (separatore ;)
        </Typography>
        <Box
          component="pre"
          sx={{ bgcolor: "grey.100", p: 1, borderRadius: 1, fontSize: 11, overflow: "auto", mt: 0.5, mb: 0 }}
        >
          {format}
        </Box>
      </CardContent>
    </Card>
  );
}

function FileSelector({
  file,
  onFileChange,
  onUpload,
  loading,
  disabled,
}: {
  file: File | null;
  onFileChange: (f: File | null) => void;
  onUpload: () => void;
  loading: boolean;
  disabled?: boolean;
}) {
  return (
    <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 1.5 }}>
      <Button component="label" variant="outlined" size="small" startIcon={<Upload />}>
        Seleziona CSV
        <input type="file" accept=".csv" hidden onChange={(e) => onFileChange(e.target.files?.[0] || null)} />
      </Button>
      {file && (
        <Typography variant="caption" color="text.secondary">
          {file.name} ({(file.size / 1024).toFixed(1)} KB)
        </Typography>
      )}
      <Button
        variant="contained"
        size="small"
        onClick={onUpload}
        disabled={!file || loading || disabled}
        startIcon={loading ? <CircularProgress size={14} /> : undefined}
      >
        {loading ? "Importazione..." : "Importa"}
      </Button>
    </Box>
  );
}

const errorColumns: GridColDef[] = [
  { field: "row", headerName: "Riga", width: 80 },
  { field: "field", headerName: "Campo", width: 150 },
  { field: "message", headerName: "Errore", flex: 1 },
];

// --- Risorse Import ---

interface RisorseResult {
  id: string;
  mode: string;
  totalRows: number;
  importedRows: number;
  updatedRows: number;
  skippedRows: number;
  errorRows: number;
  errors: { row: number; field: string; message: string }[];
  absentResources: Array<{
    id: string;
    firstName: string;
    lastName: string;
    active: boolean;
    futureAllocationsCount: number;
  }>;
}

interface DeactivateResult {
  deactivatedCount: number;
  releasedAllocationsCount: number;
  reEvaluatedInitiatives: Array<{
    id: string;
    issueKey: string | null;
    oldStatus: string;
    newStatus: string;
  }>;
}

function RisorseImportSection() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"append" | "override">("append");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RisorseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deactivateIds, setDeactivateIds] = useState<Set<string>>(new Set());
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateResult, setDeactivateResult] = useState<DeactivateResult | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setDeactivateResult(null);
    setDeactivateIds(new Set());

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);

    try {
      const res = await fetch("/api/import/risorse", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Errore durante l'import");
        return;
      }
      setResult(data);
      if (data.absentResources?.length === 0) setFile(null);
    } catch {
      setError("Errore di rete durante l'upload");
    } finally {
      setLoading(false);
    }
  };

  const toggleDeactivate = (id: string) => {
    setDeactivateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeactivate = async () => {
    if (deactivateIds.size === 0) return;
    setDeactivating(true);

    try {
      const res = await fetch("/api/resources/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceIds: [...deactivateIds] }),
      });
      const data = await res.json();
      if (res.ok) {
        setDeactivateResult(data);
        setDeactivateIds(new Set());
      }
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        Risorse
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Carica l'anagrafica risorse. Match per id_dipendente o cognome+nome.
      </Typography>

      <FormControlLabel
        control={
          <Switch
            checked={mode === "override"}
            onChange={(_, checked) => {
              setMode(checked ? "override" : "append");
              setResult(null);
              setError(null);
              setDeactivateResult(null);
            }}
            size="small"
          />
        }
        label={
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Override (aggiorna esistenti + rileva risorse assenti)
          </Typography>
        }
        sx={{ mb: 1 }}
      />

      {mode === "override" && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          In modalita Override: le risorse gia presenti vengono aggiornate con i dati dal CSV.
          Le risorse attive non presenti nel CSV vengono segnalate per eventuale disattivazione.
        </Alert>
      )}

      <CsvFormatBox format="id_dipendente;cognome;nome;tipologia;appartenenza;is_ptf;note\nHR001;Rossi;Mario;Interna;BU Documentale;false;" />
      <FileSelector file={file} onFileChange={(f) => { setFile(f); setResult(null); setError(null); setDeactivateResult(null); }} onUpload={handleUpload} loading={loading} />

      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}

      {result && (
        <Box sx={{ mb: 1.5 }}>
          <Alert
            severity={result.errorRows > 0 ? "warning" : "success"}
            icon={result.errorRows > 0 ? <ErrorIcon /> : <CheckCircle />}
            sx={{ mb: 1 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Import completato</Typography>
            <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
              <Chip label={`${result.totalRows} righe`} size="small" variant="outlined" />
              <Chip label={`${result.importedRows} create`} size="small" color="success" />
              {mode === "override" && (
                <Chip label={`${result.updatedRows} aggiornate`} size="small" color="info" />
              )}
              {mode === "append" && result.skippedRows > 0 && (
                <Chip label={`${result.skippedRows} gia presenti`} size="small" variant="outlined" />
              )}
              {result.errorRows > 0 && (
                <Chip label={`${result.errorRows} errori`} size="small" color="error" />
              )}
            </Box>
          </Alert>

          {result.errors.length > 0 && (
            <Box sx={{ height: 200, mb: 1 }}>
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

          {result.absentResources.length > 0 && (
            <Card variant="outlined" sx={{ mb: 1 }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Risorse attive non presenti nel CSV ({result.absentResources.length})
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Seleziona le risorse da disattivare. Le allocazioni future verranno rilasciate.
                </Typography>
                {result.absentResources.map((r) => (
                  <Box
                    key={r.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      py: 0.5,
                      px: 1,
                      bgcolor: deactivateIds.has(r.id) ? "action.selected" : "transparent",
                      borderRadius: 1,
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={deactivateIds.has(r.id)}
                      onChange={() => toggleDeactivate(r.id)}
                    />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {r.lastName} {r.firstName}
                    </Typography>
                    {r.futureAllocationsCount > 0 && (
                      <Chip
                        label={`${r.futureAllocationsCount} allocazioni future`}
                        size="small"
                        color="warning"
                      />
                    )}
                  </Box>
                ))}
                <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
                  <Button
                    variant="contained"
                    size="small"
                    color="warning"
                    onClick={handleDeactivate}
                    disabled={deactivateIds.size === 0 || deactivating}
                    startIcon={deactivating ? <CircularProgress size={14} /> : undefined}
                  >
                    Disattiva selezionate ({deactivateIds.size})
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {deactivateResult && (
            <Alert severity="success" sx={{ mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Disattivazione completata</Typography>
              <Typography variant="body2">
                {deactivateResult.deactivatedCount} risorse disattivate,{" "}
                {deactivateResult.releasedAllocationsCount} allocazioni rilasciate
              </Typography>
              {deactivateResult.reEvaluatedInitiatives.length > 0 && (
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>Iniziative rivalutate:</Typography>
                  {deactivateResult.reEvaluatedInitiatives.map((i) => (
                    <Typography key={i.id} variant="caption" component="div" sx={{ ml: 1 }}>
                      {i.issueKey || i.id}: {i.oldStatus} → {i.newStatus}
                    </Typography>
                  ))}
                </Box>
              )}
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );
}

// --- Parametri Import ---

interface ParametriResult {
  id: string;
  mode: string;
  totalRows: number;
  importedRows: number;
  updatedRows?: number;
  deletedParams?: number;
  errorRows: number;
  errors: { row: number; field: string; message: string }[];
}

interface BlockedResult {
  blocked: true;
  error: string;
  gaps: Array<{
    resourceId: string;
    resourceName: string;
    allocationStart: string;
    allocationEnd: string;
  }>;
}

function ParametriImportSection() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"append" | "override">("append");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParametriResult | null>(null);
  const [blocked, setBlocked] = useState<BlockedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setBlocked(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);

    try {
      const res = await fetch("/api/import/parametri", { method: "POST", body: formData });
      const data = await res.json();

      if (res.status === 422 && data.blocked) {
        setBlocked(data);
        return;
      }
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

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        Parametri Risorsa
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Carica parametri economici e profilo. Match per id_dipendente.
      </Typography>

      <FormControlLabel
        control={
          <Switch
            checked={mode === "override"}
            onChange={(_, checked) => {
              setMode(checked ? "override" : "append");
              setResult(null);
              setBlocked(null);
              setError(null);
            }}
            size="small"
          />
        }
        label={
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Override (sostituisce tutti i parametri per le risorse nel CSV)
          </Typography>
        }
        sx={{ mb: 1 }}
      />

      {mode === "append" && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          Append: aggiunge nuovi parametri chiudendo il periodo corrente. I calcoli storici non vengono modificati.
        </Alert>
      )}
      {mode === "override" && (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          Override: elimina TUTTI i parametri esistenti per le risorse nel CSV e li sostituisce.
          Se i nuovi periodi non coprono allocazioni attive, l'import viene bloccato.
        </Alert>
      )}

      <CsvFormatBox format="id_dipendente;ruolo;livello;ore_settimanali;costo_giornata;coefficiente_produttivita;buffer_ore_settimanali;data_inizio_validita;data_fine_validita\nEMP-001;Senior Dev;Senior;40;300,00;0.85;;2026-09-01;2027-03-31" />
      <FileSelector file={file} onFileChange={(f) => { setFile(f); setResult(null); setBlocked(null); setError(null); }} onUpload={handleUpload} loading={loading} />

      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}

      {blocked && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>{blocked.error}</Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Periodi di allocazione non coperti dai nuovi parametri:
          </Typography>
          {blocked.gaps.map((g, i) => (
            <Typography key={i} variant="caption" component="div" sx={{ ml: 1 }}>
              {g.resourceName}: {g.allocationStart} — {g.allocationEnd}
            </Typography>
          ))}
        </Alert>
      )}

      {result && (
        <Box sx={{ mb: 1.5 }}>
          <Alert
            severity={result.errorRows > 0 ? "warning" : "success"}
            icon={result.errorRows > 0 ? <ErrorIcon /> : <CheckCircle />}
            sx={{ mb: 1 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Import completato</Typography>
            <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
              <Chip label={`${result.totalRows} righe`} size="small" variant="outlined" />
              <Chip label={`${result.importedRows} create`} size="small" color="success" />
              {result.updatedRows !== undefined && result.updatedRows > 0 && (
                <Chip label={`${result.updatedRows} chiusi`} size="small" color="info" />
              )}
              {result.deletedParams !== undefined && (
                <Chip label={`${result.deletedParams} risorse sostituite`} size="small" color="info" />
              )}
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

// --- Assenze Import ---

interface AssenzeResult {
  id: string;
  totalRows: number;
  importedRows: number;
  replacedRows: number;
  errorRows: number;
  errors: { row: number; field: string; message: string }[];
  warnings: { row: number; field: string; message: string }[];
  allocationImpacts: Array<{
    resourceName: string;
    absenceDates: string[];
    allocationsCount: number;
  }>;
}

function AssenzeImportSection() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AssenzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import/assenze", { method: "POST", body: formData });
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

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        Assenze (Factorial)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Carica assenze pianificate da Factorial. Le assenze nello stesso range di date vengono sostituite (full replace).
      </Typography>

      <Alert severity="info" sx={{ mb: 1.5 }}>
        L'import sostituisce le assenze Factorial gia presenti nel range di date importato.
        Le assenze inserite manualmente non vengono toccate.
      </Alert>

      <CsvFormatBox format="nominativo;giorno;ore_assenza;tipo_assenza;note\nRossi Mario;2026-09-01;8;Ferie;" />
      <FileSelector file={file} onFileChange={(f) => { setFile(f); setResult(null); setError(null); }} onUpload={handleUpload} loading={loading} />

      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}

      {result && (
        <Box sx={{ mb: 1.5 }}>
          <Alert
            severity={result.errorRows > 0 ? "warning" : "success"}
            icon={result.errorRows > 0 ? <ErrorIcon /> : <CheckCircle />}
            sx={{ mb: 1 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Import completato</Typography>
            <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
              <Chip label={`${result.totalRows} righe`} size="small" variant="outlined" />
              <Chip label={`${result.importedRows} importate`} size="small" color="success" />
              <Chip label={`${result.replacedRows} sostituite`} size="small" color="info" />
              {result.errorRows > 0 && (
                <Chip label={`${result.errorRows} errori`} size="small" color="error" />
              )}
            </Box>
          </Alert>

          {result.warnings?.length > 0 && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Risorse non censite ({result.warnings.length})
              </Typography>
              {result.warnings.map((w, i) => (
                <Typography key={i} variant="caption" component="div">
                  Riga {w.row}: {w.message}
                </Typography>
              ))}
            </Alert>
          )}

          {result.allocationImpacts?.length > 0 && (
            <Alert severity="info" sx={{ mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Impatto su allocazioni
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Le assenze importate si sovrappongono ad allocazioni attive per le seguenti risorse.
                La saturazione settimanale potrebbe risultare modificata.
              </Typography>
              {result.allocationImpacts.map((impact, i) => (
                <Typography key={i} variant="caption" component="div" sx={{ ml: 1 }}>
                  {impact.resourceName}: {impact.absenceDates.length} giorni di assenza in periodo con {impact.allocationsCount} allocazioni
                </Typography>
              ))}
            </Alert>
          )}

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

// --- Iniziative Import ---

interface InitiativeImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; issueKey: string; error: string }>;
  anomalies: Array<{
    issueKey: string;
    initiativeId: string;
    title: string;
    changes: Array<{ field: string; oldValue: string | null; newValue: string | null }>;
    hasActiveAllocations: boolean;
    isRejected: boolean;
  }>;
  contractAlerts: string[];
}

function InitiativeImportSection() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InitiativeImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, "confirm" | "reject">>({});

  const handleUpload = async (decs: Record<string, "confirm" | "reject"> = {}) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    if (Object.keys(decs).length === 0) {
      setResult(null);
      setDecisions({});
    }

    const formData = new FormData();
    formData.append("file", file);
    if (Object.keys(decs).length > 0) {
      formData.append("decisions", JSON.stringify(decs));
    }

    try {
      const res = await fetch("/api/import/iniziative", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Errore durante l'import");
        return;
      }
      setResult(data);
      setDecisions({});
      if (data.anomalies.length === 0) setFile(null);
    } catch {
      setError("Errore di rete durante l'upload");
    } finally {
      setLoading(false);
    }
  };

  const setDecision = (issueKey: string, decision: "confirm" | "reject") => {
    setDecisions((prev) => ({ ...prev, [issueKey]: decision }));
  };

  const allDecided = result?.anomalies.length
    ? result.anomalies.every((a) => decisions[a.issueKey])
    : false;

  const handleApplyDecisions = () => handleUpload(decisions);

  const handleConfirmAll = () => {
    if (!result) return;
    const all: Record<string, "confirm" | "reject"> = {};
    for (const a of result.anomalies) all[a.issueKey] = "confirm";
    handleUpload(all);
  };

  const handleRejectAll = () => {
    if (!result) return;
    const all: Record<string, "confirm" | "reject"> = {};
    for (const a of result.anomalies) all[a.issueKey] = "reject";
    handleUpload(all);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        Iniziative (Jira CSV)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Importa iniziative da CSV esportato da Jira. Match per Issue key: le esistenti vengono aggiornate con conferma anomalie.
      </Typography>

      <CsvFormatBox format="Issue key;Issue id;Summary;Status;Priority;Custom field (Progetto BU DOC);..." />
      <FileSelector file={file} onFileChange={(f) => { setFile(f); setResult(null); setError(null); setDecisions({}); }} onUpload={() => handleUpload()} loading={loading} />

      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}

      {result && (
        <Box sx={{ mb: 1.5 }}>
          <Alert
            severity={result.errors.length > 0 ? "warning" : "success"}
            icon={result.errors.length > 0 ? <ErrorIcon /> : <CheckCircle />}
            sx={{ mb: 1 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Import completato</Typography>
            <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
              <Chip label={`${result.created} create`} size="small" color="success" />
              <Chip label={`${result.updated} aggiornate`} size="small" color="info" />
              <Chip label={`${result.skipped} saltate`} size="small" variant="outlined" />
              {result.errors.length > 0 && (
                <Chip label={`${result.errors.length} errori`} size="small" color="error" />
              )}
              {result.anomalies.length > 0 && (
                <Chip label={`${result.anomalies.length} anomalie`} size="small" color="warning" />
              )}
              {result.contractAlerts.length > 0 && (
                <Chip label={`${result.contractAlerts.length} contratti non censiti`} size="small" color="error" />
              )}
            </Box>
          </Alert>

          {result.contractAlerts.length > 0 && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Contratti non censiti</Typography>
              {result.contractAlerts.map((c) => (
                <Typography key={c} variant="body2">{c}</Typography>
              ))}
            </Alert>
          )}

          {result.anomalies.length > 0 && (
            <Card variant="outlined" sx={{ mb: 1 }}>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                  <Typography variant="subtitle2">
                    Anomalie rilevate — decidi per ciascuna iniziativa
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button size="small" variant="outlined" onClick={handleConfirmAll} disabled={loading}>
                      Conferma tutte
                    </Button>
                    <Button size="small" variant="outlined" color="inherit" onClick={handleRejectAll} disabled={loading}>
                      Salta tutte
                    </Button>
                  </Box>
                </Box>

                {result.anomalies.map((a) => (
                  <Box
                    key={a.issueKey}
                    sx={{
                      mb: 1.5,
                      p: 1.5,
                      bgcolor: decisions[a.issueKey] === "confirm"
                        ? "success.50"
                        : decisions[a.issueKey] === "reject"
                        ? "action.disabledBackground"
                        : "action.hover",
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {a.issueKey} — {a.title}
                        </Typography>
                        {a.isRejected && (
                          <Chip label="Rejected con allocazioni" size="small" color="error" sx={{ mt: 0.5 }} />
                        )}
                        {a.hasActiveAllocations && !a.isRejected && (
                          <Chip label="Ha allocazioni attive" size="small" color="warning" sx={{ mt: 0.5 }} />
                        )}
                      </Box>
                      <ToggleButtonGroup
                        value={decisions[a.issueKey] || null}
                        exclusive
                        onChange={(_, val) => { if (val) setDecision(a.issueKey, val); }}
                        size="small"
                      >
                        <ToggleButton value="confirm" color="success">
                          Conferma
                        </ToggleButton>
                        <ToggleButton value="reject">
                          Salta
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                    {a.changes.map((ch, i) => (
                      <Typography key={i} variant="caption" component="div" sx={{ ml: 1 }}>
                        {ch.field}: {ch.oldValue ?? "—"} → {ch.newValue ?? "—"}
                      </Typography>
                    ))}
                  </Box>
                ))}

                {Object.keys(decisions).length > 0 && (
                  <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleApplyDecisions}
                      disabled={!allDecided || loading}
                      startIcon={loading ? <CircularProgress size={14} /> : undefined}
                    >
                      Applica decisioni ({Object.values(decisions).filter((d) => d === "confirm").length} confermate,{" "}
                      {Object.values(decisions).filter((d) => d === "reject").length} saltate)
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {result.errors.length > 0 && (
            <Box sx={{ height: 200 }}>
              <DataGrid
                rows={result.errors.map((e, i) => ({ id: i, ...e }))}
                columns={[
                  { field: "row", headerName: "Riga", width: 80 },
                  { field: "issueKey", headerName: "Issue", width: 100 },
                  { field: "error", headerName: "Errore", flex: 1 },
                ]}
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
      <InitiativeImportSection />
      <RisorseImportSection />
      <ParametriImportSection />
      <AssenzeImportSection />
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
          PARAMETRI: "Parametri",
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
