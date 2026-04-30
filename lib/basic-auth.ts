export type BasicAuthConfig = {
  enabled: boolean;
  isConfigured: boolean;
  password: string;
  user: string;
};

type BasicAuthEnv = {
  APP_BASIC_AUTH_ENABLED?: string;
  APP_BASIC_AUTH_PASSWORD?: string;
  APP_BASIC_AUTH_USER?: string;
  [key: string]: string | undefined;
};

const publicFilePattern = /\.(?:css|gif|ico|jpeg|jpg|js|json|map|otf|png|svg|ttf|txt|webp|woff|woff2|xml)$/i;

export function getBasicAuthConfig(env: BasicAuthEnv = process.env): BasicAuthConfig {
  const enabled = env.APP_BASIC_AUTH_ENABLED === "true";
  const user = env.APP_BASIC_AUTH_USER || "demo";
  const password = env.APP_BASIC_AUTH_PASSWORD || "";

  return {
    enabled,
    isConfigured: Boolean(user && password),
    password,
    user,
  };
}

export function isBasicAuthAuthorized(authorization: string | null, config: BasicAuthConfig) {
  if (!config.enabled) {
    return true;
  }

  if (!config.isConfigured) {
    return false;
  }

  const credentials = parseBasicAuthHeader(authorization);

  return credentials?.user === config.user && credentials.password === config.password;
}

export function parseBasicAuthHeader(authorization: string | null) {
  if (!authorization?.startsWith("Basic ")) {
    return null;
  }

  try {
    const decoded = atob(authorization.slice("Basic ".length).trim());
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex < 0) {
      return null;
    }

    return {
      password: decoded.slice(separatorIndex + 1),
      user: decoded.slice(0, separatorIndex),
    };
  } catch {
    return null;
  }
}

export function shouldBypassBasicAuthPath(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    publicFilePattern.test(pathname)
  );
}
