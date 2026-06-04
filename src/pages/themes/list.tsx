import React, { useState, useRef } from "react";
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
  Card,
  CardContent,
  CardMedia,
  CardActions,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Grid,
} from "@mui/material";
import { useList, useCreate, useDelete, useNotification } from "@refinedev/core";
import { useForm } from "react-hook-form";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import StyleRoundedIcon from "@mui/icons-material/StyleRounded";
import { uploadStorageObject } from "../../services/taruviCloudApi";

interface Theme {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  created_at?: string;
}

interface ThemeFormValues {
  name: string;
  description: string;
}

export const ThemesList: React.FC = () => {
  const { open: notify } = useNotification();
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { result: themesResult, query: themesQuery } = useList<Theme>({
    resource: "themes",
    pagination: { pageSize: 100 },
    sorters: [{ field: "created_at", order: "desc" }],
  });

  const themes = themesResult?.data ?? [];

  const { mutate: createTheme } = useCreate();
  const { mutate: deleteTheme } = useDelete();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ThemeFormValues>({ defaultValues: { name: "", description: "" } });

  const handleClose = () => {
    if (submitting) return;
    setCreateOpen(false);
    setCreateError(null);
    setImageFile(null);
    setImagePreview(null);
    reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const onSubmit = async (values: ThemeFormValues) => {
    setSubmitting(true);
    setCreateError(null);

    let imageUrl: string | undefined;
    if (imageFile) {
      try {
        const safeName = `theme-${Date.now()}-${imageFile.name.replace(/\s+/g, "-")}`;
        imageUrl = await uploadStorageObject(imageFile, safeName);
      } catch (err: unknown) {
        setCreateError(err instanceof Error ? err.message : "Image upload failed");
        setSubmitting(false);
        return;
      }
    }

    createTheme(
      {
        resource: "themes",
        values: {
          name: values.name,
          description: values.description,
          image_url: imageUrl ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          setSubmitting(false);
          handleClose();
          notify?.({ message: "Theme created successfully.", type: "success" });
        },
        onError: (err: unknown) => {
          setSubmitting(false);
          setCreateError(err instanceof Error ? err.message : "Failed to create theme");
        },
      }
    );
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete theme "${name}"? This will also remove it from all companies.`)) return;
    deleteTheme(
      { resource: "themes", id },
      {
        onSuccess: () => notify?.({ message: "Theme deleted.", type: "success" }),
        onError: () => notify?.({ message: "Failed to delete theme.", type: "error" }),
      }
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4">Themes</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage Build-a-thon themes — assign up to 3 per company
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => setCreateOpen(true)}
        >
          Add Theme
        </Button>
      </Stack>

      {themesQuery.isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {!themesQuery.isLoading && themes.length === 0 && (
        <Box
          sx={{
            textAlign: "center",
            py: 10,
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            bgcolor: "background.paper",
          }}
        >
          <StyleRoundedIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
          <Typography variant="h5" color="text.secondary" sx={{ mb: 0.75 }}>
            No themes yet
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 2.5 }}>
            Create your first theme to start assigning them to companies
          </Typography>
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>
            Add Theme
          </Button>
        </Box>
      )}

      {themes.length > 0 && (
        <Grid container spacing={2.5}>
          {themes.map((theme) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={theme.id}>
              <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                {theme.image_url ? (
                  <CardMedia
                    component="img"
                    height={180}
                    image={theme.image_url}
                    alt={theme.name}
                    sx={{ objectFit: "cover" }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 180,
                      bgcolor: "grey.100",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ImageRoundedIcon sx={{ fontSize: 48, color: "text.disabled" }} />
                  </Box>
                )}
                <CardContent sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {theme.name}
                  </Typography>
                  {theme.description && (
                    <Typography variant="body2" color="text.secondary">
                      {theme.description}
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: "flex-end", pt: 0 }}>
                  <Tooltip title="Delete theme">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(theme.id, theme.name)}
                    >
                      <DeleteRoundedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Theme dialog */}
      <Dialog open={createOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>Add Theme</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 0.5 }}>
              {createError && <Alert severity="error">{createError}</Alert>}

              <TextField
                label="Theme Name"
                required
                fullWidth
                autoFocus
                error={!!errors.name}
                helperText={errors.name?.message}
                {...register("name", { required: "Theme name is required" })}
              />

              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                {...register("description")}
              />

              {/* Image upload */}
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Theme Image
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<ImageRoundedIcon />}
                  fullWidth
                >
                  {imageFile ? imageFile.name : "Upload Image"}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleImageChange}
                  />
                </Button>
                {imagePreview && (
                  <Box
                    component="img"
                    src={imagePreview}
                    alt="Preview"
                    sx={{
                      mt: 1.5,
                      width: "100%",
                      maxHeight: 200,
                      objectFit: "cover",
                      borderRadius: 1.5,
                      border: 1,
                      borderColor: "divider",
                    }}
                  />
                )}
              </Box>
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
              {submitting ? "Creating…" : "Create Theme"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};
