import { taruviClient } from "../taruviClient";

const APP_SLUG = __TARUVI_APP_SLUG__;
const SITE_URL = __TARUVI_SITE_URL__;
const API_KEY = __TARUVI_API_KEY__;

async function callFunction(slug: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await taruviClient.httpClient.post<{ status: string; data: Record<string, unknown> | null }>(
    `api/apps/${APP_SLUG}/functions/${slug}/execute/`,
    { async: false, params }
  );
  const inner = res?.data ?? {};
  if (inner?.success === false) {
    throw new Error(String(inner?.message ?? inner?.error ?? "Function returned error"));
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
      headers: { Authorization: `Bearer ${API_KEY}` },
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
