import { useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Stack,
  Card,
  CardContent,
  Button,
  Chip,
  useTheme,
  LinearProgress,
} from "@mui/material";
import { useList, useGo } from "@refinedev/core";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import PendingRoundedIcon from "@mui/icons-material/PendingRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";

interface Company {
  id: number;
  name: string;
  site_slug?: string;
  site_created?: boolean;
  site_environment?: string;
  created_at?: string;
}

interface Invitation {
  id: number;
  invite_status?: string;
  nda_signed?: boolean;
}

export const Home = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const go = useGo();

  const coverBg = isDark
    ? "linear-gradient(135deg, #002A3C 0%, #004369 55%, #056A8F 100%)"
    : "linear-gradient(135deg, #dce9f5 0%, #5ab4f0 60%, #2b97ff 100%)";

  const { result: companiesResult, query: companiesQuery } = useList<Company>({
    resource: "companies",
    pagination: { pageSize: 5 },
    sorters: [{ field: "id", order: "desc" }],
  });

  // Single query for all invitations — compute all counts client-side to avoid
  // duplicate notification keys from multiple useList calls on the same resource.
  const { result: invitesResult } = useList<Invitation>({
    resource: "invitations",
    pagination: { mode: "off" },
  });

  const companies = companiesResult?.data ?? [];
  const totalCompanies = companiesResult?.total ?? 0;
  const allInvitations = invitesResult?.data ?? [];

  const { totalInvites, totalPending, totalNda } = useMemo(() => ({
    totalInvites: allInvitations.length,
    totalPending: allInvitations.filter(
      (i) => !i.invite_status || i.invite_status === "pending"
    ).length,
    totalNda: allInvitations.filter((i) => i.nda_signed).length,
  }), [allInvitations]);

  const stats = [
    {
      label: "Companies",
      value: totalCompanies,
      icon: <BusinessRoundedIcon />,
      color: "#1976d2",
      bg: "#e3f0fb",
    },
    {
      label: "Total Users",
      value: totalInvites,
      icon: <GroupRoundedIcon />,
      color: "#388e3c",
      bg: "#e6f4ef",
    },
    {
      label: "Pending Invitations",
      value: totalPending,
      icon: <PendingRoundedIcon />,
      color: "#f57c00",
      bg: "#fff8e1",
    },
    {
      label: "NDA Signed",
      value: totalNda,
      icon: <CheckCircleRoundedIcon />,
      color: "#008751",
      bg: "#e6f4ef",
    },
  ];

  return (
    <Container maxWidth={false} disableGutters>
      {/* Hero */}
      <Box
        sx={{
          background: coverBg,
          px: { xs: 4, md: 8 },
          py: { xs: 5, md: 7 },
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.18) 0%, transparent 55%)",
            pointerEvents: "none",
          },
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: "auto", zIndex: 1, position: "relative" }}>
          <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography
                sx={{
                  fontFamily: "'Quicksand', sans-serif",
                  fontWeight: 300,
                  color: "#fff",
                  fontSize: { xs: "2rem", md: "2.5rem" },
                  lineHeight: 1.15,
                  letterSpacing: "-0.01em",
                }}
              >
                Hackathon Admin
              </Typography>
              <Typography
                sx={{
                  color: "rgba(255,255,255,0.85)",
                  fontSize: "0.9375rem",
                  mt: 0.75,
                }}
              >
                Manage companies, sites, and user onboarding
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => go({ to: "/companies" })}
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.4)",
                backdropFilter: "blur(8px)",
                flexShrink: 0,
                "&:hover": { bgcolor: "rgba(255,255,255,0.32)" },
              }}
            >
              Add Company
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 4 }, py: 4 }}>
        {/* Stats */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
            gap: 2,
            mb: 4,
          }}
        >
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {s.label}
                    </Typography>
                    <Typography variant="h3" sx={{ mt: 0.5, lineHeight: 1 }}>
                      {s.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1.5,
                      bgcolor: s.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: s.color,
                      flexShrink: 0,
                    }}
                  >
                    {s.icon}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Recent companies */}
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6">Recent Companies</Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 14 }} />}
                onClick={() => go({ to: "/companies" })}
              >
                View all
              </Button>
            </Stack>

            {companiesQuery.isLoading && <LinearProgress />}

            {!companiesQuery.isLoading && companies.length === 0 && (
              <Box sx={{ textAlign: "center", py: 5, color: "text.disabled" }}>
                <BusinessRoundedIcon sx={{ fontSize: 48, mb: 1.5, display: "block", mx: "auto" }} />
                <Typography variant="h5" color="text.secondary" sx={{ mb: 0.75 }}>
                  No companies yet
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Get started by adding your first company
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddRoundedIcon />}
                  onClick={() => go({ to: "/companies" })}
                >
                  Add Company
                </Button>
              </Box>
            )}

            {companies.length > 0 && (
              <Stack spacing={0}>
                {companies.map((c, idx) => (
                  <Box key={c.id}>
                    {idx > 0 && <Box sx={{ borderTop: 1, borderColor: "divider" }} />}
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{
                        py: 1.5,
                        px: 1,
                        borderRadius: 1,
                        cursor: "pointer",
                        "&:hover": { bgcolor: "grey.50" },
                      }}
                      onClick={() => go({ to: `/companies/${c.id}` })}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 1,
                            bgcolor: "primary.50",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <BusinessRoundedIcon sx={{ fontSize: 20, color: "primary.main" }} />
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {c.name}
                          </Typography>
                          {c.site_slug && (
                            <Typography
                              variant="caption"
                              sx={{ fontFamily: "monospace", color: "text.secondary" }}
                            >
                              {c.site_slug}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={c.site_created ? "Active" : "Pending"}
                          color={c.site_created ? "info" : "warning"}
                          size="small"
                        />
                        <ArrowForwardRoundedIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};
