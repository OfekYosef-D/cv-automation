export type AuthCookieSameSite = "lax" | "strict" | "none";

export type AuthCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: AuthCookieSameSite;
  path: string;
};

export function getAuthCookieOptions(): AuthCookieOptions {
  const isProd = process.env.NODE_ENV === "production";
  const rawSameSite = process.env.COOKIE_SAME_SITE?.toLowerCase() ?? "lax";
  const sameSite: AuthCookieSameSite =
    rawSameSite === "none" || rawSameSite === "strict" ? rawSameSite : "lax";
  const secure = sameSite === "none" ? true : isProd;

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/"
  };
}
