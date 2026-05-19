import React, { useState, useMemo, useRef } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Chip,
  Card,
  CardContent,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tooltip,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TablePagination,
  LinearProgress,
  Breadcrumbs,
  Link,
  Paper,
} from "@mui/material";
import { useOne, useList, useCreate, useDelete, useUpdate, useNotification, useGo } from "@refinedev/core";
import { useParams } from "react-router";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PendingRoundedIcon from "@mui/icons-material/PendingRounded";
import { inviteUserToSite, listTaruviInvitations } from "../../services/taruviCloudApi";

interface Company {
  id: string;
  name: string;
  description?: string;
  org_slug: string;
  org_id: number;
  site_slug?: string;
  site_environment?: string;
  site_created?: boolean;
  created_at?: string;
}

interface Invitation {
  id: string;
  company_id: string;
  email: string;
  site_slug: string;
  invite_status?: string;
  nda_signed?: boolean;
  nda_signed_at?: string;
  invited_at?: string;
}

function StatusChip({ status }: { status?: string }) {
  const s = (status ?? "pending").toLowerCase();
  if (s === "accepted" || s === "active") return <Chip label="Accepted" color="success" size="small" />;
  if (s === "expired") return <Chip label="Expired" color="error" size="small" />;
  return <Chip label="Pending" color="warning" size="small" />;
}

function parseEmailsFromCsv(content: string): string[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const emails: string[] = [];
  for (const line of lines) {
    const cols = line.split(",").map((c) => c.trim().replace(/^["'](.*)["']$/, "$1"));
    const emailCol = cols.find((c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c));
    if (emailCol) emails.push(emailCol.toLowerCase());
  }
  return [...new Set(emails)];
}

export const CompanyShow: React.FC = () => {
  const go = useGo();
  const { open: notify } = useNotification();

  // Use the raw UUID string from the URL — no Number() conversion, no NaN.
  const { id: companyId = "" } = useParams<{ id: string }>();

  const { result: company, query: { isLoading: companyLoading } } = useOne<Company>({
    resource: "companies",
    id: companyId,
    queryOptions: { enabled: !!companyId },
  });

  const invitationFilters = useMemo(
    () => [{ field: "company_id", operator: "eq" as const, value: companyId }],
    [companyId]
  );
  const { result: invitationsResult, query: invitationsQuery } = useList<Invitation>({
    resource: "invitations",
    filters: invitationFilters,
    pagination: { pageSize: 500 },
    queryOptions: { enabled: !!companyId },
  });

  const invitations: Invitation[] = invitationsResult?.data ?? [];
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const paginatedRows = invitations.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const { mutate: createInvitation } = useCreate();
  const { mutate: deleteInvitation } = useDelete();

  // Invite user dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // CSV import dialog
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvEmails, setCsvEmails] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvSubmitting, setCsvSubmitting] = useState(false);
  const [csvProgress, setCsvProgress] = useState(0);
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync status
  const [syncing, setSyncing] = useState(false);
  const { mutate: updateInvitation } = useUpdate();

  const handleInviteClose = () => {
    if (inviteSubmitting) return;
    setInviteOpen(false);
    setInviteEmail("");
    setInviteError(null);
  };

  const handleInviteSubmit = async () => {
    if (!inviteEmail.trim() || !company) return;
    setInviteSubmitting(true);
    setInviteError(null);

    try {
      await inviteUserToSite({
        orgSlug: company.org_slug,
        email: inviteEmail.trim().toLowerCase(),
        siteSlug: company.site_slug ?? "",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send invitation";
      setInviteError(msg);
      setInviteSubmitting(false);
      return;
    }

    createInvitation(
      {
        resource: "invitations",
        values: {
          company_id: companyId,
          email: inviteEmail.trim().toLowerCase(),
          site_slug: company.site_slug ?? "",
          invite_status: "pending",
          nda_signed: false,
          invited_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          setInviteSubmitting(false);
          handleInviteClose();
          notify?.({ message: `Invitation sent to ${inviteEmail}`, type: "success" });
        },
        onError: (err: unknown) => {
          setInviteSubmitting(false);
          const msg = err instanceof Error ? err.message : "Failed to save invitation";
          setInviteError(msg);
        },
      }
    );
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const emails = parseEmailsFromCsv(text);
      setCsvEmails(emails);
      setCsvError(emails.length === 0 ? "No valid email addresses found in file." : null);
    };
    reader.readAsText(file);
  };

  const handleCsvClose = () => {
    if (csvSubmitting) return;
    setCsvOpen(false);
    setCsvEmails([]);
    setCsvFileName("");
    setCsvError(null);
    setCsvProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCsvImport = async () => {
    if (!company || csvEmails.length === 0) return;
    setCsvSubmitting(true);
    setCsvError(null);
    let done = 0;
    const errors: string[] = [];

    for (const email of csvEmails) {
      try {
        await inviteUserToSite({
          orgSlug: company.org_slug,
          email,
          siteSlug: company.site_slug ?? "",
        });
        await new Promise<void>((resolve, reject) =>
          createInvitation(
            {
              resource: "invitations",
              values: {
                company_id: companyId,
                email,
                site_slug: company.site_slug ?? "",
                invite_status: "pending",
                nda_signed: false,
                invited_at: new Date().toISOString(),
              },
            },
            { onSuccess: () => resolve(), onError: () => reject(new Error("Save failed")) }
          )
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error";
        errors.push(`${email}: ${msg}`);
      }
      done += 1;
      setCsvProgress(Math.round((done / csvEmails.length) * 100));
    }

    setCsvSubmitting(false);
    if (errors.length > 0) {
      setCsvError(`${errors.length} invitation(s) failed:\n${errors.slice(0, 3).join("\n")}${errors.length > 3 ? "\n…" : ""}`);
    } else {
      handleCsvClose();
      notify?.({ message: `${csvEmails.length} invitation(s) sent successfully.`, type: "success" });
    }
  };

  const handleSyncStatus = async () => {
    if (!company) return;
    setSyncing(true);
    try {
      const taruviInvites = await listTaruviInvitations(company.org_slug);
      let updated = 0;
      for (const inv of invitations) {
        const match = taruviInvites.find(
          (t) => (t.invitee_identifier ?? "").toLowerCase() === inv.email.toLowerCase()
        );
        if (match) {
          const newStatus = match.accepted ? "accepted" : match.status ?? "pending";
          if (newStatus !== inv.invite_status) {
            await new Promise<void>((resolve) =>
              updateInvitation(
                { resource: "invitations", id: inv.id, values: { invite_status: newStatus } },
                { onSuccess: () => resolve(), onError: () => resolve() }
              )
            );
            updated += 1;
          }
        }
      }
      notify?.({
        message: updated > 0 ? `Synced — ${updated} status(es) updated.` : "Already up to date.",
        type: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      notify?.({ message: msg, type: "error" });
    }
    setSyncing(false);
  };

  const handleDeleteInvitation = (invId: string, email: string) => {
    if (!window.confirm(`Remove invitation for ${email}?`)) return;
    deleteInvitation(
      { resource: "invitations", id: invId },
      {
        onSuccess: () => notify?.({ message: "Invitation removed.", type: "success" }),
        onError: () => notify?.({ message: "Failed to remove invitation.", type: "error" }),
      }
    );
  };

  if (companyLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, md: 4 } }}>
        <LinearProgress />
      </Container>
    );
  }

  const pendingCount = invitations.filter((i) => !i.invite_status || i.invite_status === "pending").length;
  const acceptedCount = invitations.filter((i) => i.invite_status === "accepted").length;
  const ndaCount = invitations.filter((i) => i.nda_signed).length;

  return (
    <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2.5 }}>
        <Link
          component="button"
          variant="body2"
          underline="hover"
          onClick={() => go({ to: "/companies" })}
          sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
        >
          <ArrowBackRoundedIcon sx={{ fontSize: 14 }} />
          Companies
        </Link>
        <Typography variant="body2" fontWeight={600}>
          {company?.name ?? "Company"}
        </Typography>
      </Breadcrumbs>

      {/* Company info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ md: "flex-start" }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: "primary.50",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <BusinessRoundedIcon sx={{ fontSize: 28, color: "primary.main" }} />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                <Typography variant="h4">{company?.name}</Typography>
                <Chip
                  label={company?.site_created ? "Active" : "Pending"}
                  color={company?.site_created ? "info" : "warning"}
                  size="small"
                />
                <Chip
                  label={company?.site_environment ?? "production"}
                  color={company?.site_environment === "staging" ? "warning" : "success"}
                  size="small"
                />
              </Stack>

              {company?.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                  {company.description}
                </Typography>
              )}

              <Stack direction="row" spacing={3} sx={{ mt: 2 }} flexWrap="wrap">
                <Box>
                  <Typography variant="caption" color="text.disabled" display="block">
                    Site Slug
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: "monospace", fontWeight: 600 }}
                  >
                    {company?.site_slug ?? "—"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.disabled" display="block">
                    Organization
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {company?.org_slug} (ID {company?.org_id})
                  </Typography>
                </Box>
                {company?.created_at && (
                  <Box>
                    <Typography variant="caption" color="text.disabled" display="block">
                      Created
                    </Typography>
                    <Typography variant="body2">
                      {new Date(company.created_at).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>

            {company?.site_slug && (
              <Button
                variant="outlined"
                size="small"
                endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 14 }} />}
                href={`https://${company.site_slug}.taruvi.cloud`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ flexShrink: 0 }}
              >
                Open Site
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Stats row */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Total Users", value: invitations.length, icon: <PersonAddRoundedIcon /> },
          { label: "Pending", value: pendingCount, icon: <PendingRoundedIcon /> },
          { label: "Accepted", value: acceptedCount, icon: <CheckCircleRoundedIcon /> },
          { label: "NDA Signed", value: ndaCount, icon: <CheckCircleRoundedIcon /> },
        ].map((stat) => (
          <Paper
            key={stat.label}
            variant="outlined"
            sx={{ flex: 1, p: 2, borderRadius: 2 }}
          >
            <Typography variant="caption" color="text.secondary" display="block">
              {stat.label}
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.5 }}>
              {stat.value}
            </Typography>
          </Paper>
        ))}
      </Stack>

      {/* Users section */}
      <Box>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <Typography variant="h5">Users</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Tooltip title="Sync acceptance status from Taruvi">
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={
                    syncing ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <SyncRoundedIcon />
                    )
                  }
                  disabled={syncing}
                  onClick={handleSyncStatus}
                >
                  Sync Status
                </Button>
              </span>
            </Tooltip>
            <Button
              variant="outlined"
              size="small"
              startIcon={<UploadFileRoundedIcon />}
              onClick={() => setCsvOpen(true)}
            >
              Import CSV
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddRoundedIcon />}
              onClick={() => setInviteOpen(true)}
            >
              Invite User
            </Button>
          </Stack>
        </Stack>

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          {invitationsQuery.isLoading && <LinearProgress />}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Invite Status</TableCell>
                <TableCell>NDA</TableCell>
                <TableCell>Invited</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRows.length === 0 && !invitationsQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary" variant="body2">
                      No users yet. Invite someone to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {paginatedRows.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {inv.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={inv.invite_status} />
                  </TableCell>
                  <TableCell>
                    {inv.nda_signed ? (
                      <Chip label="Signed" color="success" size="small" />
                    ) : (
                      <Chip label="Not Signed" sx={{ bgcolor: "#00acc1", color: "#fff" }} size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {inv.invited_at
                        ? new Date(inv.invited_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Remove">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteInvitation(inv.id, inv.email)}
                      >
                        <DeleteRoundedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {invitations.length > rowsPerPage && (
            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={invitations.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
            />
          )}
        </TableContainer>
      </Box>

      {/* Invite User dialog */}
      <Dialog open={inviteOpen} onClose={handleInviteClose} maxWidth="xs" fullWidth>
        <DialogTitle>Invite User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {inviteError && <Alert severity="error">{inviteError}</Alert>}
            <TextField
              label="Email Address"
              type="email"
              required
              fullWidth
              autoFocus
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleInviteSubmit(); }}
              helperText={`Will be added to site: ${company?.site_slug ?? "—"} as Member`}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleInviteClose} disabled={inviteSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleInviteSubmit}
            disabled={!inviteEmail.trim() || inviteSubmitting}
            startIcon={
              inviteSubmitting ? <CircularProgress size={14} color="inherit" /> : <AddRoundedIcon />
            }
          >
            {inviteSubmitting ? "Sending…" : "Send Invite"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CSV Import dialog */}
      <Dialog open={csvOpen} onClose={handleCsvClose} maxWidth="sm" fullWidth>
        <DialogTitle>Import Users from CSV</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <Alert severity="info">
              CSV file should contain an <strong>email</strong> column. All users will be invited as{" "}
              <strong>Members</strong> of site <strong>{company?.site_slug ?? "—"}</strong>.
            </Alert>

            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileRoundedIcon />}
              fullWidth
            >
              {csvFileName || "Choose CSV File"}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={handleCsvFile}
              />
            </Button>

            {csvEmails.length > 0 && (
              <Box
                sx={{
                  bgcolor: "grey.50",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1.5,
                  p: 1.5,
                  maxHeight: 180,
                  overflowY: "auto",
                }}
              >
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  {csvEmails.length} email(s) found
                </Typography>
                {csvEmails.map((e) => (
                  <Typography key={e} variant="body2" sx={{ py: 0.25 }}>
                    {e}
                  </Typography>
                ))}
              </Box>
            )}

            {csvSubmitting && (
              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Sending invitations…
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {csvProgress}%
                  </Typography>
                </Stack>
                <LinearProgress variant="determinate" value={csvProgress} />
              </Box>
            )}

            {csvError && <Alert severity="error" sx={{ whiteSpace: "pre-wrap" }}>{csvError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleCsvClose} disabled={csvSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCsvImport}
            disabled={csvEmails.length === 0 || csvSubmitting}
            startIcon={
              csvSubmitting ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <UploadFileRoundedIcon />
              )
            }
          >
            {csvSubmitting ? `Importing (${csvProgress}%)…` : `Import ${csvEmails.length} User(s)`}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
