"use client";

import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "next/link";

interface Allocation {
  id: string;
  startDate: string;
  endDate: string;
  allocationPercentage: number;
  allocatedEffortDays: number;
  lockType: string;
  initiative: {
    id: string;
    issueKey: string;
    title: string;
    status: string;
    application: { name: string };
  };
}

interface ResourceAllocationsDialogProps {
  open: boolean;
  onClose: () => void;
  resourceId: string;
  resourceName: string;
}

export default function ResourceAllocationsDialog({
  open,
  onClose,
  resourceId,
  resourceName,
}: ResourceAllocationsDialogProps) {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !resourceId) return;
    setLoading(true);
    fetch(`/api/allocations?resourceId=${resourceId}`)
      .then((r) => r.json())
      .then((data) => {
        setAllocations(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open, resourceId]);

  const initials = resourceName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Avatar sx={{ bgcolor: "primary.main", width: 32, height: 32, fontSize: 14 }}>
          {initials}
        </Avatar>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {resourceName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Allocazioni attive
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : allocations.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
            Nessuna allocazione attiva.
          </Typography>
        ) : (
          allocations.map((alloc, i) => (
            <Box key={alloc.id}>
              {i > 0 && <Divider sx={{ my: 1 }} />}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", py: 0.5 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                      {alloc.initiative.issueKey}
                    </Typography>
                    <Typography variant="body2" noWrap sx={{ fontSize: 13 }}>
                      {alloc.initiative.title}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {alloc.initiative.application.name}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1.5, mt: 0.5 }}>
                    <Typography variant="caption">
                      {new Date(alloc.startDate).toLocaleDateString("it-IT")} — {new Date(alloc.endDate).toLocaleDateString("it-IT")}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {alloc.allocatedEffortDays} GG
                    </Typography>
                    <Typography variant="caption">
                      {alloc.allocationPercentage}%
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={alloc.lockType === "SOFT" ? "Soft" : "Hard"}
                  size="small"
                  color={alloc.lockType === "SOFT" ? "warning" : "success"}
                  sx={{ ml: 1, mt: 0.5 }}
                />
              </Box>
            </Box>
          ))
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between" }}>
        <Button
          component={Link}
          href="/iniziative"
          size="small"
          onClick={onClose}
        >
          Vai a Iniziative
        </Button>
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
}
