"use client";

import { useState, useEffect } from "react";
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
import {
  RESOURCE_ROLE_LABELS,
  RESOURCE_POOL_LABELS,
} from "@/lib/constants";

const SAT_COLORS = {
  under: "#2196F3",
  optimal: "#4CAF50",
  warning: "#FFC107",
  over: "#F44336",
};

function getSatColor(val: number): string {
  if (val < 75) return SAT_COLORS.under;
  if (val <= 85) return SAT_COLORS.optimal;
  if (val <= 90) return SAT_COLORS.warning;
  return SAT_COLORS.over;
}

function getSatLabel(val: number): string {
  if (val < 75) return "Sotto-utilizzo";
  if (val <= 85) return "Ottimale";
  if (val <= 90) return "Attenzione";
  return "Sovra-allocazione";
}

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
  pool: string;
  weeks: WeekCell[];
}

interface PivotData {
  weeks: { label: string; start: string; end: string }[];
  rows: ResourceRow[];
}

export default function ResourcePlanPage() {
  const [data, setData] = useState<PivotData | null>(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [poolFilter, setPoolFilter] = useState("");
  const [popover, setPopover] = useState<{
    anchorEl: HTMLElement;
    cell: WeekCell;
    resourceName: string;
    weekLabel: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/resource-plan")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

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

  const filteredRows = data.rows.filter((r) => {
    if (roleFilter && r.role !== roleFilter) return false;
    if (poolFilter && r.pool !== poolFilter) return false;
    return true;
  });

  const roles = [...new Set(data.rows.map((r) => r.role))];
  const pools = [...new Set(data.rows.map((r) => r.pool))];

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Resource Plan
      </Typography>

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
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Pool</InputLabel>
          <Select
            value={poolFilter}
            label="Pool"
            onChange={(e) => setPoolFilter(e.target.value)}
          >
            <MenuItem value="">Tutti</MenuItem>
            {pools.map((p) => (
              <MenuItem key={p} value={p}>
                {RESOURCE_POOL_LABELS[p] || p}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Legend */}
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", ml: "auto" }}>
          {[
            { color: SAT_COLORS.under, label: "< 75%" },
            { color: SAT_COLORS.optimal, label: "75-85%" },
            { color: SAT_COLORS.warning, label: "86-90%" },
            { color: SAT_COLORS.over, label: "> 90%" },
          ].map((item) => (
            <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: item.color }} />
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
                <Box sx={{ width: 180, flexShrink: 0, px: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Risorsa
                  </Typography>
                </Box>
                <Box sx={{ width: 80, flexShrink: 0, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Ruolo
                  </Typography>
                </Box>
                {data.weeks.map((w) => (
                  <Box key={w.label} sx={{ width: 60, textAlign: "center", flexShrink: 0 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {w.label}
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
                filteredRows.map((row) => (
                  <Box
                    key={row.resourceId}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      py: 0.25,
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Box sx={{ width: 180, flexShrink: 0, px: 1 }}>
                      <Typography variant="body2" noWrap sx={{ fontSize: 13 }}>
                        {row.resourceName}
                      </Typography>
                    </Box>
                    <Box sx={{ width: 80, flexShrink: 0, textAlign: "center" }}>
                      <Typography variant="caption" color="text.secondary">
                        {RESOURCE_ROLE_LABELS[row.role]?.slice(0, 5) || row.role}
                      </Typography>
                    </Box>
                    {row.weeks.map((cell, i) => (
                      <Tooltip
                        key={i}
                        title={
                          <Box>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                              {row.resourceName} — {data.weeks[i].label}
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
                                weekLabel: data.weeks[i].label,
                              });
                            }
                          }}
                          sx={{
                            width: 60,
                            height: 28,
                            flexShrink: 0,
                            mx: 0.25,
                            borderRadius: 0.5,
                            bgcolor: getSatColor(cell.saturation),
                            opacity:
                              cell.saturation === 0
                                ? 0.1
                                : 0.25 + (Math.min(cell.saturation, 120) / 120) * 0.75,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: cell.allocations.length > 0 ? "pointer" : "default",
                            transition: "transform 0.1s",
                            "&:hover": {
                              transform:
                                cell.allocations.length > 0 ? "scale(1.1)" : "none",
                            },
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ fontSize: 10, color: "white", fontWeight: 600 }}
                          >
                            {cell.saturation}
                          </Typography>
                        </Box>
                      </Tooltip>
                    ))}
                  </Box>
                ))
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
              {popover.resourceName} — Settimana {popover.weekLabel}
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
    </Box>
  );
}
