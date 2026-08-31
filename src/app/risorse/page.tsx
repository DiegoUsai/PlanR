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
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import InputAdornment from "@mui/material/InputAdornment";
import Add from "@mui/icons-material/Add";
import Edit from "@mui/icons-material/Edit";
import Delete from "@mui/icons-material/Delete";
import Search from "@mui/icons-material/Search";
import Assignment from "@mui/icons-material/Assignment";
import {
  RESOURCE_ROLE_LABELS,
  RESOURCE_LEVEL_LABELS,
  RESOURCE_TYPE_LABELS,
  RESOURCE_BELONGING_LABELS,
} from "@/lib/constants";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ResourceAllocationsDialog from "@/components/resources/ResourceAllocationsDialog";

interface ResourceParam {
  role: string;
  level: string;
  weeklyHours: string;
  dailyCost: string;
  productivityCoeff: string;
  weeklyHoursBuffer: string | null;
  validFrom: string;
  validTo: string | null;
}

interface Resource {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
  type: string;
  belonging: string;
  isPTF: boolean;
  joinDate: string | null;
  notes: string | null;
  parameters: ResourceParam[];
  _count: { allocations: number };
}

const todayStr = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  firstName: "",
  lastName: "",
  employeeId: "",
  role: "FE",
  level: "MID",
  type: "INTERNA" as string,
  belonging: "BU_DOCUMENTALE",
  isPTF: false,
  joinDate: "",
  notes: "",
  weeklyHours: "40",
  dailyCost: "0",
  productivityCoeff: "1",
  weeklyHoursBuffer: "",
  validFrom: todayStr(),
};

export default function RisorsePage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const [allocTarget, setAllocTarget] = useState<Resource | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string | null>(null);

  const filteredResources = useMemo(() => {
    let result = resources;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          `${r.lastName} ${r.firstName}`.toLowerCase().includes(q) ||
          r.employeeId?.toLowerCase().includes(q)
      );
    }
    if (filterRole) result = result.filter((r) => r.parameters[0]?.role === filterRole);
    return result;
  }, [resources, search, filterRole]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/resources");
    setResources(await res.json());
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

  const handleEdit = (resource: Resource) => {
    const p = resource.parameters[0];
    setEditing(resource);
    setForm({
      firstName: resource.firstName,
      lastName: resource.lastName,
      employeeId: resource.employeeId || "",
      role: p?.role || "FE",
      level: p?.level || "MID",
      type: resource.type,
      belonging: resource.belonging,
      isPTF: resource.isPTF,
      joinDate: resource.joinDate?.split("T")[0] || "",
      notes: resource.notes || "",
      weeklyHours: p?.weeklyHours || "40",
      dailyCost: p?.dailyCost || "0",
      productivityCoeff: p?.productivityCoeff || "1",
      weeklyHoursBuffer: p?.weeklyHoursBuffer || "",
      validFrom: p?.validFrom?.split("T")[0] || todayStr(),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const { weeklyHours, dailyCost, productivityCoeff, role, level, weeklyHoursBuffer, validFrom, ...rest } = form;
    const resourceData = {
      firstName: rest.firstName,
      lastName: rest.lastName,
      employeeId: rest.employeeId || undefined,
      type: rest.type,
      belonging: rest.belonging,
      isPTF: rest.isPTF,
      joinDate: rest.joinDate || undefined,
      notes: rest.notes || undefined,
    };

    const paramData = {
      role,
      level,
      weeklyHours: Number(weeklyHours),
      dailyCost: Number(dailyCost),
      productivityCoeff: Number(productivityCoeff) || 1,
      weeklyHoursBuffer: weeklyHoursBuffer ? Number(weeklyHoursBuffer) : null,
      validFrom: validFrom || todayStr(),
    };

    try {
      if (editing) {
        const res = await fetch(`/api/resources/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resourceData),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Errore nel salvataggio");
          return;
        }
        const p = editing.parameters[0];
        const paramChanged =
          role !== p?.role ||
          level !== p?.level ||
          String(weeklyHours) !== String(p?.weeklyHours) ||
          String(dailyCost) !== String(p?.dailyCost) ||
          String(productivityCoeff) !== String(p?.productivityCoeff) ||
          String(weeklyHoursBuffer || "") !== String(p?.weeklyHoursBuffer || "") ||
          validFrom !== (p?.validFrom?.split("T")[0] || "");
        if (paramChanged) {
          const pRes = await fetch(`/api/resources/${editing.id}/parameters`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resourceId: editing.id, ...paramData }),
          });
          if (!pRes.ok) {
            const pErr = await pRes.json().catch(() => ({}));
            alert(pErr.error || "Errore nel salvataggio parametri");
            return;
          }
        }
      } else {
        const res = await fetch("/api/resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resourceData),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Errore nella creazione");
          return;
        }
        const created = await res.json();
        await fetch(`/api/resources/${created.id}/parameters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resourceId: created.id, ...paramData }),
        });
      }
      setDialogOpen(false);
      fetchData();
    } catch {
      alert("Errore di rete");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/resources/${deleteTarget.id}`, {
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
    {
      field: "nominativo",
      headerName: "Nominativo",
      flex: 1,
      minWidth: 180,
      valueGetter: (_v: unknown, row: Resource) =>
        `${row.lastName} ${row.firstName}`,
    },
    {
      field: "role",
      headerName: "Ruolo",
      width: 130,
      valueGetter: (_v: unknown, row: Resource) => row.parameters[0]?.role || "",
      renderCell: ({ value }) => (
        <Chip
          label={RESOURCE_ROLE_LABELS[value] || value}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: "level",
      headerName: "Livello",
      width: 90,
      valueGetter: (_v: unknown, row: Resource) => row.parameters[0]?.level || "",
      valueFormatter: (value: string) => RESOURCE_LEVEL_LABELS[value] || value,
    },
    {
      field: "type",
      headerName: "Tipo",
      width: 90,
      valueFormatter: (value: string) => RESOURCE_TYPE_LABELS[value] || value,
    },
    {
      field: "belonging",
      headerName: "Appartenenza",
      width: 150,
      valueFormatter: (value: string) =>
        RESOURCE_BELONGING_LABELS[value] || value,
    },
    {
      field: "weeklyHours",
      headerName: "Ore/sett",
      width: 85,
      valueGetter: (_value: unknown, row: Resource) =>
        row.parameters[0]?.weeklyHours || "-",
    },
    {
      field: "validFrom",
      headerName: "Dal",
      width: 100,
      valueGetter: (_value: unknown, row: Resource) =>
        row.parameters[0]?.validFrom || "",
      valueFormatter: (value: string) =>
        value ? new Date(value).toLocaleDateString("it-IT") : "-",
    },
    {
      field: "isPTF",
      headerName: "PTF",
      width: 60,
      renderCell: ({ value }) =>
        value ? <Chip label="PTF" size="small" color="info" /> : null,
    },
    {
      field: "actions",
      headerName: "",
      width: 120,
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
            <Assignment fontSize="small" />
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
          Risorse
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>
          Nuova Risorsa
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          size="small"
          placeholder="Cerca risorsa..."
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
        {Object.entries(RESOURCE_ROLE_LABELS).map(([v, l]) => (
          <Chip
            key={v}
            label={l}
            size="small"
            variant={filterRole === v ? "filled" : "outlined"}
            color={filterRole === v ? "primary" : "default"}
            onClick={() => setFilterRole(filterRole === v ? null : v)}
          />
        ))}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          rows={filteredResources}
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
          {editing ? "Modifica Risorsa" : "Nuova Risorsa"}
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
              label="Cognome"
              value={form.lastName}
              onChange={(e) => updateForm("lastName", e.target.value)}
              required
              size="small"
            />
            <TextField
              label="Nome"
              value={form.firstName}
              onChange={(e) => updateForm("firstName", e.target.value)}
              required
              size="small"
            />
            <TextField
              label="ID Dipendente"
              value={form.employeeId}
              onChange={(e) => updateForm("employeeId", e.target.value)}
              size="small"
            />
            <TextField
              select
              label="Ruolo"
              value={form.role}
              onChange={(e) => updateForm("role", e.target.value)}
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
              label="Livello"
              value={form.level}
              onChange={(e) => updateForm("level", e.target.value)}
              size="small"
            >
              {Object.entries(RESOURCE_LEVEL_LABELS).map(([v, l]) => (
                <MenuItem key={v} value={v}>
                  {l}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Tipo"
              value={form.type}
              onChange={(e) => updateForm("type", e.target.value)}
              size="small"
            >
              {Object.entries(RESOURCE_TYPE_LABELS).map(([v, l]) => (
                <MenuItem key={v} value={v}>
                  {l}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Appartenenza"
              value={form.belonging}
              onChange={(e) => updateForm("belonging", e.target.value)}
              size="small"
            >
              {Object.entries(RESOURCE_BELONGING_LABELS).map(([v, l]) => (
                <MenuItem key={v} value={v}>
                  {l}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Data Ingresso"
              type="date"
              value={form.joinDate}
              onChange={(e) => updateForm("joinDate", e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.isPTF}
                  onChange={(e) => updateForm("isPTF", e.target.checked)}
                />
              }
              label="Part-Time Fisso (PTF)"
            />

            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ gridColumn: "1 / -1", mt: 1, mb: -1 }}
            >
              Parametri economici
            </Typography>
            <TextField
              label="Ore settimanali"
              type="number"
              value={form.weeklyHours}
              onChange={(e) => updateForm("weeklyHours", e.target.value)}
              size="small"
            />
            <TextField
              label="Costo giornaliero"
              type="number"
              value={form.dailyCost}
              onChange={(e) => updateForm("dailyCost", e.target.value)}
              size="small"
            />
            <TextField
              label="Coeff. produttivita"
              type="number"
              value={form.productivityCoeff}
              onChange={(e) => updateForm("productivityCoeff", e.target.value)}
              size="small"
              slotProps={{
                htmlInput: { step: 0.1, min: 0.1, max: 2 },
              }}
            />
            <TextField
              label="Buffer ore sett."
              type="number"
              value={form.weeklyHoursBuffer}
              onChange={(e) => updateForm("weeklyHoursBuffer", e.target.value)}
              size="small"
              helperText="Override buffer BU (vuoto = default)"
            />
            <TextField
              label="Validita dal"
              type="date"
              value={form.validFrom}
              onChange={(e) => updateForm("validFrom", e.target.value)}
              size="small"
              required
              slotProps={{ inputLabel: { shrink: true } }}
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
            disabled={!form.firstName || !form.lastName}
          >
            Salva
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Elimina Risorsa"
        message={`Eliminare ${deleteTarget?.lastName} ${deleteTarget?.firstName}? L'operazione non e reversibile.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {allocTarget && (
        <ResourceAllocationsDialog
          open
          onClose={() => setAllocTarget(null)}
          resourceId={allocTarget.id}
          resourceName={`${allocTarget.lastName} ${allocTarget.firstName}`}
        />
      )}
    </Box>
  );
}
