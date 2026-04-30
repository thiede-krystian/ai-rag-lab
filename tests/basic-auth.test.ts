import { describe, expect, it } from "vitest";
import {
  getBasicAuthConfig,
  isBasicAuthAuthorized,
  parseBasicAuthHeader,
  shouldBypassBasicAuthPath,
} from "@/lib/basic-auth";

describe("Basic Auth", () => {
  it("allows requests when Basic Auth is disabled", () => {
    const config = getBasicAuthConfig({
      APP_BASIC_AUTH_ENABLED: "false",
      APP_BASIC_AUTH_PASSWORD: "",
      APP_BASIC_AUTH_USER: "demo",
    });

    expect(config.enabled).toBe(false);
    expect(isBasicAuthAuthorized(null, config)).toBe(true);
  });

  it("accepts valid Basic Auth credentials", () => {
    const config = getBasicAuthConfig({
      APP_BASIC_AUTH_ENABLED: "true",
      APP_BASIC_AUTH_PASSWORD: "secret",
      APP_BASIC_AUTH_USER: "demo",
    });

    expect(isBasicAuthAuthorized(createBasicHeader("demo", "secret"), config)).toBe(true);
  });

  it("rejects missing, malformed and invalid Basic Auth credentials", () => {
    const config = getBasicAuthConfig({
      APP_BASIC_AUTH_ENABLED: "true",
      APP_BASIC_AUTH_PASSWORD: "secret",
      APP_BASIC_AUTH_USER: "demo",
    });

    expect(isBasicAuthAuthorized(null, config)).toBe(false);
    expect(isBasicAuthAuthorized("Bearer token", config)).toBe(false);
    expect(isBasicAuthAuthorized("Basic invalid-base64", config)).toBe(false);
    expect(isBasicAuthAuthorized(createBasicHeader("demo", "wrong"), config)).toBe(false);
    expect(isBasicAuthAuthorized(createBasicHeader("other", "secret"), config)).toBe(false);
  });

  it("blocks all protected requests when auth is enabled without a password", () => {
    const config = getBasicAuthConfig({
      APP_BASIC_AUTH_ENABLED: "true",
      APP_BASIC_AUTH_PASSWORD: "",
      APP_BASIC_AUTH_USER: "demo",
    });

    expect(config.isConfigured).toBe(false);
    expect(isBasicAuthAuthorized(createBasicHeader("demo", ""), config)).toBe(false);
  });

  it("parses passwords containing colons", () => {
    expect(parseBasicAuthHeader(createBasicHeader("demo", "secret:with:colon"))).toEqual({
      password: "secret:with:colon",
      user: "demo",
    });
  });

  it("bypasses static assets but protects app and API paths", () => {
    expect(shouldBypassBasicAuthPath("/_next/static/chunk.js")).toBe(true);
    expect(shouldBypassBasicAuthPath("/favicon.ico")).toBe(true);
    expect(shouldBypassBasicAuthPath("/logo.svg")).toBe(true);
    expect(shouldBypassBasicAuthPath("/")).toBe(false);
    expect(shouldBypassBasicAuthPath("/api/documents")).toBe(false);
  });
});

function createBasicHeader(user: string, password: string) {
  return `Basic ${btoa(`${user}:${password}`)}`;
}
