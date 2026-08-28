"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import PeopleOutlined from "@mui/icons-material/PeopleOutlined";
import AppsOutlined from "@mui/icons-material/AppsOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";

const DRAWER_WIDTH = 220;

const NAV_ITEMS = [
  { label: "Dashboard", path: "/", icon: <DashboardOutlined /> },
  { label: "Risorse", path: "/risorse", icon: <PeopleOutlined /> },
  { label: "Applicativi", path: "/applicativi", icon: <AppsOutlined /> },
  { label: "Contratti", path: "/contratti", icon: <DescriptionOutlined /> },
  { label: "Iniziative", path: "/iniziative", icon: <AssignmentOutlined /> },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            bgcolor: "primary.main",
            color: "white",
            borderRight: "none",
          },
        }}
      >
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              background: "linear-gradient(90deg, #fff 0%, #00B7EC 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            PlanR
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
            Resource Planning
          </Typography>
        </Box>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />
        <List sx={{ px: 1, pt: 1 }}>
          {NAV_ITEMS.map((item) => {
            const active =
              item.path === "/"
                ? pathname === "/"
                : pathname.startsWith(item.path);
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  component={Link}
                  href={item.path}
                  selected={active}
                  sx={{
                    borderRadius: 1,
                    color: "white",
                    "&.Mui-selected": {
                      bgcolor: "rgba(255,255,255,0.15)",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
                    },
                    "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
                  }}
                >
                  <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    sx={{ "& .MuiListItemText-primary": { fontSize: 14 } }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Drawer>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, bgcolor: "#F5F5F5", minHeight: "100vh" }}
      >
        {children}
      </Box>
    </Box>
  );
}
