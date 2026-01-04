import PocketBase from "pocketbase";

const POCKETBASE_URL =
  import.meta.env.VITE_POCKETBASE_URL || "http://127.0.0.1:8090";

const OAUTH_META_KEY = "pb_oauth_meta";

export const pb = new PocketBase(POCKETBASE_URL);

pb.autoCancellation(false);

export type OAuthMeta = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  provider?: string;
};

export function storeOAuthMeta(meta: any) {
  if (!meta || typeof meta !== "object") return;
  const payload: OAuthMeta = {
    accessToken: meta.accessToken,
    refreshToken: meta.refreshToken,
    expiresAt: meta.expiresAt || meta.exp,
    provider: meta.provider,
  };
  try {
    localStorage.setItem(OAUTH_META_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors in constrained environments.
  }
}

export function loadOAuthMeta(): OAuthMeta | null {
  try {
    const raw = localStorage.getItem(OAUTH_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OAuthMeta;
  } catch {
    return null;
  }
}

export function clearOAuthMeta() {
  try {
    localStorage.removeItem(OAUTH_META_KEY);
  } catch {
    // Ignore storage errors in constrained environments.
  }
}

export function getFileUrl(
  record: { collectionId: string; id: string },
  filename?: string | null
) {
  if (!filename) return null;
  return `${pb.baseUrl}/api/files/${record.collectionId}/${record.id}/${filename}`;
}
