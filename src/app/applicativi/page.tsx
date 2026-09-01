"use client";

import { useState, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Autocomplete from "@mui/material/Autocomplete";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import Add from "@mui/icons-material/Add";
import Edit from "@mui/icons-material/Edit";
import Delete from "@mui/icons-material/Delete";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

interface Application {
  id: string;
  name: string;
  description: string | null;
  contracts: Array<{ id: string; identifier: string }>;
  assignedPMs: Array<{ id: string; name: string }>;
  modules: Array<{ id: string; name: string }>;
  _count: { initiatives: number };
}

interface ContractOption {
  id: string;
  identifier: string;
}
interface ResourceOption {
  id: string;
  name: string;
}

const emptyForm = {
  name: "",
  description: "",
  contractIds: [] as string[],
  pmIds: [] as string[],
};

export default function ApplicativiPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [pms, setPms] = useState<ResourceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [appsRes, contractsRes, pmsRes] = await Promise.all([
      fetch("/api/applications"),
      fetch("/api/contracts"),
      fetch("/api/resources?role=PROJECT_MANAGER"),
    ]);
    setApps(await appsRes.json());
    setContracts(await contractsRes.json());
    const rawPms = await pmsRes.json();
    setPms(
      rawPms.map((r: { id: string; firstName: string; lastName: string }) => ({
        id: r.id,
        name: `${r.lastName} ${r.firstName}`,
      }))
    );
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

  const handleEdit = (app: Application) => {
    setEditing(app);
    setForm({
      name: app.name,
      description: app.description || "",
      contractIds: app.contracts.map((c) => c.id),
      pmIds: app.assignedPMs.map((p) => p.id),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const data = {
      name: form.name,
      description: form.description || undefined,
      contractIds: form.contractIds,
      pmIds: form.pmIds,
    };

    try {
      const url = editing
        ? `/api/applications/${editing.id}`
        : "/api/applications";
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
    const res = await fetch(`/api/applications/${deleteTarget.id}`, {
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

  const columns: GridColDef[] = [
    { field: "name", headerName: "Nome", flex: 1, minWidth: 150 },
    {
      field: "description",
      headerName: "Descrizione",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "contractNames",
      headerName: "Contratti",
      width: 200,
      valueGetter: (_v: unknown, row: Application) =>
        row.contracts.map((c) => c.identifier).join(", ") || "-",
    },
    {
      field: "pmNames",
      headerName: "PM",
      width: 150,
      valueGetter: (_v: unknown, row: Application) =>
        row.assignedPMs.map((p) => p.name).join(", ") || "-",
    },
    {
      field: "initiativeCount",
      headerName: "Iniziative",
      width: 90,
      valueGetter: (_v: unknown, row: Application) => row._count.initiatives,
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
          Applicativi
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>
          Nuovo Applicativo
        </Button>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          rows={apps}
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
          {editing ? "Modifica Applicativo" : "Nuovo Applicativo"}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 2,
              mt: 1,
            }}
          >
            <TextField
              label="Nome"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
              required
              size="small"
            />
            <TextField
              label="Descrizione"
              multiline
              rows={2}
              value={form.description}
              onChange={(e) => updateForm("description", e.target.value)}
              size="small"
            />
            <Autocomplete
              multiple
              options={contracts}
              getOptionLabel={(opt) => opt.identifier}
              value={contracts.filter((c) =>
                form.contractIds.includes(c.id),
              )}
              onChange={(_, selected) =>
                updateForm(
                  "contractIds",
                  selected.map((s) => s.id),
                )
              }
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => (
                <TextField {...params} label="Contratti" size="small" />
              )}
              size="small"
            />
            <Autocomplete
              multiple
              options={pms}
              getOptionLabel={(opt) => opt.name}
              value={pms.filter((p) => form.pmIds.includes(p.id))}
              onChange={(_, selected) =>
                updateForm(
                  "pmIds",
                  selected.map((s) => s.id),
                )
              }
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => (
                <TextField {...params} label="PM Assegnati" size="small" />
              )}
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annulla</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!form.name}
          >
            Salva
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Elimina Applicativo"
        message={`Eliminare ${deleteTarget?.name}? L'operazione non e reversibile.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
