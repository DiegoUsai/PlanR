"use client";

import { useState, useEffect, useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import Avatar from "@mui/material/Avatar";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import {
  RESOURCE_ROLE_LABELS,
} from "@/lib/constants";
import ResourceAllocationsDialog from "@/components/resources/ResourceAllocationsDialog";

const SAT_COLORS = {
  under: "#2196F3",
  optimal: "#4CAF50",
  warning: "#FFC107",
  over: "#F44336",
};

function getSatColor(val: number): string {
  if (val < 75) return SAT_COLORS.under;
  if (val <= 100) return SAT_COLORS.optimal;
  if (val <= 110) return SAT_COLORS.warning;
  return SAT_COLORS.over;
}

function getSatLabel(val: number): string {
  if (val < 75) return "Sotto-utilizzo";
  if (val <= 100) return "Ottimale";
  if (val <= 110) return "Attenzione";
  return "Sovra-allocazione";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
}

const MONTH_NAMES = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

interface WeekAllocation {
  initiativeTitle: string;
  applicationName: string;
  lockType: string;
  hoursInWeek: number;
  allocationId: string;
}

interface WeekCell {
  saturation: number;
  capacity: number;
  allocableCapacity: number;
  allocated: number;
  absenceHours: number;
  allocations: WeekAllocation[];
}

interface ResourceRow {
  resourceId: string;
  resourceName: string;
  role: string;
  level: string;
  type: string;
  weeks: WeekCell[];
}

interface PivotData {
  weeks: { label: string; start: string; end: string }[];
  rows: ResourceRow[];
}

interface DisplayColumn {
  label: string;
  key: string;
}

interface DisplayCell {
  saturation: number;
  capacity: number;
  allocableCapacity: number;
  allocated: number;
  absenceHours: number;
  allocations: WeekAllocation[];
}

type Zoom = "giorni" | "settimane" | "mesi";

function aggregateToMonths(
  weeks: PivotData["weeks"],
  rowWeeks: WeekCell[]
): { columns: DisplayColumn[]; cells: DisplayCell[] } {
  const monthMap = new Map<string, { col: DisplayColumn; cells: WeekCell[] }>();

  weeks.forEach((w, i) => {
    const d = new Date(w.start);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, {
        col: { label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`, key },
        cells: [],
      });
    }
    monthMap.get(key)!.cells.push(rowWeeks[i]);
  });

  const columns: DisplayColumn[] = [];
  const cells: DisplayCell[] = [];

  for (const { col, cells: wCells } of monthMap.values()) {
    columns.push(col);
    const totalCapacity = wCells.reduce((s, c) => s + c.capacity, 0);
    const totalAllocable = wCells.reduce((s, c) => s + c.allocableCapacity, 0);
    const totalAllocated = wCells.reduce((s, c) => s + c.allocated, 0);
    const totalAbsence = wCells.reduce((s, c) => s + c.absenceHours, 0);

    const mergedAllocs = new Map<string, WeekAllocation>();
    for (const c of wCells) {
      for (const a of c.allocations) {
        const existing = mergedAllocs.get(a.allocationId);
        if (existing) {
          existing.hoursInWeek = Math.round((existing.hoursInWeek + a.hoursInWeek) * 10) / 10;
        } else {
          mergedAllocs.set(a.allocationId, { ...a });
        }
      }
    }

    cells.push({
      saturation: totalCapacity > 0 ? Math.round((totalAllocated / totalCapacity) * 100) : 0,
      capacity: Math.round(totalCapacity * 10) / 10,
      allocableCapacity: Math.round(totalAllocable * 10) / 10,
      allocated: Math.round(totalAllocated * 10) / 10,
      absenceHours: Math.round(totalAbsence * 10) / 10,
      allocations: [...mergedAllocs.values()],
    });
  }

  return { columns, cells };
}

export default function ResourcePlanPage() {
  const [data, setData] = useState<PivotData | null>(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [zoom, setZoom] = useState<Zoom>("settimane");
  const [allocTarget, setAllocTarget] = useState<{ id: string; name: string } | null>(null);
  const [popover, setPopover] = useState<{
    anchorEl: HTMLElement;
    cell: DisplayCell;
    resourceName: string;
    periodLabel: string;
  } | null>(null);

  useEffect(() => {
    setData(null);
    const url = zoom === "giorni" ? "/api/resource-plan?zoom=giorni" : "/api/resource-plan";
    fetch(url)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [zoom]);

  const monthColumns = useMemo(() => {
    if (!data) return null;
    const { columns } = aggregateToMonths(data.weeks, data.rows[0]?.weeks || []);
    return columns;
  }, [data]);

  const displayColumns: DisplayColumn[] = useMemo(() => {
    if (!data) return [];
    if (zoom === "mesi") return monthColumns || [];
    return data.weeks.map((w) => ({ label: w.label, key: w.start }));
  }, [data, zoom, monthColumns]);

  const filteredRows = data?.rows.filter((r) => {
    if (roleFilter && r.role !== roleFilter) return false;
    return true;
  }) || [];

  const displayCellsMap = useMemo(() => {
    if (!data) return new Map<string, DisplayCell[]>();
    const map = new Map<string, DisplayCell[]>();
    for (const row of filteredRows) {
      if (zoom === "mesi") {
        const { cells } = aggregateToMonths(data.weeks, row.weeks);
        map.set(row.resourceId, cells);
      } else {
        map.set(row.resourceId, row.weeks);
      }
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, zoom, filteredRows.length, roleFilter]);

  if (!data) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
          Resource Plan
        </Typography>
        <Typography color="text.secondary">Caricamento...</Typography>
      </Box>
    );
  }

  const roles = [...new Set(data.rows.map((r) => r.role))];

  const colWidth = zoom === "giorni" ? 70 : zoom === "settimane" ? 60 : 80;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Resource Plan
        </Typography>
        <ToggleButtonGroup
          value={zoom}
          exclusive
          onChange={(_, v) => v && setZoom(v)}
          size="small"
        >
          <ToggleButton value="giorni">Giorni</ToggleButton>
          <ToggleButton value="settimane">Settimane</ToggleButton>
          <ToggleButton value="mesi">Mesi</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Filters */}
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Ruolo</InputLabel>
          <Select
            value={roleFilter}
            label="Ruolo"
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <MenuItem value="">Tutti</MenuItem>
            {roles.map((r) => (
              <MenuItem key={r} value={r}>
                {RESOURCE_ROLE_LABELS[r] || r}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {/* Legend */}
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", ml: "auto" }}>
          {[
            { color: "#BDBDBD", label: "Assenze", hatched: true },
            { color: SAT_COLORS.under, label: "< 75%" },
            { color: SAT_COLORS.optimal, label: "75-100%" },
            { color: SAT_COLORS.warning, label: "101-110%" },
            { color: SAT_COLORS.over, label: "> 110%" },
          ].map((item) => (
            <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{
                width: 12, height: 12, borderRadius: 0.5, bgcolor: item.color,
                ...("hatched" in item && item.hatched ? {
                  backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)",
                } : {}),
              }} />
              <Typography variant="caption">{item.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Pivot grid */}
      <Card elevation={0}>
        <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
          <Box sx={{ overflowX: "auto" }}>
            <Box sx={{ minWidth: 900 }}>
              {/* Header */}
              <Box sx={{ display: "flex", borderBottom: 1, borderColor: "divider", pb: 0.5, mb: 0.5 }}>
                <Box sx={{ width: 220, flexShrink: 0, px: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Risorsa
                  </Typography>
                </Box>
                <Box sx={{ width: 80, flexShrink: 0, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Ruolo
                  </Typography>
                </Box>
                {displayColumns.map((col) => (
                  <Box key={col.key} sx={{ width: colWidth, textAlign: "center", flexShrink: 0 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {col.label}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Rows */}
              {filteredRows.length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    Nessuna risorsa trovata con i filtri selezionati.
                  </Typography>
                </Box>
              ) : (
                filteredRows.map((row) => {
                  const cells = displayCellsMap.get(row.resourceId) || [];
                  return (
                    <Box
                      key={row.resourceId}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        py: 0.25,
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <Box
                        onClick={() => setAllocTarget({ id: row.resourceId, name: row.resourceName })}
                        sx={{
                          width: 220,
                          flexShrink: 0,
                          px: 1,
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          cursor: "pointer",
                          borderRadius: 1,
                          "&:hover": { bgcolor: "action.selected" },
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 26,
                            height: 26,
                            fontSize: 11,
                            fontWeight: 600,
                            bgcolor: "primary.main",
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(row.resourceName)}
                        </Avatar>
                        <Typography variant="body2" noWrap sx={{ fontSize: 13, color: "primary.main" }}>
                          {row.resourceName}
                        </Typography>
                      </Box>
                      <Box sx={{ width: 80, flexShrink: 0, textAlign: "center" }}>
                        <Typography variant="caption" color="text.secondary">
                          {RESOURCE_ROLE_LABELS[row.role]?.slice(0, 5) || row.role}
                        </Typography>
                      </Box>
                      {cells.map((cell, i) => (
                        <Tooltip
                          key={i}
                          title={
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                {row.resourceName} — {displayColumns[i]?.label}
                              </Typography>
                              <br />
                              <Typography variant="caption">
                                Saturazione: {cell.saturation}% ({getSatLabel(cell.saturation)})
                              </Typography>
                              <br />
                              <Typography variant="caption">
                                Capacita: {cell.capacity}h | Allocato: {cell.allocated}h
                              </Typography>
                              {cell.absenceHours > 0 && (
                                <>
                                  <br />
                                  <Typography variant="caption">
                                    Assenze: {cell.absenceHours}h
                                  </Typography>
                                </>
                              )}
                              {cell.allocations.length > 0 && (
                                <>
                                  <br />
                                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                    Click per dettaglio
                                  </Typography>
                                </>
                              )}
                            </Box>
                          }
                          arrow
                        >
                          <Box
                            onClick={(e) => {
                              if (cell.allocations.length > 0) {
                                setPopover({
                                  anchorEl: e.currentTarget,
                                  cell,
                                  resourceName: row.resourceName,
                                  periodLabel: displayColumns[i]?.label || "",
                                });
                              }
                            }}
                            sx={{
                              width: colWidth,
                              height: 28,
                              flexShrink: 0,
                              mx: 0.25,
                              borderRadius: 0.5,
                              bgcolor: "#F5F5F5",
                              display: "flex",
                              overflow: "hidden",
                              cursor: cell.allocations.length > 0 ? "pointer" : "default",
                              transition: "transform 0.1s",
                              border: "1px solid",
                              borderColor: "divider",
                              "&:hover": {
                                transform:
                                  cell.allocations.length > 0 ? "scale(1.1)" : "none",
                              },
                            }}
                          >
                            {(() => {
                              const total = cell.allocableCapacity || 1;
                              const absPct = Math.min((cell.absenceHours / total) * 100, 100);
                              const allocPct = Math.min((cell.allocated / total) * 100, 100 - absPct);
                              return (
                                <>
                                  {absPct > 0 && (
                                    <Box
                                      sx={{
                                        width: `${absPct}%`,
                                        height: "100%",
                                        bgcolor: "#BDBDBD",
                                        backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)",
                                      }}
                                    />
                                  )}
                                  {allocPct > 0 && (
                                    <Box
                                      sx={{
                                        width: `${allocPct}%`,
                                        height: "100%",
                                        bgcolor: getSatColor(cell.saturation),
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      {allocPct > 20 && (
                                        <Typography
                                          variant="caption"
                                          sx={{ fontSize: 9, color: "white", fontWeight: 600 }}
                                        >
                                          {cell.saturation}%
                                        </Typography>
                                      )}
                                    </Box>
                                  )}
                                </>
                              );
                            })()}
                          </Box>
                        </Tooltip>
                      ))}
                    </Box>
                  );
                })
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Allocation detail popover */}
      <Popover
        open={!!popover}
        anchorEl={popover?.anchorEl}
        onClose={() => setPopover(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
      >
        {popover && (
          <Box sx={{ p: 2, maxWidth: 400 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {popover.resourceName} — {zoom === "giorni" ? "" : zoom === "settimane" ? "Settimana " : ""}{popover.periodLabel}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
              <Chip
                label={`${popover.cell.saturation}%`}
                size="small"
                sx={{
                  bgcolor: getSatColor(popover.cell.saturation),
                  color: "white",
                }}
              />
              <Typography variant="caption" sx={{ alignSelf: "center" }}>
                {popover.cell.allocated}h / {popover.cell.capacity}h
              </Typography>
            </Box>
            {popover.cell.allocations.map((alloc, i) => (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  py: 0.5,
                  borderTop: i > 0 ? 1 : 0,
                  borderColor: "divider",
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontSize: 13 }}>
                    {alloc.initiativeTitle}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {alloc.applicationName}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                  <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                    {alloc.hoursInWeek}h
                  </Typography>
                  <Chip
                    label={alloc.lockType === "SOFT" ? "S" : "H"}
                    size="small"
                    color={alloc.lockType === "SOFT" ? "warning" : "success"}
                    sx={{ minWidth: 24, height: 20, fontSize: 10 }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Popover>

      {allocTarget && (
        <ResourceAllocationsDialog
          open
          onClose={() => setAllocTarget(null)}
          resourceId={allocTarget.id}
          resourceName={allocTarget.name}
        />
      )}
    </Box>
  );
}
