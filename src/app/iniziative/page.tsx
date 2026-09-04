"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Checkbox from "@mui/material/Checkbox";
import ListItemText from "@mui/material/ListItemText";
import OutlinedInput from "@mui/material/OutlinedInput";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import InputAdornment from "@mui/material/InputAdornment";
import Search from "@mui/icons-material/Search";
import GroupIcon from "@mui/icons-material/Group";
import CloseIcon from "@mui/icons-material/Close";
import FilterAltOff from "@mui/icons-material/FilterAltOff";
import dayjs from "dayjs";
import {
  INITIATIVE_STATUS_LABELS,
  INITIATIVE_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from "@/lib/constants";
import AllocationManager from "@/components/initiatives/AllocationManager";

interface Initiative {
  id: string;
  issueKey: string;
  title: string;
  description: string | null;
  tipologia: string | null;
  priority: string;
  statoJira: string;
  status: string;
  estimatedDays: string | null;
  plannedStartDate: string | null;
  desiredEndDate: string | null;
  richiedente: string | null;
  dataRichiesta: string | null;
  tenant: string | null;
  economicValue: string | null;
  corsiaUrgenza: string | null;
  engineeringExcellence: string | null;
  sizingSviluppo: string | null;
  polaritaSizingSviluppo: string | null;
  sizingAnalisi: string | null;
  polaritaSizingAnalisi: string | null;
  affidabilitaStima: string | null;
  analisiPtf: string | null;
  figureNecessarie: string | null;
  vincoliCriticita: string | null;
  inRiusoDa: string | null;
  notes: string | null;
  applicationId: string;
  contractId: string | null;
  application: { id: string; name: string };
  contract: { id: string; identifier: string } | null;
  modules: Array<{ id: string; name: string }>;
  _count: { allocations: number };
}

interface DetailInitiative extends Omit<Initiative, "_count"> {
  allocations: Array<{
    id: string;
    allocatedEffortDays: string;
    lockType: string;
    startDate: string;
    endDate: string;
    roleInInitiative: string | null;
    resource: { id: string; firstName: string; lastName: string };
  }>;
}

export default function IniziativePage() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);
  const [allocTarget, setAllocTarget] = useState<Initiative | null>(null);
  const [search, setSearch] = useState("");

  // Multi-select filters
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterPriority, setFilterPriority] = useState<string[]>([]);
  const [filterApp, setFilterApp] = useState<string[]>([]);
  const [filterContract, setFilterContract] = useState<string[]>([]);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<DetailInitiative | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  // Dynamic filter options
  const appOptions = useMemo(() => {
    const apps = new Map<string, string>();
    for (const i of initiatives) {
      if (i.application) apps.set(i.application.id, i.application.name);
    }
    return [...apps.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [initiatives]);

  const contractOptions = useMemo(() => {
    const contracts = new Map<string, string>();
    contracts.set("__none__", "(senza contratto)");
    for (const i of initiatives) {
      if (i.contract) contracts.set(i.contract.id, i.contract.identifier);
    }
    return [...contracts.entries()].sort((a, b) => {
      if (a[0] === "__none__") return -1;
      if (b[0] === "__none__") return 1;
      return a[1].localeCompare(b[1]);
    });
  }, [initiatives]);

  const hasActiveFilters = filterStatus.length > 0 || filterPriority.length > 0 || filterApp.length > 0 || filterContract.length > 0;

  const filteredInitiatives = useMemo(() => {
    let result = initiatives;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.issueKey.toLowerCase().includes(q) ||
          i.application?.name.toLowerCase().includes(q) ||
          i.contract?.identifier.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.richiedente?.toLowerCase().includes(q)
      );
    }
    if (filterStatus.length > 0)
      result = result.filter((i) => filterStatus.includes(i.status));
    if (filterPriority.length > 0)
      result = result.filter((i) => filterPriority.includes(i.priority));
    if (filterApp.length > 0)
      result = result.filter((i) => filterApp.includes(i.applicationId));
    if (filterContract.length > 0) {
      result = result.filter((i) => {
        if (filterContract.includes("__none__") && !i.contractId) return true;
        return i.contractId ? filterContract.includes(i.contractId) : false;
      });
    }
    return result;
  }, [initiatives, search, filterStatus, filterPriority, filterApp, filterContract]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/initiatives");
    setInitiatives(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openDrawer = async (row: Initiative) => {
    setDrawerOpen(true);
    setDetailLoading(true);
    setDetail(null);
    const res = await fetch(`/api/initiatives/${row.id}`);
    const data = await res.json();
    setDetail(data);
    setNotesValue(data.notes || "");
    setDetailLoading(false);
  };

  const saveNotes = async () => {
    if (!detail) return;
    setNotesSaving(true);
    await fetch(`/api/initiatives/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesValue || null }),
    });
    setNotesSaving(false);
    fetchData();
  };

  const clearFilters = () => {
    setFilterStatus([]);
    setFilterPriority([]);
    setFilterApp([]);
    setFilterContract([]);
  };

  const columns: GridColDef[] = [
    { field: "issueKey", headerName: "Issue", width: 110 },
    { field: "title", headerName: "Titolo", flex: 1, minWidth: 200 },
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
      field: "estimatedDays",
      headerName: "Stima (gg)",
      width: 100,
      valueFormatter: (value: string | null) => (value ? value : "-"),
    },
    {
      field: "desiredEndDate",
      headerName: "Fine Desiderata",
      width: 130,
      valueFormatter: (value: string | null) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "-",
    },
    {
      field: "richiedente",
      headerName: "Richiedente",
      width: 140,
      valueFormatter: (value: string | null) => value || "-",
    },
    {
      field: "notes",
      headerName: "Note",
      width: 120,
      sortable: false,
      renderCell: ({ value }) => (
        <Typography
          variant="caption"
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value || ""}
        </Typography>
      ),
    },
    {
      field: "actions",
      headerName: "",
      width: 60,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: ({ row }) => (
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
        <Typography variant="body2" color="text.secondary">
          {filteredInitiatives.length} di {initiatives.length} iniziative
        </Typography>
      </Box>

      {/* Filters row */}
      <Box sx={{ display: "flex", gap: 1.5, mb: 1.5, alignItems: "center", flexWrap: "wrap" }}>
        <TextField
          size="small"
          placeholder="Cerca..."
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
          sx={{ minWidth: 180 }}
        />

        <MultiSelectFilter
          label="Stato"
          value={filterStatus}
          onChange={setFilterStatus}
          options={Object.entries(INITIATIVE_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
        />
        <MultiSelectFilter
          label="Priorita"
          value={filterPriority}
          onChange={setFilterPriority}
          options={Object.entries(PRIORITY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
        />
        <MultiSelectFilter
          label="Applicativo"
          value={filterApp}
          onChange={setFilterApp}
          options={appOptions.map(([v, l]) => ({ value: v, label: l }))}
        />
        <MultiSelectFilter
          label="Contratto"
          value={filterContract}
          onChange={setFilterContract}
          options={contractOptions.map(([v, l]) => ({ value: v, label: l }))}
        />

        {hasActiveFilters && (
          <Button
            size="small"
            startIcon={<FilterAltOff />}
            onClick={clearFilters}
            sx={{ whiteSpace: "nowrap" }}
          >
            Azzera filtri
          </Button>
        )}
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
          onRowClick={(params) => openDrawer(params.row as Initiative)}
          sx={{
            height: "100%",
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            "& .MuiDataGrid-row": { cursor: "pointer" },
          }}
        />
      </Box>

      {/* Detail Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: 520 } } }}
      >
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Dettaglio Iniziativa
            </Typography>
            <IconButton size="small" onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          {detailLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          )}

          {detail && <InitiativeDetail detail={detail} notesValue={notesValue} setNotesValue={setNotesValue} saveNotes={saveNotes} notesSaving={notesSaving} />}
        </Box>
      </Drawer>

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

// --- Multi-Select Filter Component ---

function MultiSelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const displayLabel = value.length > 0 ? `${label} (${value.length})` : label;

  return (
    <FormControl size="small" sx={{ minWidth: 140 }}>
      <InputLabel>{displayLabel}</InputLabel>
      <Select
        multiple
        value={value}
        onChange={(e) => onChange(e.target.value as string[])}
        input={<OutlinedInput label={displayLabel} />}
        renderValue={(selected) =>
          (selected as string[])
            .map((v) => options.find((o) => o.value === v)?.label || v)
            .join(", ")
        }
        MenuProps={{ slotProps: { paper: { sx: { maxHeight: 300 } } } }}
      >
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value} dense>
            <Checkbox checked={value.includes(opt.value)} size="small" />
            <ListItemText primary={opt.label} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

// --- Initiative Detail Drawer ---

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <Box sx={{ display: "flex", gap: 1, py: 0.3 }}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 140, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="caption">{value}</Typography>
    </Box>
  );
}

function InitiativeDetail({
  detail,
  notesValue,
  setNotesValue,
  saveNotes,
  notesSaving,
}: {
  detail: DetailInitiative;
  notesValue: string;
  setNotesValue: (v: string) => void;
  saveNotes: () => void;
  notesSaving: boolean;
}) {
  const totalAllocated = detail.allocations.reduce(
    (sum, a) => sum + Number(a.allocatedEffortDays),
    0
  );
  const estimated = detail.estimatedDays ? Number(detail.estimatedDays) : null;
  const remaining = estimated !== null ? estimated - totalAllocated : null;

  return (
    <Box>
      {/* Intestazione */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">{detail.issueKey}</Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>{detail.title}</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Chip
            label={INITIATIVE_STATUS_LABELS[detail.status] || detail.status}
            size="small"
            color={INITIATIVE_STATUS_COLORS[detail.status] || "default"}
          />
          <Chip
            label={PRIORITY_LABELS[detail.priority] || detail.priority}
            size="small"
            color={PRIORITY_COLORS[detail.priority] || "default"}
          />
        </Box>
      </Box>

      <Divider sx={{ mb: 1.5 }} />

      {/* Dati Jira */}
      <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>Dati Jira</Typography>
      <DetailRow label="Richiedente" value={detail.richiedente} />
      <DetailRow label="Data richiesta" value={detail.dataRichiesta ? dayjs(detail.dataRichiesta).format("DD/MM/YYYY") : null} />
      <DetailRow label="Tenant" value={detail.tenant} />
      <DetailRow label="Tipologia" value={detail.tipologia} />
      <DetailRow label="Valore economico" value={detail.economicValue} />
      <DetailRow label="Corsia urgenza" value={detail.corsiaUrgenza} />
      <DetailRow label="Engineering Excellence" value={detail.engineeringExcellence} />
      <DetailRow label="Stato Jira" value={detail.statoJira} />

      <Divider sx={{ my: 1.5 }} />

      {/* Sizing */}
      <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>Sizing</Typography>
      <DetailRow label="Sizing Sviluppo" value={detail.sizingSviluppo ? `${detail.sizingSviluppo}${detail.polaritaSizingSviluppo ? ` (${detail.polaritaSizingSviluppo})` : ""}` : null} />
      <DetailRow label="Sizing Analisi" value={detail.sizingAnalisi ? `${detail.sizingAnalisi}${detail.polaritaSizingAnalisi ? ` (${detail.polaritaSizingAnalisi})` : ""}` : null} />
      <DetailRow label="Stima (gg)" value={estimated !== null ? String(estimated) : null} />
      <DetailRow label="Affidabilita stima" value={detail.affidabilitaStima} />
      <DetailRow label="Analisi PTF" value={detail.analisiPtf} />
      <DetailRow label="Figure necessarie" value={detail.figureNecessarie} />
      <DetailRow label="Vincoli/Criticita" value={detail.vincoliCriticita} />

      <Divider sx={{ my: 1.5 }} />

      {/* Classificazione */}
      <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>Classificazione</Typography>
      <DetailRow label="Applicativo" value={detail.application?.name} />
      <DetailRow label="Contratto" value={detail.contract?.identifier} />
      <DetailRow label="Moduli" value={detail.modules.length > 0 ? detail.modules.map((m) => m.name).join(", ") : null} />
      <DetailRow label="In riuso da" value={detail.inRiusoDa} />

      <Divider sx={{ my: 1.5 }} />

      {/* Date */}
      <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>Date</Typography>
      <DetailRow label="Fine desiderata" value={detail.desiredEndDate ? dayjs(detail.desiredEndDate).format("DD/MM/YYYY") : null} />

      <Divider sx={{ my: 1.5 }} />

      {/* Allocazioni */}
      <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
        Allocazioni ({detail.allocations.length})
      </Typography>
      {detail.allocations.length > 0 ? (
        <Box sx={{ mb: 1 }}>
          {detail.allocations.map((a) => (
            <Box
              key={a.id}
              sx={{
                display: "flex",
                gap: 1,
                py: 0.5,
                px: 1,
                bgcolor: "action.hover",
                borderRadius: 1,
                mb: 0.5,
                alignItems: "center",
              }}
            >
              <Typography variant="caption" sx={{ flex: 1, fontWeight: 500 }}>
                {a.resource.lastName} {a.resource.firstName}
              </Typography>
              {a.roleInInitiative && (
                <Chip label={a.roleInInitiative} size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
              )}
              <Typography variant="caption">{Number(a.allocatedEffortDays)} gg</Typography>
              <Typography variant="caption" color="text.secondary">
                {dayjs(a.startDate).format("DD/MM")} - {dayjs(a.endDate).format("DD/MM/YY")}
              </Typography>
              <Chip
                label={a.lockType === "HARD" ? "Hard" : "Soft"}
                size="small"
                color={a.lockType === "HARD" ? "primary" : "default"}
                sx={{ height: 20, fontSize: 10 }}
              />
            </Box>
          ))}
          <Box sx={{ display: "flex", gap: 2, mt: 1, px: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Allocati: {totalAllocated.toFixed(1)} gg
            </Typography>
            {estimated !== null && (
              <>
                <Typography variant="caption" color="text.secondary">
                  Stima: {estimated} gg
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 600, color: remaining !== null && remaining < 0 ? "error.main" : "success.main" }}
                >
                  Residui: {remaining !== null ? remaining.toFixed(1) : "-"} gg
                </Typography>
              </>
            )}
          </Box>
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
          Nessuna allocazione
        </Typography>
      )}

      <Divider sx={{ my: 1.5 }} />

      {/* Note (editable) */}
      <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>Note</Typography>
      <TextField
        size="small"
        multiline
        rows={3}
        fullWidth
        value={notesValue}
        onChange={(e) => setNotesValue(e.target.value)}
        sx={{ mb: 1 }}
      />
      <Button
        size="small"
        variant="contained"
        onClick={saveNotes}
        disabled={notesSaving || notesValue === (detail.notes || "")}
        startIcon={notesSaving ? <CircularProgress size={14} /> : undefined}
      >
        Salva note
      </Button>

      {/* Descrizione */}
      {detail.description && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>Descrizione</Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", color: "text.secondary" }}>
            {detail.description}
          </Typography>
        </>
      )}
    </Box>
  );
}
