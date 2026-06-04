import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import { githubOAuthExchange } from "../../services/taruviCloudApi";

const PAGE_BG =
  "linear-gradient(140deg, #e4effc 0%, #dce9f8 30%, #eef5ff 65%, #e8f0fb 100%)";

export const GitHubCallback: React.FC = () => {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const savedState = localStorage.getItem("gh_oauth_state");
    const codeVerifier = localStorage.getItem("gh_pkce_verifier");

    if (!code || !codeVerifier) {
      setStatus("error");
      setErrorMsg("Missing OAuth code. Please try connecting GitHub again.");
      return;
    }

    if (state !== savedState) {
      setStatus("error");
      setErrorMsg("State mismatch — possible CSRF. Please try connecting GitHub again.");
      return;
    }

    githubOAuthExchange({
      code,
      codeVerifier,
      redirectUri: `${window.location.origin}/github/callback`,
    })
      .then(({ access_token, github_username }) => {
        localStorage.setItem("gh_access_token", access_token);
        localStorage.setItem("gh_username", github_username);
        localStorage.removeItem("gh_oauth_state");
        localStorage.removeItem("gh_pkce_verifier");
        setStatus("success");
        // Tab was opened by window.open() so window.close() works
        setTimeout(() => window.close(), 800);
      })
      .catch((err) => {
        setStatus("error");
        setErrorMsg(
          err instanceof Error ? err.message : "Failed to connect GitHub. Please try again."
        );
      });
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: 2,
        background: PAGE_BG,
      }}
    >
      {status === "loading" && (
        <>
          <CircularProgress />
          <Typography
            sx={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 600, fontSize: 16 }}
          >
            Connecting GitHub account…
          </Typography>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircleRoundedIcon sx={{ fontSize: 64, color: "#2e7d32" }} />
          <Typography
            sx={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: 18 }}
          >
            GitHub connected!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This tab will close automatically. If it doesn't,{" "}
            <span
              style={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={() => window.close()}
            >
              click here to close it
            </span>
            .
          </Typography>
        </>
      )}
      {status === "error" && (
        <>
          <ErrorRoundedIcon sx={{ fontSize: 64, color: "#c62828" }} />
          <Typography
            color="error"
            sx={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700 }}
          >
            {errorMsg}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please close this tab and try again from the onboarding page.
          </Typography>
        </>
      )}
    </Box>
  );
};
