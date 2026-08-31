"use client";

import { useState, useEffect, useCallback } from "react";
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
import Autocomplete from "@mui/material/Autocomplete";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import Add from "@mui/icons-material/Add";
import Edit from "@mui/icons-material/Edit";
import Delete from "@mui/icons-material/Delete";
import dayjs from "dayjs";
import { CONTRACT_TYPE_LABELS } from "@/lib/constants";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

interface ClientOption {
  slug: string;
  name: string;
}

interface Contract {
  id: string;
  identifier: string;
  type: string;
  clientSlug: string;
  client: ClientOption;
  amount: string;
  startDate: string;
  endDate: string;
  pmEffortPercentage: string;
  notes: string | null;
  applications: Array<{ id: string; name: string }>;
  _count: { initiatives: number };
}

interface AppOption {
  id: string;
  name: string;
}

const emptyForm = {
  identifier: "",
  type: "SUBAPPALTO",
  clientSlug: "",
  clientInput: "",
  amount: "",
  startDate: "",
  endDate: "",
  pmEffortPercentage: "5",
  notes: "",
  applicationIds: [] as string[],
};

export default function ContrattiPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [applications, setApplications] = useState<AppOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cRes, clRes, aRes] = await Promise.all([
      fetch("/api/contracts"),
      fetch("/api/clients"),
      fetch("/api/applications"),
    ]);
    setContracts(await cRes.json());
    setClients(await clRes.json());
    setApplications(await aRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateForm = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (contract: Contract) => {
    setEditing(contract);
    setForm({
      identifier: contract.identifier,
      type: contract.type,
      clientSlug: contract.clientSlug,
      clientInput: contract.client?.name || "",
      amount: String(contract.amount),
      startDate: contract.startDate.split("T")[0],
      endDate: contract.endDate.split("T")[0],
      pmEffortPercentage: String(contract.pmEffortPercentage),
      notes: contract.notes || "",
      applicationIds: contract.applications.map((a) => a.id),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    let clientSlug = form.clientSlug;

    if (!clientSlug && form.clientInput) {
      try {
        const clientRes = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.clientInput }),
        });
        if (!clientRes.ok) {
          alert("Errore nella creazione del cliente");
          return;
        }
        const newClient = await clientRes.json();
        clientSlug = newClient.slug;
      } catch {
        alert("Errore di rete");
        return;
      }
    }

    const data = {
      identifier: form.identifier,
      type: form.type,
      clientSlug,
      amount: Number(form.amount),
      startDate: form.startDate,
      endDate: form.endDate,
      pmEffortPercentage: Number(form.pmEffortPercentage),
      notes: form.notes || undefined,
      applicationIds: form.applicationIds,
    };

    try {
      const url = editing
        ? `/api/contracts/${editing.id}`
        : "/api/contracts";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Errore nel salvataggio");
        return;
      }
      setDialogOpen(false);
      fetchData();
    } catch {
      alert("Errore di rete");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/contracts/${deleteTarget.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchData();
    } else {
      const err = await res.json();
      alert(err.error || "Impossibile eliminare");
    }
    setDeleteTarget(null);
  };

  const formatCurrency = (value: string) =>
    Number(value).toLocaleString("it-IT", {
      style: "currency",
      currency: "EUR",
    });

  const columns: GridColDef[] = [
    { field: "identifier", headerName: "Identificativo", flex: 1, minWidth: 140 },
    {
      field: "type",
      headerName: "Tipo",
      width: 120,
      renderCell: ({ value }) => (
        <Chip
          label={CONTRACT_TYPE_LABELS[value] || value}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: "clientName",
      headerName: "Cliente",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v: unknown, row: Contract) => row.client?.name || "-",
    },
    {
      field: "amount",
      headerName: "Importo",
      width: 130,
      valueFormatter: (value: string) => formatCurrency(value),
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
      field: "appNames",
      headerName: "Applicativi",
      width: 180,
      valueGetter: (_v: unknown, row: Contract) =>
        row.applications.map((a) => a.name).join(", ") || "-",
    },
    {
      field: "initiativeCount",
      headerName: "Iniziative",
      width: 90,
      valueGetter: (_v: unknown, row: Contract) => row._count.initiatives,
    },
    {
      field: "actions",
      headerName: "",
      width: 90,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: ({ row }) => (
        <>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row);
            }}
          >
            <Delete fontSize="small" />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 48px)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Contratti
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>
          Nuovo Contratto
        </Button>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          rows={contracts}
          columns={columns}
          loading={loading}
          density="compact"
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          onRowDoubleClick={(params) => handleEdit(params.row)}
          sx={{
            height: "100%",
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
          }}
        />
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editing ? "Modifica Contratto" : "Nuovo Contratto"}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 2,
              mt: 1,
            }}
          >
            <TextField
              label="Identificativo"
              value={form.identifier}
              onChange={(e) => updateForm("identifier", e.target.value)}
              required
              size="small"
            />
            <TextField
              select
              label="Tipo"
              value={form.type}
              onChange={(e) => updateForm("type", e.target.value)}
              size="small"
            >
              {Object.entries(CONTRACT_TYPE_LABELS).map(([v, l]) => (
                <MenuItem key={v} value={v}>
                  {l}
                </MenuItem>
              ))}
            </TextField>
            <Autocomplete
              freeSolo
              options={clients}
              getOptionLabel={(opt) =>
                typeof opt === "string" ? opt : opt.name
              }
              value={
                clients.find((c) => c.slug === form.clientSlug) || null
              }
              inputValue={form.clientInput}
              onInputChange={(_, val) => {
                updateForm("clientInput", val);
                const match = clients.find(
                  (c) => c.name.toLowerCase() === val.toLowerCase()
                );
                updateForm("clientSlug", match ? match.slug : "");
              }}
              onChange={(_, val) => {
                if (val && typeof val !== "string") {
                  updateForm("clientSlug", val.slug);
                  updateForm("clientInput", val.name);
                }
              }}
              isOptionEqualToValue={(opt, val) =>
                typeof opt === "string" || typeof val === "string"
                  ? opt === val
                  : opt.slug === val.slug
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Cliente"
                  required
                  size="small"
                  helperText={
                    form.clientInput && !form.clientSlug
                      ? "Nuovo cliente — verra creato al salvataggio"
                      : undefined
                  }
                />
              )}
              size="small"
              sx={{ gridColumn: "1 / -1" }}
            />
            <TextField
              label="Importo"
              type="number"
              value={form.amount}
              onChange={(e) => updateForm("amount", e.target.value)}
              required
              size="small"
            />
            <TextField
              label="% Effort PM"
              type="number"
              value={form.pmEffortPercentage}
              onChange={(e) =>
                updateForm("pmEffortPercentage", e.target.value)
              }
              size="small"
              slotProps={{ htmlInput: { min: 0, max: 100, step: 1 } }}
            />
            <TextField
              label="Data Inizio"
              type="date"
              value={form.startDate}
              onChange={(e) => updateForm("startDate", e.target.value)}
              required
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Data Fine"
              type="date"
              value={form.endDate}
              onChange={(e) => updateForm("endDate", e.target.value)}
              required
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Autocomplete
              multiple
              options={applications}
              getOptionLabel={(opt) => opt.name}
              value={applications.filter((a) =>
                form.applicationIds.includes(a.id),
              )}
              onChange={(_, selected) =>
                updateForm(
                  "applicationIds",
                  selected.map((s) => s.id),
                )
              }
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => (
                <TextField {...params} label="Applicativi" size="small" />
              )}
              size="small"
              sx={{ gridColumn: "1 / -1" }}
            />
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annulla</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={
              !form.identifier || !form.clientInput || !form.startDate || !form.endDate
            }
          >
            Salva
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Elimina Contratto"
        message={`Eliminare ${deleteTarget?.identifier}? L'operazione non e reversibile.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
