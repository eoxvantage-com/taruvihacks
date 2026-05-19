import React, { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem as MuiMenuItem,
  FormControl,
  InputLabel,
  Chip,
  Tooltip,
  IconButton,
  Alert,
  CircularProgress,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useDataGrid } from "@refinedev/mui";
import { useCreate, useDelete, useNotification, useGo } from "@refinedev/core";
import { useForm, Controller } from "react-hook-form";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import { createTaruviSite } from "../../services/taruviCloudApi";

interface CompanyFormValues {
  name: string;
  site_slug: string;
  description: string;
  org_slug: string;
  org_id: number;
  site_environment: string;
}

export const CompaniesList: React.FC = () => {
  const go = useGo();
  const { open: notify } = useNotification();
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { mutate: createRecord } = useCreate();
  const { mutate: deleteRecord } = useDelete();

  const { dataGridProps } = useDataGrid({
    resource: "companies",
    pagination: { pageSize: 25 },
    filters: { permanent: [] },
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    defaultValues: {
      name: "",
      site_slug: "",
      description: "",
      org_slug: "hackathon",
      org_id: 1428,
      site_environment: "production",
    },
  });

  const handleClose = () => {
    if (submitting) return;
    setCreateOpen(false);
    setCreateError(null);
    reset();
  };

  const onSubmit = async (values: CompanyFormValues) => {
    setSubmitting(true);
    setCreateError(null);
    let siteCreated = false;

    try {
      await createTaruviSite({
        orgSlug: values.org_slug,
        orgId: Number(values.org_id),
        siteName: values.site_slug,
        description: values.description,
        environment: values.site_environment,
      });
      siteCreated = true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setCreateError(`Site creation warning: ${msg}. Company will be saved with pending status.`);
    }

    createRecord(
      {
        resource: "companies",
        values: {
          name: values.name,
          description: values.description,
          org_slug: values.org_slug,
          org_id: Number(values.org_id),
          site_slug: values.site_slug,
          site_environment: values.site_environment,
          site_created: siteCreated,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          setSubmitting(false);
          if (siteCreated) {
            handleClose();
            notify?.({ message: "Company and site created successfully.", type: "success" });
          }
        },
        onError: (err: unknown) => {
          setSubmitting(false);
          const msg = err instanceof Error ? err.message : "Failed to save company";
          setCreateError(msg);
        },
      }
    );
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete company "${name}"? All associated invitations will also be removed.`)) return;
    deleteRecord(
      { resource: "companies", id },
      {
        onSuccess: () => notify?.({ message: "Company deleted.", type: "success" }),
        onError: () => notify?.({ message: "Failed to delete company.", type: "error" }),
      }
    );
  };

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Company Name",
      flex: 1.5,
      minWidth: 200,
      renderCell: ({ row }) => (
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: "primary.50",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BusinessRoundedIcon sx={{ fontSize: 18, color: "primary.main" }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
              {row.name}
            </Typography>
            {row.description && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {row.description}
              </Typography>
            )}
          </Box>
        </Stack>
      ),
    },
    {
      field: "site_slug",
      headerName: "Site Slug",
      flex: 1,
      minWidth: 150,
      renderCell: ({ value }) =>
        value ? (
          <Typography
            variant="body2"
            sx={{ fontFamily: "monospace", fontSize: 12, color: "text.secondary" }}
          >
            {value}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        ),
    },
    {
      field: "org_slug",
      headerName: "Organization",
      flex: 0.8,
      minWidth: 130,
      renderCell: ({ value, row }) => (
        <Stack>
          <Typography variant="body2">{value}</Typography>
          <Typography variant="caption" color="text.secondary">
            ID: {row.org_id}
          </Typography>
        </Stack>
      ),
    },
    {
      field: "site_environment",
      headerName: "Environment",
      width: 140,
      renderCell: ({ value }) => (
        <Chip
          label={value || "production"}
          color={value === "staging" ? "warning" : "success"}
          size="small"
        />
      ),
    },
    {
      field: "site_created",
      headerName: "Site Status",
      width: 130,
      renderCell: ({ value }) => (
        <Chip label={value ? "Active" : "Pending"} color={value ? "info" : "warning"} size="small" />
      ),
    },
    {
      field: "created_at",
      headerName: "Created",
      width: 140,
      renderCell: ({ value }) =>
        value
          ? new Date(value).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—",
    },
    {
      field: "_actions",
      headerName: "",
      width: 96,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title="View Details">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                go({ to: `/companies/${row.id}` });
              }}
            >
              <VisibilityRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row.id, row.name);
              }}
            >
              <DeleteRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      {/* Page header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4">Companies</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage companies and their associated Taruvi sites
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => setCreateOpen(true)}
        >
          Add Company
        </Button>
      </Stack>

      {/* Companies table */}
      <Box
        sx={{
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          overflow: "hidden",
        }}
      >
        <DataGrid
          {...dataGridProps}
          columns={columns}
          autoHeight
          onRowClick={({ row }) => go({ to: `/companies/${row.id}` })}
          sx={{
            border: 0,
            "& .MuiDataGrid-row": { cursor: "pointer" },
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: "grey.50",
              borderBottom: 1,
              borderColor: "divider",
            },
          }}
        />
      </Box>

      {/* Create Company dialog */}
      <Dialog
        open={createOpen}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>Add Company</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 0.5 }}>
              {createError && <Alert severity="warning">{createError}</Alert>}

              <Typography
                sx={{
                  fontFamily: "'Quicksand', sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "text.disabled",
                }}
              >
                Company Details
              </Typography>

              <TextField
                label="Company Name"
                required
                fullWidth
                autoFocus
                error={!!errors.name}
                helperText={errors.name?.message}
                {...register("name", { required: "Company name is required" })}
              />

              <TextField
                label="Site Slug"
                required
                fullWidth
                placeholder="e.g., acme-corp"
                error={!!errors.site_slug}
                helperText={
                  errors.site_slug?.message ||
                  "Taruvi site identifier — lowercase letters, numbers, hyphens"
                }
                {...register("site_slug", {
                  required: "Site slug is required",
                  pattern: {
                    value: /^[a-z0-9][a-z0-9-]*$/,
                    message: "Lowercase letters, numbers, and hyphens only",
                  },
                })}
              />

              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                {...register("description")}
              />

              <Typography
                sx={{
                  fontFamily: "'Quicksand', sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "text.disabled",
                  mt: 0.5,
                }}
              >
                Organization Settings
              </Typography>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <TextField
                  label="Org Slug"
                  required
                  error={!!errors.org_slug}
                  helperText={errors.org_slug?.message || "e.g., hackathon"}
                  {...register("org_slug", { required: "Required" })}
                />
                <TextField
                  label="Org ID"
                  type="number"
                  required
                  error={!!errors.org_id}
                  helperText={errors.org_id?.message}
                  {...register("org_id", {
                    required: "Required",
                    valueAsNumber: true,
                    min: { value: 1, message: "Must be a positive number" },
                  })}
                />
              </Box>

              <Controller
                control={control}
                name="site_environment"
                render={({ field }) => (
                  <FormControl size="small" fullWidth>
                    <InputLabel>Environment</InputLabel>
                    <Select label="Environment" {...field}>
                      <MuiMenuItem value="production">Production</MuiMenuItem>
                      <MuiMenuItem value="staging">Staging</MuiMenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              startIcon={
                submitting ? <CircularProgress size={14} color="inherit" /> : <AddRoundedIcon />
              }
            >
              {submitting ? "Creating…" : "Create Company"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};
