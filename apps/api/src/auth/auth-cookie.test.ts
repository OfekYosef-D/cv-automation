import { getAuthCookieOptions } from "./auth-cookie";

describe("getAuthCookieOptions", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses secure true when sameSite is none", () => {
    process.env.NODE_ENV = "development";
    process.env.COOKIE_SAME_SITE = "none";

    expect(getAuthCookieOptions()).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/"
    });
  });

  it("uses secure true in production when sameSite is lax", () => {
    process.env.NODE_ENV = "production";
    process.env.COOKIE_SAME_SITE = "lax";

    expect(getAuthCookieOptions()).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/"
    });
  });
});
