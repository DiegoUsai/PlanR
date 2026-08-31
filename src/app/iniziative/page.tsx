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
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import InputAdornment from "@mui/material/InputAdornment";
import Add from "@mui/icons-material/Add";
import Edit from "@mui/icons-material/Edit";
import Delete from "@mui/icons-material/Delete";
import Search from "@mui/icons-material/Search";
import dayjs from "dayjs";
import {
  INITIATIVE_TYPE_LABELS,
  INITIATIVE_STATUS_LABELS,
  INITIATIVE_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from "@/lib/constants";
import GroupIcon from "@mui/icons-material/Group";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import AllocationManager from "@/components/initiatives/AllocationManager";

interface Initiative {
  id: string;
  code: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  estimatedDays: string | null;
  desiredStartDate: string | null;
  desiredEndDate: string | null;
  notes: string | null;
  applicationId: string;
  contractId: string;
  moduleId: string | null;
  application: { id: string; name: string };
  contract: { id: string; identifier: string };
  module: { id: string; name: string } | null;
  _count: { allocations: number };
}

interface AppOption {
  id: string;
  name: string;
  modules: Array<{ id: string; name: string }>;
}
interface ContractOption {
  id: string;
  identifier: string;
}

const emptyForm = {
  code: "",
  title: "",
  applicationId: "",
  contractId: "",
  moduleId: "",
  type: "MEV",
  priority: "MEDIA",
  status: "IN_ATTESA_DI_ALLOCAZIONE",
  estimatedDays: "",
  desiredStartDate: "",
  desiredEndDate: "",
  description: "",
  notes: "",
};

export default function IniziativePage() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [applications, setApplications] = useState<AppOption[]>([]);
  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Initiative | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Initiative | null>(null);
  const [allocTarget, setAllocTarget] = useState<Initiative | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);

  const filteredInitiatives = useMemo(() => {
    let result = initiatives;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.code.toLowerCase().includes(q) ||
          i.application?.name.toLowerCase().includes(q)
      );
    }
    if (filterStatus) result = result.filter((i) => i.status === filterStatus);
    if (filterPriority) result = result.filter((i) => i.priority === filterPriority);
    return result;
  }, [initiatives, search, filterStatus, filterPriority]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [iRes, aRes, cRes] = await Promise.all([
      fetch("/api/initiatives"),
      fetch("/api/applications"),
      fetch("/api/contracts"),
    ]);
    setInitiatives(await iRes.json());
    setApplications(await aRes.json());
    setContracts(await cRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateForm = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectedApp = applications.find((a) => a.id === form.applicationId);
  const availableModules = selectedApp?.modules || [];

  const handleCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (init: Initiative) => {
    setEditing(init);
    setForm({
      code: init.code || "",
      title: init.title,
      applicationId: init.applicationId,
      contractId: init.contractId,
      moduleId: init.moduleId || "",
      type: init.type,
      priority: init.priority,
      status: init.status,
      estimatedDays: init.estimatedDays ? String(init.estimatedDays) : "",
      desiredStartDate: init.desiredStartDate?.split("T")[0] || "",
      desiredEndDate: init.desiredEndDate?.split("T")[0] || "",
      description: init.description || "",
      notes: init.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const data = {
      code: form.code,
      title: form.title,
      applicationId: form.applicationId,
      contractId: form.contractId,
      moduleId: form.moduleId || null,
      type: form.type,
      priority: form.priority,
      status: form.status,
      estimatedDays: form.estimatedDays
        ? Number(form.estimatedDays)
        : undefined,
      desiredStartDate: form.desiredStartDate || undefined,
      desiredEndDate: form.desiredEndDate || undefined,
      description: form.description || undefined,
      notes: form.notes || undefined,
    };

    try {
      const url = editing
        ? `/api/initiatives/${editing.id}`
        : "/api/initiatives";
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
    const res = await fetch(`/api/initiatives/${deleteTarget.id}`, {
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

  const handleAppChange = (appId: string) => {
    const app = applications.find((a) => a.id === appId);
    const moduleStillValid = app?.modules.some((m) => m.id === form.moduleId);
    setForm((prev) => ({
      ...prev,
      applicationId: appId,
      moduleId: moduleStillValid ? prev.moduleId : "",
    }));
  };

  const columns: GridColDef[] = [
    { field: "code", headerName: "Codice", width: 110 },
    { field: "title", headerName: "Titolo", flex: 1, minWidth: 200 },
    {
      field: "appName",
      headerName: "Applicativo",
      width: 140,
      valueGetter: (_v: unknown, row: Initiative) =>
        row.application?.name || "-",
    },
    {
      field: "contractName",
      headerName: "Contratto",
      width: 130,
      valueGetter: (_v: unknown, row: Initiative) =>
        row.contract?.identifier || "-",
    },
    {
      field: "type",
      headerName: "Tipo",
      width: 80,
      valueFormatter: (value: string) =>
        INITIATIVE_TYPE_LABELS[value] || value,
    },
    {
      field: "priority",
      headerName: "Priorita",
      width: 90,
      renderCell: ({ value }) => (
        <Chip
          label={PRIORITY_LABELS[value] || value}
          size="small"
          color={PRIORITY_COLORS[value] || "default"}
        />
      ),
    },
    {
      field: "status",
      headerName: "Stato",
      width: 200,
      renderCell: ({ value }) => (
        <Chip
          label={INITIATIVE_STATUS_LABELS[value] || value}
          size="small"
          color={INITIATIVE_STATUS_COLORS[value] || "default"}
        />
      ),
    },
    {
      field: "estimatedDays",
      headerName: "GG Stimati",
      width: 100,
      valueFormatter: (value: string | null) => (value ? value : "-"),
    },
    {
      field: "desiredStartDate",
      headerName: "Inizio Desiderato",
      width: 130,
      valueFormatter: (value: string | null) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "-",
    },
    {
      field: "allocCount",
      headerName: "Allocazioni",
      width: 100,
      valueGetter: (_v: unknown, row: Initiative) => row._count.allocations,
    },
    {
      field: "actions",
      headerName: "",
      width: 130,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: ({ row }) => (
        <>
          <IconButton
            size="small"
            title="Allocazioni"
            onClick={(e) => {
              e.stopPropagation();
              setAllocTarget(row);
            }}
          >
            <GroupIcon fontSize="small" />
          </IconButton>
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
          Iniziative
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>
          Nuova Iniziativa
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          size="small"
          placeholder="Cerca iniziativa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 200 }}
        />
        {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
          <Chip
            key={v}
            label={l}
            size="small"
            variant={filterPriority === v ? "filled" : "outlined"}
            color={filterPriority === v ? (PRIORITY_COLORS[v] || "default") : "default"}
            onClick={() => setFilterPriority(filterPriority === v ? null : v)}
          />
        ))}
        <Box sx={{ mx: 0.5, borderLeft: "1px solid", borderColor: "divider", height: 24 }} />
        {Object.entries(INITIATIVE_STATUS_LABELS).map(([v, l]) => (
          <Chip
            key={v}
            label={l}
            size="small"
            variant={filterStatus === v ? "filled" : "outlined"}
            color={filterStatus === v ? (INITIATIVE_STATUS_COLORS[v] || "default") : "default"}
            onClick={() => setFilterStatus(filterStatus === v ? null : v)}
          />
        ))}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          rows={filteredInitiatives}
          columns={columns}
          loading={loading}
          density="compact"
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50, 100]}
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
          {editing ? "Modifica Iniziativa" : "Nuova Iniziativa"}
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
              label="Codice (Jira)"
              value={form.code}
              onChange={(e) => updateForm("code", e.target.value)}
              required
              size="small"
              placeholder="DOC-142"
            />
            <TextField
              label="Titolo"
              value={form.title}
              onChange={(e) => updateForm("title", e.target.value)}
              required
              size="small"
            />
            <TextField
              select
              label="Applicativo"
              value={form.applicationId}
              onChange={(e) => handleAppChange(e.target.value)}
              required
              size="small"
            >
              {applications.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Contratto"
              value={form.contractId}
              onChange={(e) => updateForm("contractId", e.target.value)}
              required
              size="small"
            >
              {contracts.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.identifier}
                </MenuItem>
              ))}
            </TextField>
            {availableModules.length > 0 && (
              <TextField
                select
                label="Modulo"
                value={form.moduleId}
                onChange={(e) => updateForm("moduleId", e.target.value)}
                size="small"
              >
                <MenuItem value="">Nessuno</MenuItem>
                {availableModules.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              select
              label="Tipo"
              value={form.type}
              onChange={(e) => updateForm("type", e.target.value)}
              size="small"
            >
              {Object.entries(INITIATIVE_TYPE_LABELS).map(([v, l]) => (
                <MenuItem key={v} value={v}>
                  {l}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Priorita"
              value={form.priority}
              onChange={(e) => updateForm("priority", e.target.value)}
              size="small"
            >
              {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                <MenuItem key={v} value={v}>
                  {l}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Stato"
              value={form.status}
              onChange={(e) => updateForm("status", e.target.value)}
              size="small"
              sx={{ gridColumn: "1 / -1" }}
            >
              {Object.entries(INITIATIVE_STATUS_LABELS).map(([v, l]) => (
                <MenuItem key={v} value={v}>
                  {l}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="GG Stimati"
              type="number"
              value={form.estimatedDays}
              onChange={(e) => updateForm("estimatedDays", e.target.value)}
              size="small"
            />
            <Box />
            <TextField
              label="Inizio Desiderato"
              type="date"
              value={form.desiredStartDate}
              onChange={(e) => updateForm("desiredStartDate", e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Fine Desiderata"
              type="date"
              value={form.desiredEndDate}
              onChange={(e) => updateForm("desiredEndDate", e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Descrizione"
              multiline
              rows={2}
              value={form.description}
              onChange={(e) => updateForm("description", e.target.value)}
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
              !form.code || !form.title || !form.applicationId || !form.contractId
            }
          >
            Salva
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Elimina Iniziativa"
        message={`Eliminare "${deleteTarget?.title}"? L'operazione non e reversibile.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {allocTarget && (
        <AllocationManager
          initiative={allocTarget}
          open={!!allocTarget}
          onClose={() => {
            setAllocTarget(null);
            fetchData();
          }}
        />
      )}
    </Box>
  );
}
