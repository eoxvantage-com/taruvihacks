import { taruviClient } from "../taruviClient";

const APP_SLUG = __TARUVI_APP_SLUG__;
const SITE_URL = __TARUVI_SITE_URL__;
const API_KEY = __TARUVI_API_KEY__;

function extractCleanMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.message === "string") return parsed.message;
    if (Array.isArray(parsed?.detail)) return String(parsed.detail[0] ?? raw);
    if (typeof parsed?.detail === "string") return parsed.detail;
  } catch { /* not JSON */ }
  // Python dict repr: {'message': '...'}
  const m = raw.match(/['"]message['"]\s*:\s*['"]([^'"]+)['"]/);
  if (m) return m[1];
  return raw;
}

async function callFunction(slug: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await taruviClient.httpClient.post<{ status: string; data: Record<string, unknown> | null }>(
    `api/apps/${APP_SLUG}/functions/${slug}/execute/`,
    { async: false, params }
  );
  const inner = res?.data ?? {};
  if (inner?.success === false) {
    const raw = String(inner?.message ?? inner?.error ?? "Function returned error");
    throw new Error(extractCleanMessage(raw));
  }
  return inner;
}

export interface CreateSiteParams {
  orgSlug: string;
  orgId: number;
  siteName: string;
  description?: string;
  environment?: string;
}

export interface InviteUserParams {
  orgSlug: string;
  email: string;
  siteSlug: string;
}

export interface TaruviInvitation {
  id?: string | number;
  invitee_identifier?: string;
  status?: string;
  created?: string;
  accepted?: boolean;
}

export async function createTaruviSite(params: CreateSiteParams): Promise<Record<string, unknown>> {
  return callFunction("create-hackathon-site", {
    site_slug: params.siteName,
    org_slug: params.orgSlug,
    org_id: params.orgId,
    name: params.siteName,
    description: params.description ?? "",
    site_environment: params.environment ?? "production",
  });
}

export async function inviteUserToSite(params: InviteUserParams): Promise<Record<string, unknown>> {
  return callFunction("invite-hackathon-user", {
    email: params.email,
    site_slug: params.siteSlug,
    org_slug: params.orgSlug,
  });
}

export async function uploadStorageObject(file: File, filename: string): Promise<string> {
  const form = new FormData();
  form.append("file", file, filename);

  const res = await fetch(
    `${SITE_URL}/api/apps/${APP_SLUG}/storage/buckets/storage/objects/`,
    {
      method: "POST",
      headers: { Authorization: `Api-Key ${API_KEY}` },
      body: form,
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail ?? `Upload failed (${res.status})`);
  }

  const encoded = encodeURIComponent(filename);
  return `${SITE_URL}/api/apps/${APP_SLUG}/storage/buckets/storage/objects/${encoded}`;
}

export async function listTaruviInvitations(orgSlug: string): Promise<TaruviInvitation[]> {
  const result = await callFunction("list-hackathon-invitations", { org_slug: orgSlug });
  return (result?.invitations ?? []) as TaruviInvitation[];
}

export async function sendSurveyEmails(companyId: string): Promise<Record<string, unknown>> {
  return callFunction("send-hackathon-survey-emails", { company_id: companyId });
}

export async function storeProviderKey(params: {
  companyId: string;
  providerType: string;
  apiKey: string;
  capacity: number;
}): Promise<Record<string, unknown>> {
  return callFunction("store-provider-key", {
    company_id: params.companyId,
    provider_type: params.providerType,
    api_key: params.apiKey,
    capacity: params.capacity,
  });
}

export async function deleteCompanyProviderSecrets(companyId: string): Promise<void> {
  await callFunction("delete-company-data", { company_id: companyId });
}

export async function deleteCompanyInvitations(companyId: string): Promise<void> {
  const res = await taruviClient.httpClient.get<{ results: { id: string }[]; count: number }>(
    `api/apps/${APP_SLUG}/datatables/invitations/?company_id=${encodeURIComponent(companyId)}&page_size=500`
  );
  const rows = res?.results ?? [];
  await Promise.all(
    rows.map((row) =>
      taruviClient.httpClient.delete(`api/apps/${APP_SLUG}/datatables/invitations/${row.id}/`)
    )
  );
}

export async function syncParticipantProviderSecret(params: {
  invitationId: string;
  participantAppSlug: string;
  participantSiteUrl: string;
}): Promise<Record<string, unknown>> {
  return callFunction("sync-provider-secret", {
    invitation_id: params.invitationId,
    participant_app_slug: params.participantAppSlug,
    participant_site_url: params.participantSiteUrl,
  });
}

export async function acceptEula(invitationId: string): Promise<void> {
  await callFunction("accept-eula", { invitation_id: invitationId });
}

// ─── GitHub OAuth + Codespace ─────────────────────────────────────────────────

export async function githubOAuthExchange(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<{ access_token: string; github_username: string; github_email: string }> {
  const result = await callFunction("github-oauth-exchange", {
    code: params.code,
    code_verifier: params.codeVerifier,
    redirect_uri: params.redirectUri,
  });
  return {
    access_token: result.access_token as string,
    github_username: result.github_username as string,
    github_email: (result.github_email as string) ?? "",
  };
}

export async function createCodespace(params: {
  githubToken: string;
  displayName: string;
}): Promise<{ codespace_name: string; web_url: string; state: string }> {
  const result = await callFunction("github-create-codespace", {
    github_token: params.githubToken,
    display_name: params.displayName,
  });
  return {
    codespace_name: result.codespace_name as string,
    web_url: (result.web_url as string) ?? "",
    state: (result.state as string) ?? "",
  };
}

export async function injectCodespaceSecrets(params: {
  githubToken: string;
  codespaceName: string;
  taruvi_site_url: string;
  taruvi_app_slug: string;
}): Promise<{ success: boolean }> {
  const result = await callFunction("github-inject-secrets", {
    github_token: params.githubToken,
    codespace_name: params.codespaceName,
    taruvi_site_url: params.taruvi_site_url,
    taruvi_app_slug: params.taruvi_app_slug,
  });
  return { success: result.success as boolean };
}

export async function pollCodespaceStatus(params: {
  githubToken: string;
  codespaceName: string;
}): Promise<{ state: string; web_url: string }> {
  const result = await callFunction("github-poll-codespace", {
    github_token: params.githubToken,
    codespace_name: params.codespaceName,
  });
  return {
    state: (result.state as string) ?? "",
    web_url: (result.web_url as string) ?? "",
  };
}

export interface BatchParticipant {
  github_username: string;
  github_token: string;
  taruvi_site_url: string;
  taruvi_api_key: string;
  taruvi_app_slug: string;
}

export async function batchCreateCodespaces(
  participants: BatchParticipant[]
): Promise<{ username: string; web_url: string; status: string; codespace_name?: string }[]> {
  const result = await callFunction("github-batch-codespaces", { participants });
  return (result.results as { username: string; web_url: string; status: string; codespace_name?: string }[]) ?? [];
}
