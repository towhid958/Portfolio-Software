const ACCESS_TOKEN_COOKIE = 'sb-access-token';
const SESSION_KEY_PATTERN = /^sb-.*-auth-token$/;
const DEFAULT_MAX_AGE = 3600;

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function mirrorSessionCookie(rawValue: string | null) {
  if (!rawValue) {
    clearCookie(ACCESS_TOKEN_COOKIE);
    return;
  }
  try {
    const parsed = JSON.parse(rawValue);
    const accessToken: string | undefined = parsed?.access_token;
    const expiresAt: number | undefined = parsed?.expires_at; // unix seconds
    if (!accessToken) {
      clearCookie(ACCESS_TOKEN_COOKIE);
      return;
    }
    const maxAge = expiresAt
      ? Math.max(0, expiresAt - Math.floor(Date.now() / 1000))
      : DEFAULT_MAX_AGE;
    setCookie(ACCESS_TOKEN_COOKIE, accessToken, maxAge);
  } catch {
    clearCookie(ACCESS_TOKEN_COOKIE);
  }
}

type StorageLike = {
  getItem: (key: string) => any;
  setItem: (key: string, value: string) => any;
  removeItem: (key: string) => any;
};

// Mirrors just the session's access token (never the refresh token) to a
// small, same-site cookie whenever Supabase writes its session to the
// wrapped storage. This lets server-rendered route guards (beforeLoad),
// which only ever see request headers and have no access to localStorage,
// recognize an already-logged-in browser - without it, every full-page
// refresh of a protected route looks logged-out on the server and
// incorrectly bounces the user back to /auth before the client ever runs.
export function withSessionCookieMirror<T extends StorageLike>(storage: T): T {
  return {
    ...storage,
    getItem: (key: string) => storage.getItem(key),
    setItem: (key: string, value: string) => {
      if (SESSION_KEY_PATTERN.test(key)) mirrorSessionCookie(value);
      return storage.setItem(key, value);
    },
    removeItem: (key: string) => {
      if (SESSION_KEY_PATTERN.test(key)) mirrorSessionCookie(null);
      return storage.removeItem(key);
    },
  };
}
