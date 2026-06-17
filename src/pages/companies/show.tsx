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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
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
import StyleRoundedIcon from "@mui/icons-material/StyleRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import MarkEmailReadRoundedIcon from "@mui/icons-material/MarkEmailReadRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { inviteUserToSite, listTaruviInvitations, sendSurveyEmails, sendCertificateEmails, storeProviderKey } from "../../services/taruviCloudApi";

interface Company {
  id: string;
  name: string;
  description?: string;
  org_slug: string;
  org_id: number;
  site_slug?: string;
  site_environment?: string;
  site_created?: boolean;
  buildathon_start?: string;
  buildathon_end?: string;
  survey_link?: string;
  survey_sent?: boolean;
  certificates_sent?: boolean;
  created_at?: string;
}

interface Invitation {
  id: string;
  company_id: string;
  email: string;
  participant_name?: string;
  site_slug: string;
  invite_status?: string;
  invited_at?: string;
  participant_app_slug?: string;
  provider_sync_status?: string;
  provider_synced_at?: string;
}

interface Theme {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
}

interface CompanyTheme {
  id: string;
  company_id: string;
  theme_id: string;
}

interface Provider {
  id: string;
  company_id: string;
  provider_type: string;
  secret_key_ref?: string;
  key_last4?: string;
  capacity_total: number;
  capacity_remaining: number;
  created_at?: string;
}

const PROVIDER_OPTIONS = [
  { value: "claude", label: "Claude (Anthropic)" },
  { value: "codex", label: "Codex (OpenAI)" },
];

// OpenAI auth tokens expire every 8 days; warn admin on day 7 (≤1 day left).
const OPENAI_TOKEN_EXPIRY_DAYS = 8;

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
  const { id: companyId = "" } = useParams<{ id: string }>();

  const [activeTab, setActiveTab] = useState(0);

  // ── Company ──────────────────────────────────────────────────────────────
  const { result: company, query: { isLoading: companyLoading, refetch: refetchCompany } } = useOne<Company>({
    resource: "companies",
    id: companyId,
    queryOptions: { enabled: !!companyId },
  });

  // ── Invitations ──────────────────────────────────────────────────────────
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

  // ── Themes ───────────────────────────────────────────────────────────────
  const { result: allThemesResult } = useList<Theme>({
    resource: "themes",
    pagination: { pageSize: 100 },
    sorters: [{ field: "name", order: "asc" }],
  });
  const allThemes = allThemesResult?.data ?? [];

  const companyThemeFilters = useMemo(
    () => [{ field: "company_id", operator: "eq" as const, value: companyId }],
    [companyId]
  );
  const { result: companyThemesResult, query: companyThemesQuery } = useList<CompanyTheme>({
    resource: "company_themes",
    filters: companyThemeFilters,
    pagination: { pageSize: 10 },
    queryOptions: { enabled: !!companyId },
  });
  const companyThemes = companyThemesResult?.data ?? [];
  const taggedThemeIds = new Set(companyThemes.map((ct) => ct.theme_id));
  const taggedThemes = allThemes.filter((t) => taggedThemeIds.has(t.id));

  const { mutate: createCompanyTheme } = useCreate();
  const { mutate: deleteCompanyTheme } = useDelete();
  const [themeSelectValue, setThemeSelectValue] = useState("");
  const [themeTagging, setThemeTagging] = useState(false);

  const handleTagTheme = () => {
    if (!themeSelectValue || taggedThemes.length >= 3) return;
    setThemeTagging(true);
    createCompanyTheme(
      { resource: "company_themes", values: { company_id: companyId, theme_id: themeSelectValue, created_at: new Date().toISOString() } },
      {
        onSuccess: () => { setThemeTagging(false); setThemeSelectValue(""); notify?.({ message: "Theme assigned to company.", type: "success" }); },
        onError: () => { setThemeTagging(false); notify?.({ message: "Failed to assign theme.", type: "error" }); },
      }
    );
  };

  const handleRemoveTheme = (companyThemeId: string) => {
    deleteCompanyTheme(
      { resource: "company_themes", id: companyThemeId },
      {
        onSuccess: () => notify?.({ message: "Theme removed.", type: "success" }),
        onError: () => notify?.({ message: "Failed to remove theme.", type: "error" }),
      }
    );
  };

  // ── Providers ────────────────────────────────────────────────────────────
  const providerFilters = useMemo(
    () => [{ field: "company_id", operator: "eq" as const, value: companyId }],
    [companyId]
  );
  const { result: providersResult, query: providersQuery } = useList<Provider>({
    resource: "providers",
    filters: providerFilters,
    pagination: { pageSize: 20 },
    queryOptions: { enabled: !!companyId },
  });
  const providers: Provider[] = providersResult?.data ?? [];

  const { mutate: deleteProvider } = useDelete();
  const { mutate: updateProvider } = useUpdate();

  const [providerOpen, setProviderOpen] = useState(false);
  const [providerType, setProviderType] = useState("claude");
  const [providerApiKey, setProviderApiKey] = useState("");
  const [providerCapacity, setProviderCapacity] = useState<number | "">(10);
  const [providerSubmitting, setProviderSubmitting] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);

  const handleProviderClose = () => {
    if (providerSubmitting) return;
    setProviderOpen(false);
    setProviderType("claude");
    setProviderApiKey("");
    setProviderCapacity(10);
    setProviderError(null);
  };

  const handleProviderSubmit = async () => {
    const key = providerApiKey.trim();
    if (!key || !providerCapacity) return;
    setProviderSubmitting(true);
    setProviderError(null);
    try {
      await storeProviderKey({
        companyId,
        providerType,
        apiKey: key,
        capacity: Number(providerCapacity),
      });
      handleProviderClose();
      notify?.({ message: "Provider added.", type: "success" });
      providersQuery.refetch();
    } catch (err: unknown) {
      setProviderError(err instanceof Error ? err.message : "Failed to save provider. Please try again.");
    } finally {
      setProviderSubmitting(false);
    }
  };

  const handleDeleteProvider = (providerId: string, type: string) => {
    if (!window.confirm(`Remove ${type} provider?`)) return;
    deleteProvider(
      { resource: "providers", id: providerId },
      {
        onSuccess: () => notify?.({ message: "Provider removed.", type: "success" }),
        onError: () => notify?.({ message: "Failed to remove provider.", type: "error" }),
      }
    );
  };

  const handleResetCapacity = (provider: Provider) => {
    updateProvider(
      { resource: "providers", id: provider.id, values: { capacity_remaining: provider.capacity_total } },
      {
        onSuccess: () => notify?.({ message: "Capacity reset.", type: "success" }),
        onError: () => notify?.({ message: "Failed to reset capacity.", type: "error" }),
      }
    );
  };

  // ── Users pagination + actions ───────────────────────────────────────────
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const paginatedRows = invitations.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  // ── Build-a-thon dates ───────────────────────────────────────────────────
  const { mutate: updateCompany } = useUpdate();
  const [datesOpen, setDatesOpen] = useState(false);
  const [datesStart, setDatesStart] = useState("");
  const [datesEnd, setDatesEnd] = useState("");
  const [datesSaving, setDatesSaving] = useState(false);
  const [datesError, setDatesError] = useState<string | null>(null);

  const handleDatesOpen = () => {
    setDatesStart(company?.buildathon_start ? company.buildathon_start.slice(0, 16) : "");
    setDatesEnd(company?.buildathon_end ? company.buildathon_end.slice(0, 16) : "");
    setDatesError(null);
    setDatesOpen(true);
  };

  const handleDatesSave = () => {
    if (datesStart && datesEnd && datesEnd <= datesStart) {
      setDatesError("End date must be after start date.");
      return;
    }
    setDatesSaving(true);
    setDatesError(null);
    updateCompany(
      {
        resource: "companies",
        id: companyId,
        values: {
          buildathon_start: datesStart ? new Date(datesStart).toISOString() : null,
          buildathon_end: datesEnd ? new Date(datesEnd).toISOString() : null,
          updated_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => { setDatesSaving(false); setDatesOpen(false); notify?.({ message: "Build-a-thon dates updated.", type: "success" }); },
        onError: () => { setDatesSaving(false); setDatesError("Failed to save dates. Please try again."); },
      }
    );
  };

  // ── Survey link ──────────────────────────────────────────────────────────
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [surveyInput, setSurveyInput] = useState("");
  const [surveySaving, setSurveySaving] = useState(false);
  const [surveyError, setSurveyError] = useState<string | null>(null);

  const handleSurveyOpen = () => {
    setSurveyInput(company?.survey_link ?? "");
    setSurveyError(null);
    setSurveyOpen(true);
  };

  const handleSurveySave = () => {
    const trimmed = surveyInput.trim();
    if (trimmed && !/^https?:\/\/.+/.test(trimmed)) {
      setSurveyError("Please enter a valid URL starting with http:// or https://");
      return;
    }
    setSurveySaving(true);
    setSurveyError(null);
    updateCompany(
      {
        resource: "companies",
        id: companyId,
        values: { survey_link: trimmed || null, updated_at: new Date().toISOString() },
      },
      {
        onSuccess: () => { setSurveySaving(false); setSurveyOpen(false); notify?.({ message: "Survey link saved.", type: "success" }); },
        onError: () => { setSurveySaving(false); setSurveyError("Failed to save. Please try again."); },
      }
    );
  };

  // ── Release certificates ─────────────────────────────────────────────────
  const [certSending, setCertSending] = useState(false);

  const handleSendCertificates = () => {
    if (!companyId) return;
    setCertSending(true);
    updateCompany(
      { resource: "companies", id: companyId, values: { certificates_sent: true } },
      {
        onSuccess: () => { setCertSending(false); notify?.({ message: "Certificates released — participants can now download them.", type: "success" }); },
        onError: () => { setCertSending(false); notify?.({ message: "Failed to release certificates.", type: "error" }); },
      }
    );
  };

  // ── Send survey emails ───────────────────────────────────────────────────
  const [surveySending, setSurveySending] = useState(false);

  const handleSendSurvey = async () => {
    if (!companyId) return;
    setSurveySending(true);
    try {
      await sendSurveyEmails(companyId);
      await refetchCompany();
      notify?.({ message: "Survey emails sent to all invitees.", type: "success" });
    } catch (err: unknown) {
      notify?.({ message: err instanceof Error ? err.message : "Failed to send survey emails.", type: "error" });
    }
    setSurveySending(false);
  };

  // ── Invitations ──────────────────────────────────────────────────────────
  const { mutate: createInvitation } = useCreate();
  const { mutate: deleteInvitation } = useDelete();
  const { mutate: updateInvitation } = useUpdate();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [csvOpen, setCsvOpen] = useState(false);
  const [csvEmails, setCsvEmails] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvSubmitting, setCsvSubmitting] = useState(false);
  const [csvProgress, setCsvProgress] = useState(0);
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [syncing, setSyncing] = useState(false);

  const handleInviteClose = () => {
    if (inviteSubmitting) return;
    setInviteOpen(false);
    setInviteEmail("");
    setInviteName("");
    setInviteError(null);
  };

  const handleInviteSubmit = async () => {
    if (!inviteEmail.trim() || !company) return;
    setInviteSubmitting(true);
    setInviteError(null);
    try {
      await inviteUserToSite({ orgSlug: company.org_slug, email: inviteEmail.trim().toLowerCase(), siteSlug: company.site_slug ?? "" });
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invitation");
      setInviteSubmitting(false);
      return;
    }
    createInvitation(
      {
        resource: "invitations",
        values: { company_id: companyId, email: inviteEmail.trim().toLowerCase(), participant_name: inviteName.trim() || null, site_slug: company.site_slug ?? "", invite_status: "pending", invited_at: new Date().toISOString() },
      },
      {
        onSuccess: () => { setInviteSubmitting(false); handleInviteClose(); notify?.({ message: `Invitation sent to ${inviteEmail}`, type: "success" }); },
        onError: (err: unknown) => { setInviteSubmitting(false); setInviteError(err instanceof Error ? err.message : "Failed to save invitation"); },
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
        await inviteUserToSite({ orgSlug: company.org_slug, email, siteSlug: company.site_slug ?? "" });
        await new Promise<void>((resolve, reject) =>
          createInvitation(
            { resource: "invitations", values: { company_id: companyId, email, site_slug: company.site_slug ?? "", invite_status: "pending", invited_at: new Date().toISOString() } },
            { onSuccess: () => resolve(), onError: () => reject(new Error("Save failed")) }
          )
        );
      } catch (err: unknown) {
        errors.push(`${email}: ${err instanceof Error ? err.message : "Error"}`);
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
        const match = taruviInvites.find((t) => (t.invitee_identifier ?? "").toLowerCase() === inv.email.toLowerCase());
        if (match) {
          const newStatus = match.accepted ? "accepted" : match.status ?? "pending";
          if (newStatus !== inv.invite_status) {
            await new Promise<void>((resolve) =>
              updateInvitation({ resource: "invitations", id: inv.id, values: { invite_status: newStatus } }, { onSuccess: () => resolve(), onError: () => resolve() })
            );
            updated += 1;
          }
        }
      }
      notify?.({ message: updated > 0 ? `Synced — ${updated} status(es) updated.` : "Already up to date.", type: "success" });
    } catch (err: unknown) {
      notify?.({ message: err instanceof Error ? err.message : "Sync failed", type: "error" });
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

  return (
    <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2.5 }}>
        <Link component="button" variant="body2" underline="hover" onClick={() => go({ to: "/companies" })} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <ArrowBackRoundedIcon sx={{ fontSize: 14 }} />
          Companies
        </Link>
        <Typography variant="body2" fontWeight={600}>{company?.name ?? "Company"}</Typography>
      </Breadcrumbs>

      {/* Company info card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={0} alignItems="stretch">

            {/* ── Left: identity ──────────────────────────────────────── */}
            <Stack direction="row" spacing={2.5} alignItems="flex-start" sx={{ flex: 1, minWidth: 0, pr: { md: 4 } }}>
              <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: "primary.50", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, mt: 0.25 }}>
                <BusinessRoundedIcon sx={{ fontSize: 26, color: "primary.main" }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                  <Typography variant="h5" fontWeight={700}>{company?.name}</Typography>
                  <Chip label={company?.site_created ? "Active" : "Pending"} color={company?.site_created ? "info" : "warning"} size="small" />
                  <Chip label={company?.site_environment ?? "production"} color={company?.site_environment === "staging" ? "warning" : "success"} size="small" />
                </Stack>
                {company?.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{company.description}</Typography>
                )}
                <Stack direction="row" spacing={4} sx={{ mt: 2 }} flexWrap="wrap">
                  <Box>
                    <Typography variant="caption" color="text.disabled" display="block">Site Slug</Typography>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>{company?.site_slug ?? "—"}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.disabled" display="block">Organization</Typography>
                    <Typography variant="body2" fontWeight={600}>{company?.org_slug} (ID {company?.org_id})</Typography>
                  </Box>
                  {company?.created_at && (
                    <Box>
                      <Typography variant="caption" color="text.disabled" display="block">Created</Typography>
                      <Typography variant="body2">{new Date(company.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </Stack>

            {/* ── Divider ─────────────────────────────────────────────── */}
            <Box sx={{ display: { xs: "none", md: "block" }, width: "1px", bgcolor: "divider", mx: 0, alignSelf: "stretch" }} />

            {/* ── Right: event controls ───────────────────────────────── */}
            <Box sx={{ width: { xs: "100%", md: 300 }, pl: { md: 4 }, pt: { xs: 3, md: 0 }, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 2 }}>

              {/* Dates */}
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 0.25 }}>Build-a-thon dates</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={600}>
                      {company?.buildathon_start
                        ? new Date(company.buildathon_start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : <Typography component="span" variant="body2" color="text.disabled">Start not set</Typography>}
                    </Typography>
                    <Typography variant="body2" color="text.disabled">→</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {company?.buildathon_end
                        ? new Date(company.buildathon_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : <Typography component="span" variant="body2" color="text.disabled">End not set</Typography>}
                    </Typography>
                  </Stack>
                </Box>
                <Tooltip title="Edit build-a-thon dates">
                  <IconButton size="small" onClick={handleDatesOpen} sx={{ mt: -0.5 }}>
                    <EditRoundedIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              </Stack>

              {/* Survey */}
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                  <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 0.25 }}>Survey</Typography>
                  {company?.survey_link ? (
                    <Typography
                      component="a"
                      href={company.survey_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="body2"
                      fontWeight={600}
                      sx={{ color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" }, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {company.survey_link}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.disabled">Not set</Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                  <Tooltip title="Edit survey link">
                    <IconButton size="small" onClick={handleSurveyOpen} sx={{ mt: -0.5 }}>
                      <EditRoundedIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                  {company?.survey_sent ? (
                    <Chip icon={<MarkEmailReadRoundedIcon sx={{ fontSize: 13 }} />} label="Sent" color="success" size="small" sx={{ fontWeight: 600 }} />
                  ) : (
                    <Tooltip title={!company?.survey_link ? "Add a survey link first" : "Send survey email to all invitees"}>
                      <span>
                        <Button size="small" variant="outlined" startIcon={surveySending ? <CircularProgress size={12} color="inherit" /> : <SendRoundedIcon sx={{ fontSize: 13 }} />} disabled={!company?.survey_link || surveySending} onClick={handleSendSurvey} sx={{ height: 28, fontSize: 11 }}>
                          {surveySending ? "Sending…" : "Send"}
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                </Stack>
              </Stack>

              {/* Certificates */}
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 0.25 }}>Certificates</Typography>
                  <Typography variant="body2" color={company?.certificates_sent ? "success.main" : "text.secondary"} fontWeight={company?.certificates_sent ? 600 : 400}>
                    {company?.certificates_sent ? "Released to participants" : "Not yet released"}
                  </Typography>
                </Box>
                {company?.certificates_sent ? (
                  <Chip icon={<MarkEmailReadRoundedIcon sx={{ fontSize: 13 }} />} label="Released" color="success" size="small" sx={{ fontWeight: 600, flexShrink: 0 }} />
                ) : (
                  <Tooltip title="Release certificates so participants can download them from their portal">
                    <span>
                      <Button size="small" variant="outlined" startIcon={certSending ? <CircularProgress size={12} color="inherit" /> : <WorkspacePremiumRoundedIcon sx={{ fontSize: 13 }} />} disabled={certSending} onClick={handleSendCertificates} sx={{ height: 28, fontSize: 11, flexShrink: 0 }}>
                        {certSending ? "Releasing…" : "Release"}
                      </Button>
                    </span>
                  </Tooltip>
                )}
              </Stack>

              {/* Open Site */}
              {company?.site_slug && (
                <Box>
                  <Button variant="outlined" size="small" endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 13 }} />} href={`https://${company.site_slug}.taruvi.cloud`} target="_blank" rel="noopener noreferrer" sx={{ fontSize: 12 }}>
                    Open Site
                  </Button>
                </Box>
              )}

            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Stats row */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Total Users", value: invitations.length, icon: <PersonAddRoundedIcon /> },
          { label: "Pending", value: pendingCount, icon: <PendingRoundedIcon /> },
          { label: "Accepted", value: acceptedCount, icon: <CheckCircleRoundedIcon /> },
        ].map((stat) => (
          <Paper key={stat.label} variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block">{stat.label}</Typography>
            <Typography variant="h4" sx={{ mt: 0.5 }}>{stat.value}</Typography>
          </Paper>
        ))}
      </Stack>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Users" />
          <Tab label="Themes" />
          <Tab label="Providers" />
        </Tabs>
      </Box>

      {/* ── Tab 0: Users ─────────────────────────────────────────────────── */}
      {activeTab === 0 && (
        <Box>
          <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
            <Typography variant="h5">Users</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Tooltip title="Sync acceptance status from Taruvi">
                <span>
                  <Button variant="outlined" size="small" startIcon={syncing ? <CircularProgress size={14} color="inherit" /> : <SyncRoundedIcon />} disabled={syncing} onClick={handleSyncStatus}>
                    Sync Status
                  </Button>
                </span>
              </Tooltip>
              <Button variant="outlined" size="small" startIcon={<UploadFileRoundedIcon />} onClick={() => setCsvOpen(true)}>Import CSV</Button>
              <Button variant="contained" size="small" startIcon={<AddRoundedIcon />} onClick={() => setInviteOpen(true)}>Invite User</Button>
            </Stack>
          </Stack>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            {invitationsQuery.isLoading && <LinearProgress />}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Invite Status</TableCell>
                  <TableCell>App</TableCell>
                  <TableCell>Invited</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRows.length === 0 && !invitationsQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary" variant="body2">No users yet. Invite someone to get started.</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {paginatedRows.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell><Typography variant="body2" fontWeight={500}>{inv.email}</Typography></TableCell>
                    <TableCell><StatusChip status={inv.invite_status} /></TableCell>
                    <TableCell>
                      {inv.provider_sync_status === "synced" && inv.participant_app_slug ? (
                        <Stack spacing={0.25}>
                          <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, fontSize: 12 }}>
                            {inv.participant_app_slug}
                          </Typography>
                          <Chip label="Synced" color="success" size="small" sx={{ width: "fit-content" }} />
                        </Stack>
                      ) : inv.provider_sync_status === "error" ? (
                        <Chip label="Sync Error" color="error" size="small" />
                      ) : (
                        <Typography variant="body2" color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {inv.invited_at ? new Date(inv.invited_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Remove">
                        <IconButton size="small" color="error" onClick={() => handleDeleteInvitation(inv.id, inv.email)}>
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
      )}

      {/* ── Tab 1: Themes ────────────────────────────────────────────────── */}
      {activeTab === 1 && (
        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h5">Themes</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>Assign up to 3 themes to this company</Typography>
            </Box>
            <Chip label={`${taggedThemes.length} / 3`} size="small" color={taggedThemes.length >= 3 ? "error" : "default"} sx={{ fontWeight: 700 }} />
          </Stack>

          {companyThemesQuery.isLoading ? (
            <LinearProgress sx={{ mb: 2 }} />
          ) : (
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
              {taggedThemes.length === 0 && (
                <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>No themes assigned yet.</Typography>
              )}
              {taggedThemes.map((theme) => {
                const link = companyThemes.find((ct) => ct.theme_id === theme.id);
                return (
                  <Card key={theme.id} variant="outlined" sx={{ width: 200, display: "flex", flexDirection: "column" }}>
                    {theme.image_url ? (
                      <Box component="img" src={theme.image_url} alt={theme.name} sx={{ width: "100%", height: 110, objectFit: "cover" }} />
                    ) : (
                      <Box sx={{ height: 110, bgcolor: "grey.100", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ImageRoundedIcon sx={{ fontSize: 36, color: "text.disabled" }} />
                      </Box>
                    )}
                    <CardContent sx={{ py: 1.25, px: 1.5, flex: 1 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>{theme.name}</Typography>
                      {theme.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>{theme.description}</Typography>
                      )}
                    </CardContent>
                    <Box sx={{ px: 1.5, pb: 1, display: "flex", justifyContent: "flex-end" }}>
                      <Tooltip title="Remove theme">
                        <IconButton size="small" color="error" onClick={() => link && handleRemoveTheme(link.id)}>
                          <DeleteRoundedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Card>
                );
              })}
            </Stack>
          )}

          {taggedThemes.length < 3 && (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 260 }}>
                <InputLabel>Select a theme</InputLabel>
                <Select label="Select a theme" value={themeSelectValue} onChange={(e) => setThemeSelectValue(e.target.value)}>
                  {allThemes.filter((t) => !taggedThemeIds.has(t.id)).map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {t.image_url
                          ? <Box component="img" src={t.image_url} alt={t.name} sx={{ width: 24, height: 24, borderRadius: 0.5, objectFit: "cover" }} />
                          : <StyleRoundedIcon sx={{ fontSize: 18, color: "text.disabled" }} />}
                        <Typography variant="body2">{t.name}</Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="contained" size="small" disabled={!themeSelectValue || themeTagging} startIcon={themeTagging ? <CircularProgress size={13} color="inherit" /> : <AddRoundedIcon />} onClick={handleTagTheme}>
                Assign
              </Button>
            </Stack>
          )}

          {taggedThemes.length >= 3 && (
            <Alert severity="info" sx={{ mt: 1 }}>Maximum of 3 themes reached. Remove a theme to assign a different one.</Alert>
          )}
        </Box>
      )}

      {/* ── Tab 2: Providers ─────────────────────────────────────────────── */}
      {activeTab === 2 && (
        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h5">Providers</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                AI provider credentials and Codespace capacity
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddRoundedIcon />}
              onClick={() => setProviderOpen(true)}
            >
              Add Provider
            </Button>
          </Stack>

          {company?.site_slug && (
            <Alert severity="info" variant="outlined" sx={{ mb: 2.5 }}>
              <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                Site key setup required for participant registration
              </Typography>
              <Typography variant="body2">
                Before participants can register their apps at onboarding step 6, store a permanent site-level API key for{" "}
                <strong>{company.site_slug}.taruvi.cloud</strong> in hackathonapp secrets as{" "}
                <Box component="code" sx={{ fontFamily: "monospace", fontSize: 12, bgcolor: "info.50", px: 0.75, py: 0.25, borderRadius: 0.75 }}>
                  {company.site_slug}_site_key
                </Box>.
                {" "}To get the key: log in to{" "}
                <Typography
                  component="a"
                  variant="body2"
                  href={`https://${company.site_slug}.taruvi.cloud`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: "info.main", fontWeight: 600 }}
                >
                  {company.site_slug}.taruvi.cloud
                </Typography>{" "}
                → Settings → API Keys → create a permanent key.
              </Typography>
            </Alert>
          )}

          {providersQuery.isLoading && <LinearProgress sx={{ mb: 2 }} />}

          {!providersQuery.isLoading && providers.length === 0 && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
              <Typography color="text.secondary" variant="body2">No providers configured yet.</Typography>
            </Paper>
          )}

          <Stack spacing={2}>
            {providers.map((p) => {
              const label = PROVIDER_OPTIONS.find((o) => o.value === p.provider_type)?.label ?? p.provider_type;
              const pct = p.capacity_total > 0 ? Math.round((p.capacity_remaining / p.capacity_total) * 100) : 0;
              const low = pct <= 20;

              // OpenAI tokens expire every 8 days — warn on day 7 (≤1 day left)
              let tokenExpiryWarning: string | null = null;
              if (p.provider_type === "codex" && p.created_at) {
                const expiresAt = new Date(p.created_at).getTime() + OPENAI_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
                const daysLeft = Math.floor((expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
                if (daysLeft <= 0) tokenExpiryWarning = "Token expired — replace immediately";
                else if (daysLeft === 1) tokenExpiryWarning = "Token expires tomorrow — replace now";
              }

              return (
                <Paper
                  key={p.id}
                  variant="outlined"
                  sx={{ p: 2.5, borderRadius: 2, ...(tokenExpiryWarning ? { borderColor: "warning.main" } : {}) }}
                >
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-start" }}>
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Chip label={label} size="small" color="primary" sx={{ fontWeight: 700 }} />
                        {low && <Chip label="Low capacity" size="small" color="error" />}
                        {tokenExpiryWarning && (
                          <Chip
                            icon={<WarningAmberRoundedIcon sx={{ fontSize: "14px !important" }} />}
                            label={tokenExpiryWarning}
                            size="small"
                            color="warning"
                          />
                        )}
                      </Stack>

                      {/* Auth key — last 4 chars only; raw key never leaves server */}
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                        <KeyRoundedIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                        <Typography variant="body2" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                          {p.key_last4 ? `••••••••${p.key_last4}` : "••••••••"}
                        </Typography>
                      </Stack>

                      {/* Capacity */}
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                        <SpeedRoundedIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                        <Typography variant="body2" color="text.secondary">
                          {p.capacity_remaining} / {p.capacity_total} Codespace slots remaining
                        </Typography>
                      </Stack>
                      <Box sx={{ maxWidth: 320 }}>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          color={low ? "error" : "primary"}
                          sx={{ borderRadius: 4, height: 6 }}
                        />
                      </Box>
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                      <Tooltip title="Reset capacity to total">
                        <Button variant="outlined" size="small" startIcon={<SyncRoundedIcon />} onClick={() => handleResetCapacity(p)}>
                          Reset
                        </Button>
                      </Tooltip>
                      <Tooltip title="Remove provider">
                        <IconButton size="small" color="error" onClick={() => handleDeleteProvider(p.id, label)}>
                          <DeleteRoundedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Box>
      )}

      {/* ── Invite User dialog ───────────────────────────────────────────── */}
      <Dialog open={inviteOpen} onClose={handleInviteClose} maxWidth="xs" fullWidth>
        <DialogTitle>Invite User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {inviteError && <Alert severity="error">{inviteError}</Alert>}
            <TextField
              label="Full Name" required fullWidth autoFocus
              value={inviteName} onChange={(e) => setInviteName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleInviteSubmit(); }}
              helperText="Used on the participant's completion certificate"
            />
            <TextField
              label="Email Address" type="email" required fullWidth
              value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleInviteSubmit(); }}
              helperText={`Will be added to site: ${company?.site_slug ?? "—"} as Member`}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleInviteClose} disabled={inviteSubmitting}>Cancel</Button>
          <Button variant="contained" onClick={handleInviteSubmit} disabled={!inviteEmail.trim() || !inviteName.trim() || inviteSubmitting} startIcon={inviteSubmitting ? <CircularProgress size={14} color="inherit" /> : <AddRoundedIcon />}>
            {inviteSubmitting ? "Sending…" : "Send Invite"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── CSV Import dialog ────────────────────────────────────────────── */}
      <Dialog open={csvOpen} onClose={handleCsvClose} maxWidth="sm" fullWidth>
        <DialogTitle>Import Users from CSV</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <Alert severity="info">
              CSV file should contain an <strong>email</strong> column. All users will be invited as{" "}
              <strong>Members</strong> of site <strong>{company?.site_slug ?? "—"}</strong>.
            </Alert>
            <Button variant="outlined" component="label" startIcon={<UploadFileRoundedIcon />} fullWidth>
              {csvFileName || "Choose CSV File"}
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleCsvFile} />
            </Button>
            {csvEmails.length > 0 && (
              <Box sx={{ bgcolor: "grey.50", border: 1, borderColor: "divider", borderRadius: 1.5, p: 1.5, maxHeight: 180, overflowY: "auto" }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>{csvEmails.length} email(s) found</Typography>
                {csvEmails.map((e) => <Typography key={e} variant="body2" sx={{ py: 0.25 }}>{e}</Typography>)}
              </Box>
            )}
            {csvSubmitting && (
              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Sending invitations…</Typography>
                  <Typography variant="caption" color="text.secondary">{csvProgress}%</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={csvProgress} />
              </Box>
            )}
            {csvError && <Alert severity="error" sx={{ whiteSpace: "pre-wrap" }}>{csvError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleCsvClose} disabled={csvSubmitting}>Cancel</Button>
          <Button variant="contained" onClick={handleCsvImport} disabled={csvEmails.length === 0 || csvSubmitting} startIcon={csvSubmitting ? <CircularProgress size={14} color="inherit" /> : <UploadFileRoundedIcon />}>
            {csvSubmitting ? `Importing (${csvProgress}%)…` : `Import ${csvEmails.length} User(s)`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Survey link dialog ──────────────────────────────────────────── */}
      <Dialog open={surveyOpen} onClose={() => !surveySaving && setSurveyOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Survey Link</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {surveyError && <Alert severity="error">{surveyError}</Alert>}
            <TextField
              label="Survey URL"
              type="url"
              fullWidth
              autoFocus
              placeholder="https://forms.example.com/survey"
              value={surveyInput}
              onChange={(e) => setSurveyInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSurveySave(); }}
              helperText="Leave blank to remove the survey link"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setSurveyOpen(false)} disabled={surveySaving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSurveySave}
            disabled={surveySaving}
            startIcon={surveySaving ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {surveySaving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Build-a-thon dates dialog ───────────────────────────────────── */}
      <Dialog open={datesOpen} onClose={() => !datesSaving && setDatesOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Build-a-thon Dates</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            {datesError && <Alert severity="error">{datesError}</Alert>}
            <TextField
              label="Start Date & Time"
              type="datetime-local"
              fullWidth
              value={datesStart}
              onChange={(e) => setDatesStart(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date & Time"
              type="datetime-local"
              fullWidth
              value={datesEnd}
              onChange={(e) => setDatesEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: datesStart || undefined }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setDatesOpen(false)} disabled={datesSaving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleDatesSave}
            disabled={datesSaving}
            startIcon={datesSaving ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {datesSaving ? "Saving…" : "Save Dates"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Provider dialog ──────────────────────────────────────────── */}
      <Dialog open={providerOpen} onClose={handleProviderClose} maxWidth="xs" fullWidth>
        <DialogTitle>Add Provider</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            {providerError && <Alert severity="error">{providerError}</Alert>}
            {company?.site_slug && (
              <Alert severity="info" sx={{ py: 0.75 }}>
                <Typography variant="caption">
                  Ensure{" "}
                  <Box component="code" sx={{ fontFamily: "monospace", fontSize: 11 }}>
                    {company.site_slug}_site_key
                  </Box>{" "}
                  is stored in hackathonapp secrets before participants register.
                </Typography>
              </Alert>
            )}
            <FormControl fullWidth size="small">
              <InputLabel>Provider</InputLabel>
              <Select label="Provider" value={providerType} onChange={(e) => setProviderType(e.target.value)}>
                {PROVIDER_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="API Key" fullWidth required autoFocus
              value={providerApiKey} onChange={(e) => setProviderApiKey(e.target.value)}
              helperText="Stored and used server-side for this company's participants"
              type="password"
            />
            <TextField
              label="Codespace Capacity" type="number" fullWidth required
              value={providerCapacity}
              onChange={(e) => setProviderCapacity(e.target.value === "" ? "" : Number(e.target.value))}
              inputProps={{ min: 1 }}
              helperText="Number of GitHub Codespace slots — decrements each time one is opened"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleProviderClose} disabled={providerSubmitting}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleProviderSubmit}
            disabled={!providerApiKey.trim() || !providerCapacity || providerSubmitting}
            startIcon={providerSubmitting ? <CircularProgress size={14} color="inherit" /> : <AddRoundedIcon />}
          >
            {providerSubmitting ? "Saving…" : "Add Provider"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
