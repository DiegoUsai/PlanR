"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import Add from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import Delete from "@mui/icons-material/Delete";
import dayjs from "dayjs";
import { RESOURCE_ROLE_LABELS } from "@/lib/constants";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

interface Allocation {
  id: string;
  resourceId: string;
  lockType: string;
  softLockExpiry: string | null;
  allocationPercentage: number;
  startDate: string;
  endDate: string;
  allocatedEffortDays: string;
  roleInInitiative: string;
  affiancamento: boolean;
  isSeniorAffiancamento: boolean;
  notes: string | null;
  resource: { id: string; lastName: string; firstName: string; role: string };
}

interface ResourceOption {
  id: string;
  lastName: string;
  firstName: string;
  role: string;
}

const emptyForm = {
  resourceId: "",
  lockType: "SOFT",
  softLockExpiry: "",
  allocationPercentage: "100",
  startDate: "",
  endDate: "",
  allocatedEffortDays: "",
  roleInInitiative: "",
  affiancamento: false,
  isSeniorAffiancamento: false,
  notes: "",
};

interface InitiativeContext {
  id: string;
  issueKey: string;
  title: string;
  estimatedDays: string | null;
  plannedStartDate: string | null;
  desiredEndDate: string | null;
  application: { name: string };
  contract: { identifier: string } | null;
}

export default function AllocationManager({
  initiative,
  open,
  onClose,
}: {
  initiative: InitiativeContext;
  open: boolean;
  onClose: () => void;
}) {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [resources, setResources] = useState<ResourceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Allocation | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Allocation | null>(null);

  const fetchAllocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/allocations?initiativeId=${initiative.id}`);
      if (res.ok) setAllocations(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [initiative.id]);

  const fetchResources = useCallback(async () => {
    try {
      const res = await fetch("/api/resources");
      if (res.ok) {
        const data = await res.json();
        setResources(
          data.map((r: { id: string; lastName: string; firstName: string; parameters: { role: string }[] }) => ({
            id: r.id,
            lastName: r.lastName,
            firstName: r.firstName,
            role: r.parameters?.[0]?.role || "ALTRO",
          }))
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchAllocations();
      fetchResources();
    }
  }, [open, fetchAllocations, fetchResources]);

  const updateForm = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setWarnings([]);
    setPendingConfirm(false);
    setFormOpen(true);
  };

  const handleEdit = (alloc: Allocation) => {
    setEditing(alloc);
    setForm({
      resourceId: alloc.resourceId,
      lockType: alloc.lockType,
      softLockExpiry: alloc.softLockExpiry?.split("T")[0] || "",
      allocationPercentage: String(alloc.allocationPercentage),
      startDate: alloc.startDate?.split("T")[0] || "",
      endDate: alloc.endDate?.split("T")[0] || "",
      allocatedEffortDays: String(alloc.allocatedEffortDays),
      roleInInitiative: alloc.roleInInitiative,
      affiancamento: alloc.affiancamento,
      isSeniorAffiancamento: alloc.isSeniorAffiancamento,
      notes: alloc.notes || "",
    });
    setError(null);
    setWarnings([]);
    setPendingConfirm(false);
    setFormOpen(true);
  };

  const handleSave = async (confirm = false) => {
    setError(null);
    const data: Record<string, unknown> = {
      initiativeId: initiative.id,
      resourceId: form.resourceId,
      lockType: form.lockType,
      softLockExpiry:
        form.lockType === "SOFT" && form.softLockExpiry
          ? form.softLockExpiry
          : null,
      allocationPercentage: Number(form.allocationPercentage),
      startDate: form.startDate,
      endDate: form.endDate,
      allocatedEffortDays: form.allocatedEffortDays
        ? Number(form.allocatedEffortDays)
        : undefined,
      roleInInitiative: form.roleInInitiative,
      affiancamento: form.affiancamento,
      isSeniorAffiancamento: form.isSeniorAffiancamento,
      notes: form.notes || undefined,
    };

    if (confirm) {
      data.confirm = true;
    }

    try {
      const url = editing
        ? `/api/allocations/${editing.id}`
        : "/api/allocations";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        if (body.requiresConfirmation && body.warnings) {
          setWarnings(body.warnings);
          setPendingConfirm(true);
          return;
        }
        setError(body.error || "Errore nel salvataggio");
        return;
      }

      setFormOpen(false);
      setWarnings([]);
      setPendingConfirm(false);
      fetchAllocations();
    } catch {
      setError("Errore di rete");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/allocations/${deleteTarget.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchAllocations();
    } else {
      const err = await res.json();
      alert(err.error || "Impossibile eliminare");
    }
    setDeleteTarget(null);
  };

  const selectedResource = resources.find((r) => r.id === form.resourceId);

  const autoEffort = useMemo(() => {
    if (!form.startDate || !form.endDate) return null;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return null;
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    const pct = Number(form.allocationPercentage) || 100;
    return Math.round((count * pct) / 100 * 10) / 10;
  }, [form.startDate, form.endDate, form.allocationPercentage]);

  const columns: GridColDef[] = [
    {
      field: "resourceName",
      headerName: "Risorsa",
      width: 150,
      valueGetter: (_v: unknown, row: Allocation) =>
        row.resource ? `${row.resource.lastName} ${row.resource.firstName}` : "-",
    },
    {
      field: "roleInInitiative",
      headerName: "Ruolo",
      width: 120,
      valueFormatter: (value: string) => RESOURCE_ROLE_LABELS[value] || value,
    },
    {
      field: "lockType",
      headerName: "Lock",
      width: 80,
      renderCell: ({ value }) => (
        <Chip
          label={value}
          size="small"
          color={value === "HARD" ? "success" : "warning"}
        />
      ),
    },
    {
      field: "allocatedEffortDays",
      headerName: "GG",
      width: 70,
      type: "number",
    },
    {
      field: "allocationPercentage",
      headerName: "%",
      width: 60,
      type: "number",
    },
    {
      field: "startDate",
      headerName: "Inizio",
      width: 110,
      valueFormatter: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      field: "endDate",
      headerName: "Fine",
      width: 110,
      valueFormatter: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      field: "affiancamento",
      headerName: "Aff.",
      width: 60,
      renderCell: ({ value }) => (value ? "Si" : ""),
    },
    {
      field: "actions",
      headerName: "",
      width: 80,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: ({ row }) => (
        <>
          <IconButton size="small" onClick={() => handleEdit(row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => setDeleteTarget(row)}>
            <Delete fontSize="small" />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          Allocazioni — {initiative.issueKey} {initiative.title}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              mb: 2,
              p: 1.5,
              bgcolor: "action.hover",
              borderRadius: 1,
            }}
          >
            <Typography variant="body2">
              <strong>Applicativo:</strong> {initiative.application.name}
            </Typography>
            {initiative.contract && (
              <Typography variant="body2">
                <strong>Contratto:</strong> {initiative.contract.identifier}
              </Typography>
            )}
            {initiative.estimatedDays && (
              <Typography variant="body2">
                <strong>GG stimati:</strong> {initiative.estimatedDays}
              </Typography>
            )}
            {initiative.plannedStartDate && (
              <Typography variant="body2">
                <strong>Inizio:</strong> {dayjs(initiative.plannedStartDate).format("DD/MM/YYYY")}
              </Typography>
            )}
            {initiative.desiredEndDate && (
              <Typography variant="body2">
                <strong>Fine:</strong> {dayjs(initiative.desiredEndDate).format("DD/MM/YYYY")}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={handleCreate}
            >
              Nuova allocazione
            </Button>
          </Box>
          <Box sx={{ height: 350 }}>
            <DataGrid
              rows={allocations}
              columns={columns}
              loading={loading}
              density="compact"
              disableRowSelectionOnClick
              pageSizeOptions={[10]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Chiudi</Button>
        </DialogActions>
      </Dialog>

      {/* Form dialog */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editing ? "Modifica allocazione" : "Nuova allocazione"}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {warnings.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {warnings.map((w, i) => (
                <div key={i}>{w}</div>
              ))}
            </Alert>
          )}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 2,
              mt: 1,
            }}
          >
            <TextField
              select
              label="Risorsa"
              value={form.resourceId}
              onChange={(e) => {
                updateForm("resourceId", e.target.value);
                const res = resources.find((r) => r.id === e.target.value);
                if (res && !form.roleInInitiative) {
                  updateForm("roleInInitiative", res.role);
                }
              }}
              required
              size="small"
              sx={{ gridColumn: "1 / -1" }}
            >
              {resources.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.lastName} {r.firstName} ({RESOURCE_ROLE_LABELS[r.role] || r.role})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Ruolo nell'iniziativa"
              value={form.roleInInitiative}
              onChange={(e) => updateForm("roleInInitiative", e.target.value)}
              required
              size="small"
            >
              {Object.entries(RESOURCE_ROLE_LABELS).map(([v, l]) => (
                <MenuItem key={v} value={v}>
                  {l}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Tipo lock"
              value={form.lockType}
              onChange={(e) => updateForm("lockType", e.target.value)}
              size="small"
            >
              <MenuItem value="SOFT">Soft</MenuItem>
              <MenuItem value="HARD">Hard</MenuItem>
            </TextField>

            {form.lockType === "SOFT" && (
              <TextField
                label="Scadenza soft lock"
                type="date"
                value={form.softLockExpiry}
                onChange={(e) => updateForm("softLockExpiry", e.target.value)}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            )}

            <TextField
              label="GG effort allocato"
              type="number"
              value={form.allocatedEffortDays || (autoEffort !== null ? String(autoEffort) : "")}
              onChange={(e) =>
                updateForm("allocatedEffortDays", e.target.value)
              }
              size="small"
              helperText={
                autoEffort !== null && !form.allocatedEffortDays
                  ? `Calcolato: ${autoEffort} GG`
                  : undefined
              }
            />

            <TextField
              label="% allocazione"
              type="number"
              value={form.allocationPercentage}
              onChange={(e) =>
                updateForm("allocationPercentage", e.target.value)
              }
              size="small"
              slotProps={{ htmlInput: { min: 1, max: 100 } }}
            />

            <TextField
              label="Data inizio"
              type="date"
              value={form.startDate}
              onChange={(e) => updateForm("startDate", e.target.value)}
              required
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <TextField
              label="Data fine"
              type="date"
              value={form.endDate}
              onChange={(e) => updateForm("endDate", e.target.value)}
              required
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={form.affiancamento}
                  onChange={(e) =>
                    updateForm("affiancamento", e.target.checked)
                  }
                />
              }
              label="Affiancamento"
            />

            {form.affiancamento && (
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isSeniorAffiancamento}
                    onChange={(e) =>
                      updateForm("isSeniorAffiancamento", e.target.checked)
                    }
                  />
                }
                label="Senior (affiancatore)"
              />
            )}

            <TextField
              label="Note"
              multiline
              rows={2}
              value={form.notes}
              onChange={(e) => updateForm("notes", e.target.value)}
              size="small"
              sx={{ gridColumn: "1 / -1" }}
            />
          </Box>

          {selectedResource && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: "block" }}
            >
              Ruolo risorsa: {RESOURCE_ROLE_LABELS[selectedResource.role] || selectedResource.role}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setFormOpen(false); setWarnings([]); setPendingConfirm(false); }}>Annulla</Button>
          <Button
            variant="contained"
            color={pendingConfirm ? "warning" : "primary"}
            onClick={() => handleSave(pendingConfirm)}
            disabled={
              !form.resourceId ||
              !form.roleInInitiative ||
              !form.startDate ||
              !form.endDate
            }
          >
            {pendingConfirm ? "Conferma" : "Salva"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Elimina allocazione"
        message={`Eliminare l'allocazione di ${deleteTarget?.resource?.lastName} ${deleteTarget?.resource?.firstName}?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
