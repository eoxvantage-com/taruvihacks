import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
  Chip,
  Collapse,
  IconButton,
} from "@mui/material";
import {
  useGetIdentity,
  useList,
  useOne,
  useUpdate,
  useNotification,
} from "@refinedev/core";
import { motion, AnimatePresence } from "framer-motion";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import GitHubIcon from "@mui/icons-material/GitHub";
import { syncParticipantProviderSecret } from "../../services/taruviCloudApi";

// ─── Logo ────────────────────────────────────────────────────────────────────
// Storage bucket is public — direct URL, no auth needed.
const LOGO_URL =
  "https://hackathonsite.taruvi.cloud/api/apps/hackathonapp/storage/buckets/storage/objects/Logo%20Only%20(2).png";

const BUILDER_URL =
  "https://hackathonsite.taruvi.cloud/api/apps/hackathonapp/storage/buckets/storage/objects/builder.png";

// ─── Config ────────────────────────────────────────────────────────────────
const VIDEO_URL =
  "https://hackathonsite.taruvi.cloud/api/apps/hackathonapp/storage/buckets/storage/objects/Taruvi_Base_Final_v8.mp4";
const CODESPACE_URL =
  "https://codespaces.new/Taruvi-ai/taruvi-hacks-template";

const STORAGE_BASE =
  "https://hackathonsite.taruvi.cloud/api/apps/hackathonapp/storage/buckets/storage/objects";
const APP_SCREENSHOTS = [
  { src: `${STORAGE_BASE}/App-1.png`, alt: "Click on your site" },
  { src: `${STORAGE_BASE}/App-2.png`, alt: "Click on Create New App" },
  { src: `${STORAGE_BASE}/App-3.png`, alt: "Click on Create App" },
];

const API_SCREENSHOTS = [
  { src: `${STORAGE_BASE}/api-4.png`, alt: "Click on the app" },
  { src: `${STORAGE_BASE}/api-5.png`, alt: "Click on Settings from the left navbar" },
  { src: `${STORAGE_BASE}/api-6.png`, alt: "Within Settings, click on Connect" },
  { src: `${STORAGE_BASE}/api-7.png`, alt: "Click on Generate API Key" },
  { src: `${STORAGE_BASE}/api-8.png`, alt: "Create and copy the generated environment variables" },
];

const NDA_TEXT = `TARUVI HACKS — NON-DISCLOSURE AGREEMENT

Effective Date: Date of electronic acceptance

This Non-Disclosure Agreement ("Agreement") is entered into between Taruvi ("Company") and you ("Participant").

1. CONFIDENTIAL INFORMATION
During the hackathon, you may be given access to non-public information, including but not limited to business plans, technical specifications, product concepts, APIs, data structures, and any other proprietary information disclosed by Company or its partners ("Confidential Information").

2. YOUR OBLIGATIONS
You agree to:
  • Keep all Confidential Information strictly confidential.
  • Not disclose Confidential Information to any third party without prior written consent from Taruvi.
  • Use Confidential Information solely for the purpose of participating in TaruviHacks.
  • Protect Confidential Information with at least the same degree of care you apply to your own confidential information, but no less than reasonable care.

3. EXCLUSIONS
These obligations do not apply to information that:
  (a) Is or becomes publicly known through no breach of this Agreement;
  (b) Was rightfully in your possession before disclosure;
  (c) Is independently developed by you without use of Confidential Information; or
  (d) Is required to be disclosed by law or court order, provided you give Taruvi prior written notice where reasonably possible.

4. INTELLECTUAL PROPERTY
Work product created during the hackathon using Taruvi tools, APIs, or platforms may be subject to separate IP terms communicated at the event. You retain ownership of independently created work that does not incorporate Taruvi's Confidential Information.

5. NO WARRANTIES
Confidential Information is provided "as is." Taruvi makes no representations or warranties, express or implied, regarding its accuracy, completeness, or fitness for any particular purpose.

6. TERM
This Agreement remains in effect for two (2) years from the date of acceptance and survives the conclusion of your participation in TaruviHacks.

7. GOVERNING LAW
This Agreement is governed by applicable law in the jurisdiction of the event. Any disputes arising hereunder shall be resolved in the courts of that jurisdiction.

By clicking "I Agree & Continue", you confirm that you have read, understood, and agree to be legally bound by the terms of this Agreement.`;

// ─── Types ─────────────────────────────────────────────────────────────────
interface TaruviIdentity {
  id?: string;
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface Invitation {
  id: string;
  company_id: string;
  email: string;
  site_slug: string;
  invite_status?: string;
  nda_signed?: boolean;
  nda_signed_at?: string;
  participant_app_slug?: string;
  provider_sync_status?: string;
}

interface Company {
  id: string;
  name: string;
  site_slug?: string;
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

// ─── Design tokens ─────────────────────────────────────────────────────────
const BLUE = "#1E88E5";
const BLUE_LIGHT = "rgba(30, 136, 229, 0.10)";
const BLUE_BORDER = "rgba(30, 136, 229, 0.22)";

const glass: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.74)",
  backdropFilter: "blur(24px) saturate(200%)",
  WebkitBackdropFilter: "blur(24px) saturate(200%)",
  border: "1px solid rgba(255, 255, 255, 0.88)",
  borderRadius: 24,
  boxShadow:
    "0 8px 40px rgba(30, 80, 160, 0.10), 0 1.5px 4px rgba(0,0,0,0.04)",
};

const glassBlue: React.CSSProperties = {
  ...glass,
  background: "rgba(232, 244, 255, 0.82)",
  border: `1px solid ${BLUE_BORDER}`,
};

const PAGE_BG =
  "linear-gradient(140deg, #e4effc 0%, #dce9f8 30%, #eef5ff 65%, #e8f0fb 100%)";

// ─── Slide animation ────────────────────────────────────────────────────────
const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 72 : -72,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 340, damping: 32 },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -72 : 72,
    opacity: 0,
    transition: { duration: 0.16, ease: "easeIn" as const },
  }),
};

// ─── Step dots ──────────────────────────────────────────────────────────────
function StepDots({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <Stack direction="row" spacing={0.75} justifyContent="center" sx={{ mb: 5 }}>
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ width: i === current ? 28 : 8 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          style={{
            height: 8,
            borderRadius: 999,
            backgroundColor:
              i < current
                ? BLUE
                : i === current
                ? BLUE
                : "rgba(0,0,0,0.13)",
            opacity: i < current ? 0.45 : 1,
          }}
        />
      ))}
    </Stack>
  );
}

// ─── Splash screen ──────────────────────────────────────────────────────────
function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2700);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      key="splash"
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: 1.06,
        transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] },
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: PAGE_BG,
      }}
    >
      {/* Ambient glow blobs */}
      <motion.div
        animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: 480,
          height: 480,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(30,136,229,0.18) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.12, 1], opacity: [0.2, 0.38, 0.2] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        style={{
          position: "absolute",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(10,147,196,0.16) 0%, transparent 70%)",
          top: "42%",
          left: "54%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ marginBottom: 28, position: "relative", zIndex: 1 }}
      >
        <Box
          component="img"
          src={LOGO_URL}
          alt="TaruviHacks"
          sx={{
            width: { xs: "52vw", md: "38vw" },
            maxWidth: 560,
            maxHeight: "38vh",
            height: "auto",
            objectFit: "contain",
            filter: "drop-shadow(0 10px 32px rgba(30,136,229,0.26))",
          }}
        />
      </motion.div>

      {/* Wordmark */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.45, ease: "easeOut" }}
        style={{ position: "relative", zIndex: 1, textAlign: "center" }}
      >
        <Typography
          sx={{
            fontFamily: "'Quicksand', sans-serif",
            fontWeight: 800,
            fontSize: { xs: 30, md: 38 },
            color: "#003652",
            letterSpacing: "-0.025em",
            lineHeight: 1,
          }}
        >
          Build-a-thon
        </Typography>
      </motion.div>

      {/* Tagline */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.4, ease: "easeOut" }}
        style={{ position: "relative", zIndex: 1, textAlign: "center" }}
      >
        <Typography
          sx={{
            fontFamily: "'Open Sans', sans-serif",
            fontSize: 15,
            color: "rgba(0,54,82,0.52)",
            mt: 1.25,
            letterSpacing: "0.01em",
          }}
        >
          Build something amazing.
        </Typography>
      </motion.div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.3 }}
        style={{ position: "relative", zIndex: 1, marginTop: 52, width: 120 }}
      >
        <Box sx={{ height: 3, borderRadius: 999, bgcolor: "rgba(30,136,229,0.13)", overflow: "hidden" }}>
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ delay: 1.15, duration: 1.4, ease: "easeInOut" }}
            style={{ height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${BLUE}, #0A93C4)` }}
          />
        </Box>
      </motion.div>
    </motion.div>
  );
}

// ─── Label ──────────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        fontFamily: "'Quicksand', sans-serif",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: BLUE,
        mb: 1,
      }}
    >
      {children}
    </Typography>
  );
}

// ─── Helper message bubble ──────────────────────────────────────────────────
// Animated character will be added here later — for now just the speech bubble.
function HelperMessage({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        background: BLUE_LIGHT,
        border: `1px solid ${BLUE_BORDER}`,
        borderRadius: "16px",
        px: 3,
        py: 2,
        mb: 3.5,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontFamily: "'Quicksand', sans-serif",
          fontWeight: 700,
          color: BLUE,
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          display: "block",
          mb: 0.75,
        }}
      >
        Hackathon Helper
      </Typography>
      <Typography variant="body2" sx={{ color: "#1a2a3a", lineHeight: 1.7 }}>
        {children}
      </Typography>
    </Box>
  );
}

// ─── Step 0 — Welcome ───────────────────────────────────────────────────────
function WelcomeStep({
  name,
  companyName,
  onNext,
}: {
  name: string;
  companyName?: string;
  onNext: () => void;
}) {
  return (
    <Box sx={{ py: 2, textAlign: "center" }}>
      <Typography
        variant="h3"
        sx={{
          fontFamily: "'Quicksand', sans-serif",
          fontWeight: 700,
          mb: 1,
          color: "#1a2a3a",
        }}
      >
        Hey {name}! 👋
      </Typography>

      {companyName && (
        <Box sx={{ mb: 3 }}>
          <Chip
            label={companyName}
            size="small"
            sx={{
              bgcolor: BLUE_LIGHT,
              color: "#1565C0",
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 700,
              fontSize: 12,
            }}
          />
        </Box>
      )}

      <Button
        variant="contained"
        size="large"
        endIcon={<ArrowForwardRoundedIcon />}
        onClick={onNext}
        sx={{ px: 4 }}
      >
        Let's Go!
      </Button>
    </Box>
  );
}

// ─── Step 1 — NDA ───────────────────────────────────────────────────────────
function NdaStep({
  name,
  alreadySigned,
  signing,
  onAgree,
}: {
  name: string;
  alreadySigned: boolean;
  signing: boolean;
  onAgree: () => void;
}) {
  const [agreed, setAgreed] = useState(alreadySigned);

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{
          fontFamily: "'Quicksand', sans-serif",
          fontWeight: 700,
          mb: 0.75,
        }}
      >
        Non-Disclosure Agreement
      </Typography>

      <HelperMessage>
        Before we proceed, {name}, please review and sign the Non-Disclosure Agreement below. This agreement ensures that all proprietary information shared during the hackathon remains confidential. Please read through it carefully, and check the acknowledgment box once you are ready to continue.
      </HelperMessage>

      {alreadySigned && (
        <Alert
          severity="success"
          icon={<CheckCircleRoundedIcon />}
          sx={{ mb: 2.5 }}
        >
          You've already signed this — you're all good to continue!
        </Alert>
      )}

      {/* NDA full text — no scroll, full height */}
      <Box
        sx={{
          ...glassBlue,
          borderRadius: "16px",
          p: 3.5,
          mb: 3,
          fontSize: 13,
          color: "text.secondary",
          lineHeight: 1.8,
          whiteSpace: "pre-wrap",
        }}
      >
        {NDA_TEXT}
      </Box>

      <FormControlLabel
        sx={{ mb: 3, alignItems: "flex-start" }}
        control={
          <Checkbox
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            disabled={alreadySigned}
            sx={{ pt: 0.25 }}
          />
        }
        label={
          <Typography variant="body2" sx={{ pt: 0.25 }}>
            I have read and agree to the Non-Disclosure Agreement above.
          </Typography>
        }
      />

      <Button
        variant="contained"
        size="large"
        disabled={!agreed || signing}
        onClick={onAgree}
        startIcon={
          signing ? (
            <CircularProgress size={16} color="inherit" />
          ) : alreadySigned ? (
            <CheckCircleRoundedIcon />
          ) : undefined
        }
        endIcon={
          !signing && !alreadySigned ? <ArrowForwardRoundedIcon /> : undefined
        }
        sx={{ px: 4 }}
      >
        {signing
          ? "Saving…"
          : alreadySigned
          ? "Already Signed — Continue"
          : "I Agree & Continue"}
      </Button>
    </Box>
  );
}

// ─── Step 2 — Video ─────────────────────────────────────────────────────────
function VideoStep({ name, onNext }: { name: string; onNext: () => void }) {
  return (
    <Box>
      <Typography
        variant="h4"
        sx={{
          fontFamily: "'Quicksand', sans-serif",
          fontWeight: 700,
          mb: 0.75,
        }}
      >
        What is TaruviBase?
      </Typography>

      <HelperMessage>
        With the NDA complete, {name}, let us introduce you to TaruviBase — the platform you will be building on throughout this hackathon. This video provides a comprehensive overview of its capabilities and architecture. Please watch it in full before proceeding to the workspace setup.
      </HelperMessage>

      <Box
        sx={{
          borderRadius: "16px",
          overflow: "hidden",
          mb: 3.5,
          boxShadow: "0 4px 28px rgba(0,0,0,0.14)",
          bgcolor: "#000",
        }}
      >
        <video
          src={VIDEO_URL}
          title="What is TaruviBase?"
          controls
          autoPlay
          style={{ width: "100%", display: "block", maxHeight: "60vh" }}
        />
      </Box>

      <Button
        variant="contained"
        size="large"
        endIcon={<ArrowForwardRoundedIcon />}
        onClick={onNext}
        sx={{ px: 4 }}
      >
        Continue
      </Button>
    </Box>
  );
}

// ─── Step 3 — Themes ────────────────────────────────────────────────────────
function ThemesStep({
  name,
  themes,
  onNext,
}: {
  name: string;
  themes: Theme[];
  onNext: () => void;
}) {
  return (
    <Box>
      <Typography
        variant="h4"
        sx={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, mb: 0.75 }}
      >
        Your Hackathon Themes
      </Typography>

      <HelperMessage>
        Now that you have an understanding of TaruviBase, {name}, here are the themes assigned to your company for this hackathon. These are the problem areas your team will be building solutions for. Take a moment to review them before setting up your workspace.
      </HelperMessage>

      {themes.length === 0 ? (
        <Box
          sx={{
            ...glassBlue,
            borderRadius: "16px",
            p: 4,
            textAlign: "center",
            mb: 4,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No themes have been assigned to your company yet. Please check with your administrator.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fill, minmax(260px, 1fr))" },
            gap: 2.5,
            mb: 4,
          }}
        >
          {themes.map((theme) => (
            <Box
              key={theme.id}
              sx={{
                ...glass,
                borderRadius: "16px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {theme.image_url ? (
                <Box
                  component="img"
                  src={theme.image_url}
                  alt={theme.name}
                  sx={{ width: "100%", height: 160, objectFit: "cover" }}
                />
              ) : (
                <Box
                  sx={{
                    height: 160,
                    background: `linear-gradient(135deg, ${BLUE_LIGHT}, rgba(10,147,196,0.12))`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography sx={{ fontSize: 48 }}>🎨</Typography>
                </Box>
              )}
              <Box sx={{ p: 3 }}>
                <Typography
                  variant="h6"
                  sx={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, mb: 0.5 }}
                >
                  {theme.name}
                </Typography>
                {theme.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {theme.description}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Button
        variant="contained"
        size="large"
        endIcon={<ArrowForwardRoundedIcon />}
        onClick={onNext}
        sx={{ px: 4 }}
      >
        Continue
      </Button>
    </Box>
  );
}

// ─── Step 3 — Create App ────────────────────────────────────────────────────
function CreateAppStep({
  name,
  siteSlug,
  onNext,
}: {
  name: string;
  siteSlug?: string;
  onNext: () => void;
}) {
  const siteUrl = siteSlug ? `https://${siteSlug}.taruvi.cloud` : null;

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, mb: 0.75 }}
      >
        Creating Your Application
      </Typography>

      <HelperMessage>
        Your Taruvi site is live and ready, {name}. The first step is to create an application on your site console — this will serve as the container for all the data models and APIs you build during the hackathon. Follow the screenshots below in sequence to complete the setup.
      </HelperMessage>

      {/* Site console link */}
      {siteUrl && (
        <Box
          sx={{
            ...glassBlue,
            borderRadius: "16px",
            p: 3,
            mb: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Label>Your Site Console</Label>
            <Typography
              sx={{
                fontFamily: "monospace",
                fontSize: { xs: 14, sm: 17 },
                fontWeight: 600,
                color: "#003652",
                wordBreak: "break-all",
                mt: 0.5,
              }}
            >
              {siteUrl}
            </Typography>
          </Box>
          <Button
            variant="contained"
            endIcon={<OpenInNewRoundedIcon />}
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ flexShrink: 0 }}
          >
            Open Console
          </Button>
        </Box>
      )}

      {/* Steps */}
      <Box sx={{ ...glass, borderRadius: "16px", p: 3.5, mb: 4 }}>
        <Label>Steps to Create an App</Label>
        <Stack spacing={2} sx={{ mt: 1.5 }}>
          {[
            "Click on your site from the site console dashboard",
            "Click on \"Create New App\" to begin setting up your application",
            "Fill in the app details and click \"Create App\" to confirm",
          ].map((s, i) => (
            <Stack key={i} direction="row" spacing={2} alignItems="flex-start">
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  bgcolor: BLUE,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontFamily: "'Quicksand', sans-serif",
                }}
              >
                {i + 1}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, pt: 0.2 }}>
                {s}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* Screenshot stack */}
      <ScreenshotStack screenshots={APP_SCREENSHOTS} />

      <Button
        variant="contained"
        size="large"
        endIcon={<ArrowForwardRoundedIcon />}
        onClick={onNext}
        sx={{ px: 4 }}
      >
        Continue
      </Button>
    </Box>
  );
}

// ─── Step 4 — Create API ────────────────────────────────────────────────────
const CREATE_API_STEPS = [
  "Click on your app from the site console dashboard",
  'Click on "Settings" from the left navigation bar',
  'Within Settings, click on "Connect"',
  'Click "Generate API Key" to create your API credentials',
  "Create the key and copy the generated environment variables into your project",
];

function ScreenshotStack({ screenshots }: { screenshots: { src: string; alt: string }[] }) {
  return (
    <Stack spacing={0} sx={{ mb: 4 }}>
      {screenshots.map((img, i) => (
        <React.Fragment key={img.src}>
          <Box>
            <Box
              sx={{
                ...glass,
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
              }}
            >
              <Box
                component="img"
                src={img.src}
                alt={img.alt}
                sx={{ width: "100%", display: "block" }}
              />
            </Box>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 1,
                color: "text.secondary",
                fontFamily: "'Quicksand', sans-serif",
                fontWeight: 600,
              }}
            >
              Step {i + 1} — {img.alt}
            </Typography>
          </Box>
          {i < screenshots.length - 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  bgcolor: BLUE_LIGHT,
                  border: `1px solid ${BLUE_BORDER}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ChevronRightRoundedIcon
                  sx={{ fontSize: 22, color: BLUE, transform: "rotate(90deg)" }}
                />
              </Box>
            </Box>
          )}
        </React.Fragment>
      ))}
    </Stack>
  );
}

function CreateApiStep({
  name,
  onNext,
}: {
  name: string;
  onNext: () => void;
}) {
  return (
    <Box>
      <Typography
        variant="h4"
        sx={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, mb: 0.75 }}
      >
        Generating an API
      </Typography>

      <HelperMessage>
        With your application created, {name}, the next step is to generate an API. APIs define the data schemas and expose the endpoints your frontend will call. Follow the steps and screenshots below to configure your first API on TaruviBase.
      </HelperMessage>

      {/* Written steps */}
      <Box sx={{ ...glass, borderRadius: "16px", p: 3.5, mb: 4 }}>
        <Label>Steps to Generate an API</Label>
        <Stack spacing={2} sx={{ mt: 1.5 }}>
          {CREATE_API_STEPS.map((s, i) => (
            <Stack key={i} direction="row" spacing={2} alignItems="flex-start">
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  bgcolor: BLUE,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontFamily: "'Quicksand', sans-serif",
                }}
              >
                {i + 1}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, pt: 0.2 }}>
                {s}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <ScreenshotStack screenshots={API_SCREENSHOTS} />

      <Button
        variant="contained"
        size="large"
        endIcon={<ArrowForwardRoundedIcon />}
        onClick={onNext}
        sx={{ px: 4 }}
      >
        Continue
      </Button>
    </Box>
  );
}

// ─── Step 6 — Register App / Configure Codex ────────────────────────────────
function RegisterAppStep({
  name,
  invitation,
  onNext,
  onSuccess,
}: {
  name: string;
  invitation: { id: string; site_slug: string; participant_app_slug?: string; provider_sync_status?: string } | undefined;
  onNext: () => void;
  onSuccess: (appSlug: string, apiKey: string) => void;
}) {
  const alreadySynced = invitation?.provider_sync_status === "synced";
  const [appSlug, setAppSlug] = useState(invitation?.participant_app_slug ?? "");
  const [appApiKey, setAppApiKey] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(alreadySynced);
  const [syncError, setSyncError] = useState<string | null>(null);

  const siteUrl = invitation?.site_slug ? `https://${invitation.site_slug}.taruvi.cloud` : null;

  const handleRegister = async () => {
    const slug = appSlug.trim();
    const key = appApiKey.trim();
    if (!slug || !key || !invitation || !siteUrl) return;
    setSyncing(true);
    setSyncError(null);
    try {
      await syncParticipantProviderSecret({
        invitationId: invitation.id,
        participantAppSlug: slug,
        participantApiKey: key,
        participantSiteUrl: siteUrl,
      });
      onSuccess(slug, key);
      setSynced(true);
    } catch (err: unknown) {
      setSyncError(
        err instanceof Error
          ? err.message
          : "Configuration failed. Check your app slug and API key, then try again."
      );
    } finally {
      setSyncing(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    fontSize: 14,
    fontFamily: "monospace",
    border: `1px solid rgba(0,0,0,0.18)`,
    borderRadius: 10,
    background: "rgba(255,255,255,0.8)",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, mb: 0.75 }}
      >
        Register Your App
      </Typography>

      <HelperMessage>
        Almost there, {name}! Paste in your app slug and the API key you generated in the previous step. This lets the platform configure your AI credentials automatically — no manual key entry needed in your Codespace.
      </HelperMessage>

      {siteUrl && (
        <Box
          sx={{
            ...glassBlue,
            borderRadius: "16px",
            p: 3,
            mb: 3.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Label>Your Site Console</Label>
            <Typography
              sx={{
                fontFamily: "monospace",
                fontSize: { xs: 13, sm: 16 },
                fontWeight: 600,
                color: "#003652",
                wordBreak: "break-all",
                mt: 0.5,
              }}
            >
              {siteUrl}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            endIcon={<OpenInNewRoundedIcon />}
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ flexShrink: 0 }}
          >
            Open Console
          </Button>
        </Box>
      )}

      {synced ? (
        <Box sx={{ ...glassBlue, borderRadius: "16px", p: 4, textAlign: "center", mb: 3.5 }}>
          <CheckCircleRoundedIcon
            sx={{ fontSize: 52, color: "#2e7d32", mb: 1.5, display: "block", mx: "auto" }}
          />
          <Typography
            variant="h6"
            sx={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, mb: 0.75 }}
          >
            Credentials Configured!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your AI credentials are set up. Your Codespace will have access automatically.
          </Typography>
          <Button
            variant="text"
            size="small"
            sx={{ mt: 2, color: "text.secondary", fontSize: 12 }}
            onClick={() => { setSynced(false); setAppSlug(""); setAppApiKey(""); setSyncError(null); }}
          >
            Register a different app
          </Button>
        </Box>
      ) : (
        <Box sx={{ ...glass, borderRadius: "16px", p: 3.5, mb: 3 }}>
          <Stack spacing={2.5}>
            {syncError && (
              <Box
                sx={{
                  bgcolor: "rgba(211,47,47,0.08)",
                  border: "1px solid rgba(211,47,47,0.22)",
                  borderRadius: "12px",
                  p: 2,
                }}
              >
                <Typography variant="body2" sx={{ color: "#c62828" }}>
                  {syncError}
                </Typography>
              </Box>
            )}

            <Box>
              <Label>App Slug</Label>
              <input
                style={inputStyle}
                placeholder="my-app"
                value={appSlug}
                onChange={(e) => setAppSlug(e.target.value)}
                disabled={syncing}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                Found in your app's Settings → Connect page
              </Typography>
            </Box>

            <Box>
              <Label>API Key</Label>
              <input
                style={inputStyle}
                type="password"
                placeholder="taruvi_..."
                value={appApiKey}
                onChange={(e) => setAppApiKey(e.target.value)}
                disabled={syncing}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                Generated from Settings → Connect → Generate API Key
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="large"
              disabled={!appSlug.trim() || !appApiKey.trim() || syncing || !invitation}
              onClick={handleRegister}
              startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{ px: 4, alignSelf: "flex-start" }}
            >
              {syncing ? "Configuring…" : "Register App"}
            </Button>
          </Stack>
        </Box>
      )}

      {synced && (
        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForwardRoundedIcon />}
          onClick={onNext}
          sx={{ px: 4 }}
        >
          Continue
        </Button>
      )}
    </Box>
  );
}

// ─── Step 7 — Codespace ─────────────────────────────────────────────────────
const CODESPACE_FEATURES = [
  "Node.js pre-installed",
  "Taruvi SDK ready",
  "Sample starter code",
  "Instant cloud IDE",
];

function CodespaceStep({
  name,
  siteSlug,
  registeredAppSlug,
  registeredApiKey,
}: {
  name: string;
  siteSlug?: string;
  registeredAppSlug?: string;
  registeredApiKey?: string;
}) {
  const [envOpen, setEnvOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const siteUrl = siteSlug ? `https://${siteSlug}.taruvi.cloud` : "";
  const hasEnv = !!(siteUrl && registeredAppSlug && registeredApiKey);
  const alreadyRegistered = !!(registeredAppSlug && !registeredApiKey);
  const envBlock = hasEnv
    ? `TARUVI_SITE_URL=${siteUrl}\nTARUVI_APP_SLUG=${registeredAppSlug}\nTARUVI_API_KEY=${registeredApiKey}`
    : "";

  const handleCopy = () => {
    if (!envBlock) return;
    navigator.clipboard.writeText(envBlock).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Box sx={{ py: 2 }}>
      {/* GitHub icon */}
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: BLUE_LIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mx: "auto",
          mb: 3,
        }}
      >
        <GitHubIcon sx={{ fontSize: 40, color: BLUE }} />
      </Box>

      <Typography
        variant="h4"
        sx={{
          fontFamily: "'Quicksand', sans-serif",
          fontWeight: 700,
          mb: 1.25,
          textAlign: "center",
        }}
      >
        Your Development Environment
      </Typography>

      <HelperMessage>
        Setup is complete, {name}. Your GitHub Codespace is pre-configured with Node.js, the Taruvi SDK, and a starter template — no local installation required. Click the button below to launch your environment and begin building. We look forward to seeing what you create.
      </HelperMessage>

      {/* Feature chips */}
      <Stack
        direction="row"
        spacing={1}
        justifyContent="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 4, gap: 1 }}
      >
        {CODESPACE_FEATURES.map((f) => (
          <Chip
            key={f}
            label={f}
            size="small"
            sx={{
              bgcolor: BLUE_LIGHT,
              color: "#1565C0",
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 700,
              border: `1px solid ${BLUE_BORDER}`,
            }}
          />
        ))}
      </Stack>

      <Button
        variant="contained"
        size="large"
        href={CODESPACE_URL}
        target="_blank"
        rel="noopener noreferrer"
        startIcon={<GitHubIcon />}
        endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 16 }} />}
        sx={{ px: 4, py: 1.25, fontSize: 15, mb: 3 }}
      >
        Open in GitHub Codespace
      </Button>

      {/* Already registered in a prior session */}
      {alreadyRegistered && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: "12px" }}>
          Your AI credentials were configured in a previous session for app <strong>{registeredAppSlug}</strong>. If you need your Taruvi connection values, open your app → Settings → Connect.
        </Alert>
      )}

      {/* Env values accordion — only shown when fresh registration just completed */}
      {hasEnv && (
        <Box
          sx={{
            ...glassBlue,
            borderRadius: "16px",
            overflow: "hidden",
            mb: 2,
          }}
        >
          <Box
            onClick={() => setEnvOpen((o) => !o)}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 3,
              py: 2,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <Typography
              sx={{
                fontFamily: "'Quicksand', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                color: BLUE,
              }}
            >
              Your environment values
            </Typography>
            <ExpandMoreRoundedIcon
              sx={{
                color: BLUE,
                fontSize: 22,
                transform: envOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          </Box>

          <Collapse in={envOpen}>
            <Box sx={{ px: 3, pb: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5, lineHeight: 1.6 }}>
                When the Codespace opens, click <strong>⚙️ Setup .env</strong> in the status bar, paste these three values, then save. Then click <strong>🔑 Connect Codex</strong> — this completes your Codex integration with the Taruvi platform's MCP context.
              </Typography>

              <Box sx={{ position: "relative" }}>
                <Box
                  component="pre"
                  sx={{
                    fontFamily: "monospace",
                    fontSize: 12.5,
                    lineHeight: 1.9,
                    bgcolor: "rgba(255,255,255,0.7)",
                    border: `1px solid ${BLUE_BORDER}`,
                    borderRadius: "10px",
                    p: 2,
                    m: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    color: "#003652",
                    pr: 5,
                  }}
                >
                  {envBlock}
                </Box>
                <IconButton
                  size="small"
                  onClick={handleCopy}
                  sx={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    bgcolor: copied ? "success.light" : "rgba(255,255,255,0.9)",
                    border: `1px solid ${BLUE_BORDER}`,
                    "&:hover": { bgcolor: BLUE_LIGHT },
                  }}
                >
                  {copied ? (
                    <CheckCircleRoundedIcon sx={{ fontSize: 16, color: "success.dark" }} />
                  ) : (
                    <ContentCopyRoundedIcon sx={{ fontSize: 16, color: BLUE }} />
                  )}
                </IconButton>
              </Box>
            </Box>
          </Collapse>
        </Box>
      )}

      {siteSlug && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.disabled">
            Your site console:{" "}
            <a
              href={`https://${siteSlug}.taruvi.cloud`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: BLUE }}
            >
              {siteSlug}.taruvi.cloud
            </a>
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// ─── Main Onboarding component ───────────────────────────────────────────────
const TOTAL_STEPS = 8;

// ─── Hackathon picker (shown when user has multiple invitations) ────────────
function HackathonPickerScreen({
  invitations,
  companyMap,
  onSelect,
}: {
  invitations: Invitation[];
  companyMap: Record<string, Company>;
  onSelect: (id: string) => void;
}) {
  return (
    <Box
      sx={{
        minHeight: "calc(100vh - var(--nav-height, 60px))",
        background: PAGE_BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 3,
      }}
    >
      <Box sx={{ ...glass, borderRadius: "24px", p: 5, maxWidth: 560, width: "100%" }}>
        <Label>Select Hackathon</Label>
        <Typography
          variant="h5"
          sx={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, mb: 1 }}
        >
          Which hackathon are you setting up?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          You have invitations to multiple hackathons. Pick the one you'd like to work on now.
        </Typography>
        <Stack spacing={1.5}>
          {invitations.map((inv) => {
            const co = companyMap[inv.company_id];
            return (
              <Box
                key={inv.id}
                onClick={() => onSelect(inv.id)}
                sx={{
                  ...glassBlue,
                  borderRadius: "14px",
                  p: 2.5,
                  cursor: "pointer",
                  transition: "box-shadow 0.15s, border-color 0.15s",
                  "&:hover": {
                    boxShadow: "0 4px 20px rgba(30,80,160,0.15)",
                    borderColor: BLUE,
                  },
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography
                      sx={{
                        fontFamily: "'Quicksand', sans-serif",
                        fontWeight: 700,
                        fontSize: 16,
                        color: "#1a2a3a",
                      }}
                    >
                      {co?.name ?? inv.site_slug}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {inv.site_slug}
                      {inv.nda_signed ? " · NDA signed" : " · NDA pending"}
                    </Typography>
                  </Box>
                  <ChevronRightRoundedIcon sx={{ color: BLUE, opacity: 0.7 }} />
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}

export const Onboarding: React.FC = () => {
  const { open: notify } = useNotification();
  const [splashDone, setSplashDone] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [ndaSigning, setNdaSigning] = useState(false);
  const [selectedInvitationId, setSelectedInvitationId] = useState<string | null>(null);
  const [registeredAppSlug, setRegisteredAppSlug] = useState<string>("");
  const [registeredApiKey, setRegisteredApiKey] = useState<string>("");

  const { data: identity, isLoading: identityLoading } =
    useGetIdentity<TaruviIdentity>();

  // Match on both email and username — a Taruvi account created with a typo
  // in the email field will still resolve via the username field.
  const identityFilters = useMemo(() => {
    const candidates = [
      ...new Set(
        [identity?.email, identity?.username].filter((v): v is string => !!v)
      ),
    ];
    if (candidates.length === 0) return [];
    return [
      {
        field: "email",
        operator: candidates.length === 1 ? ("eq" as const) : ("in" as const),
        value: candidates.length === 1 ? candidates[0] : candidates,
      },
    ];
  }, [identity?.email, identity?.username]);

  const hasIdentity = !!(identity?.email || identity?.username);

  const { result: invitationsResult, query: invQuery } = useList<Invitation>({
    resource: "invitations",
    filters: identityFilters,
    sorters: [{ field: "invited_at", order: "desc" as const }],
    pagination: { pageSize: 50 },
    queryOptions: { enabled: hasIdentity && identityFilters.length > 0 },
  });

  const allInvitations = invitationsResult?.data ?? [];

  // Fetch companies for all invitations so we can filter out deleted ones.
  const pickerCompanyIds = allInvitations.map((i) => i.company_id).filter(Boolean);
  const { result: pickerCompaniesResult } = useList<Company>({
    resource: "companies",
    filters: pickerCompanyIds.length > 0
      ? [{ field: "id", operator: "in" as const, value: pickerCompanyIds }]
      : [],
    pagination: { pageSize: 50 },
    queryOptions: { enabled: pickerCompanyIds.length > 0 },
  });
  const pickerCompanyMap: Record<string, Company> = {};
  for (const c of (pickerCompaniesResult?.data ?? [])) {
    pickerCompanyMap[c.id] = c;
  }

  // Only show invitations whose company still exists — filters out deleted companies.
  const existingCompanyIds = new Set(Object.keys(pickerCompanyMap));
  const validInvitations = pickerCompanyIds.length > 0 && pickerCompaniesResult
    ? allInvitations.filter((i) => existingCompanyIds.has(i.company_id))
    : allInvitations;

  const invitation = selectedInvitationId
    ? (validInvitations.find((i) => i.id === selectedInvitationId) ?? validInvitations[0])
    : validInvitations[0];
  const needsPicker = validInvitations.length > 1 && !selectedInvitationId;

  useEffect(() => {
    if (invitation?.provider_sync_status === "synced" && invitation.participant_app_slug && !registeredAppSlug) {
      setRegisteredAppSlug(invitation.participant_app_slug);
    }
  }, [invitation?.provider_sync_status, invitation?.participant_app_slug]);

  const { result: company } = useOne<Company>({
    resource: "companies",
    id: invitation?.company_id ?? "",
    queryOptions: { enabled: !!invitation?.company_id },
  });

  // Themes assigned to this company
  const companyThemeFilters = useMemo(
    () =>
      invitation?.company_id
        ? [{ field: "company_id", operator: "eq" as const, value: invitation.company_id }]
        : [],
    [invitation?.company_id]
  );
  const { result: companyThemesResult } = useList<CompanyTheme>({
    resource: "company_themes",
    filters: companyThemeFilters,
    pagination: { pageSize: 10 },
    queryOptions: { enabled: !!invitation?.company_id },
  });
  const companyThemeIds = (companyThemesResult?.data ?? []).map((ct) => ct.theme_id);

  const themeFilters = useMemo(
    () =>
      companyThemeIds.length > 0
        ? [{ field: "id", operator: "in" as const, value: companyThemeIds }]
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companyThemeIds.join(",")]
  );
  const { result: themesResult } = useList<Theme>({
    resource: "themes",
    filters: themeFilters,
    pagination: { pageSize: 10 },
    queryOptions: { enabled: companyThemeIds.length > 0 },
  });
  const assignedThemes = themesResult?.data ?? [];

  const { mutate: updateInv } = useUpdate();

  const displayName =
    identity?.full_name ||
    [identity?.first_name, identity?.last_name].filter(Boolean).join(" ") ||
    identity?.username ||
    (identity?.email ?? "").split("@")[0] ||
    "Hacker";

  const goNext = () => {
    setDir(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const goPrev = () => {
    setDir(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleNdaAgree = () => {
    if (invitation?.nda_signed) {
      goNext();
      return;
    }
    if (!invitation) return;
    setNdaSigning(true);
    updateInv(
      {
        resource: "invitations",
        id: invitation.id,
        values: {
          nda_signed: true,
          nda_signed_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          setNdaSigning(false);
          notify?.({ message: "NDA signed successfully.", type: "success" });
          goNext();
        },
        onError: () => {
          setNdaSigning(false);
          notify?.({
            message: "Failed to record NDA signature. Please try again.",
            type: "error",
          });
        },
      }
    );
  };

  const siteSlug = invitation?.site_slug || company?.site_slug;

  // ── Inner content (shown after splash exits) ──
  const renderContent = () => {
    // Still loading data
    if (identityLoading || (hasIdentity && invQuery.isLoading)) {
      return (
        <Box
          sx={{
            minHeight: "calc(100vh - var(--nav-height, 60px))",
            background: PAGE_BG,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress />
        </Box>
      );
    }

    // Multiple hackathons — let the user choose
    if (needsPicker) {
      return (
        <HackathonPickerScreen
          invitations={validInvitations}
          companyMap={pickerCompanyMap}
          onSelect={setSelectedInvitationId}
        />
      );
    }

    // No invitation found
    if (!invitation) {
      return (
        <Box
          sx={{
            minHeight: "calc(100vh - var(--nav-height, 60px))",
            background: PAGE_BG,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: 3,
          }}
        >
          <Box
            sx={{
              ...glass,
              borderRadius: "24px",
              p: 5,
              maxWidth: 480,
              textAlign: "center",
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontFamily: "'Quicksand', sans-serif",
                fontWeight: 700,
                mb: 1.5,
              }}
            >
              No invitation found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              We couldn't find an invitation for{" "}
              <strong>{identity?.email}</strong>. Please contact your
              administrator.
            </Typography>
          </Box>
        </Box>
      );
    }

    // Step flow
    return (
      <motion.div
        key="steps"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Box
          sx={{
            minHeight: "calc(100vh - var(--nav-height, 60px))",
            background: PAGE_BG,
            py: { xs: 5, md: 7 },
            px: { xs: 2, md: 4 },
          }}
        >
          <Box sx={{ maxWidth: "75vw", mx: "auto" }}>
            <StepDots current={step} total={TOTAL_STEPS} />

            <Box sx={{ overflow: "hidden" }}>
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={step}
                  custom={dir}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <Box
                    sx={{
                      ...glass,
                      borderRadius: "24px",
                      p: { xs: 4, md: 6 },
                    }}
                  >
                    {step === 0 && (
                      <WelcomeStep
                        name={displayName}
                        companyName={company?.name}
                        onNext={goNext}
                      />
                    )}
                    {step === 1 && (
                      <NdaStep
                        name={displayName}
                        alreadySigned={!!invitation?.nda_signed}
                        signing={ndaSigning}
                        onAgree={handleNdaAgree}
                      />
                    )}
                    {step === 2 && <VideoStep name={displayName} onNext={goNext} />}
                    {step === 3 && (
                      <ThemesStep name={displayName} themes={assignedThemes} onNext={goNext} />
                    )}
                    {step === 4 && (
                      <CreateAppStep name={displayName} siteSlug={siteSlug} onNext={goNext} />
                    )}
                    {step === 5 && (
                      <CreateApiStep name={displayName} onNext={goNext} />
                    )}
                    {step === 6 && (
                      <RegisterAppStep
                        name={displayName}
                        invitation={invitation ? { id: invitation.id, site_slug: invitation.site_slug, participant_app_slug: invitation.participant_app_slug, provider_sync_status: invitation.provider_sync_status } : undefined}
                        onNext={goNext}
                        onSuccess={(slug, key) => {
                          setRegisteredAppSlug(slug);
                          setRegisteredApiKey(key);
                        }}
                      />
                    )}
                    {step === 7 && (
                      <CodespaceStep
                        name={displayName}
                        siteSlug={siteSlug}
                        registeredAppSlug={registeredAppSlug}
                        registeredApiKey={registeredApiKey}
                      />
                    )}
                  </Box>
                </motion.div>
              </AnimatePresence>
            </Box>

            {step > 0 && (
              <Box sx={{ mt: 2.5, textAlign: "center" }}>
                <Button
                  size="small"
                  startIcon={<ArrowBackRoundedIcon />}
                  onClick={goPrev}
                  sx={{ color: "text.secondary", opacity: 0.7 }}
                >
                  Back
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </motion.div>
    );
  };

  return (
    <>
      <AnimatePresence>
        {!splashDone && (
          <SplashScreen onDone={() => setSplashDone(true)} />
        )}
      </AnimatePresence>


      <AnimatePresence>
        {splashDone && renderContent()}
      </AnimatePresence>

      {/* Builder + bubble — outside all glass/motion containers so position:fixed works */}
      {splashDone && step === 0 && (
        <Box
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            zIndex: 10,
            pointerEvents: "none",
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 0,
          }}
        >
          {/* Builder character */}
          <Box
            component="img"
            src={BUILDER_URL}
            alt="Hackathon Helper"
            sx={{
              width: { xs: 90, md: 130 },
              height: "auto",
              flexShrink: 0,
            }}
          />

          {/* Speech bubble — to the right of the builder */}
          <Box sx={{ position: "relative", mb: "72px", width: "max-content", maxWidth: { xs: 420, md: 680 } }}>
            {/* Tail pointing left toward the builder */}
            <Box
              sx={{
                position: "absolute",
                left: -8,
                bottom: 16,
                width: 14,
                height: 14,
                background: "rgba(255,255,255,0.96)",
                borderTop: `1px solid ${BLUE_BORDER}`,
                borderLeft: `1px solid ${BLUE_BORDER}`,
                transform: "rotate(45deg)",
              }}
            />
            <Box
              sx={{
                background: "rgba(255,255,255,0.96)",
                border: `1px solid ${BLUE_BORDER}`,
                borderRadius: "12px",
                px: 2,
                py: 1.5,
                boxShadow: "0 4px 16px rgba(30,80,160,0.10)",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontFamily: "'Quicksand', sans-serif",
                  fontWeight: 700,
                  color: BLUE,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  display: "block",
                  mb: 0.5,
                }}
              >
                Build-a-thon Helper
              </Typography>
              <Typography variant="body2" sx={{ color: "#1a2a3a", lineHeight: 1.6, fontSize: 14 }}>
                Welcome to Build-a-thon! I'll walk you through every step — NDA, TaruviBase intro, and workspace setup. Follow along and you'll be building in no time!
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
};
