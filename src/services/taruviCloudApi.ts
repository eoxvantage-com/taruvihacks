const CLOUD_API_BASE = "https://api.taruvi.cloud/api/cloud";

function getToken(): string {
  return __TARUVI_CLOUD_TOKEN__;
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
    Accept: "*/*",
  };
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
  const res = await fetch(`${CLOUD_API_BASE}/organizations/${params.orgSlug}/sites/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      name: params.siteName,
      description: params.description ?? "",
      organization: params.orgId,
      environment: params.environment ?? "production",
      is_primary: false,
      site_settings: "",
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data?.detail ??
      (Array.isArray(data?.name) ? data.name[0] : null) ??
      `API error ${res.status}`;
    throw new Error(String(msg));
  }
  return data;
}

export async function inviteUserToSite(params: InviteUserParams): Promise<Record<string, unknown>> {
  const res = await fetch(`${CLOUD_API_BASE}/organizations/${params.orgSlug}/invitations/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      invitee_identifier: params.email,
      invitation_config: {
        is_admin: false,
        group: ["MEMBER"],
        site: [{ slug: params.siteSlug, permissions: ["view_site", "access_site"] }],
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data?.detail ??
      (Array.isArray(data?.invitee_identifier) ? data.invitee_identifier[0] : null) ??
      `API error ${res.status}`;
    throw new Error(String(msg));
  }
  return data;
}

export async function listTaruviInvitations(orgSlug: string): Promise<TaruviInvitation[]> {
  const res = await fetch(`${CLOUD_API_BASE}/organizations/${orgSlug}/invitations/`, {
    headers: { Authorization: `Bearer ${getToken()}`, Accept: "*/*" },
  });

  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data) ? data : (data?.results ?? []);
}
