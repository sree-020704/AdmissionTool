export const PORTAL_BRAND = {
  admin: {
    name: "evidyalaya Admin Portal",
    suffix: "Admin Portal",
  },
  staff: {
    name: "evidyalaya Staff Portal",
    suffix: "Staff Portal",
  },
};

export function getAuthPortal(pathname) {
  return pathname.startsWith("/staff") ? "staff" : "admin";
}

export function loginPathForPortal(portal) {
  return portal === "staff" ? "/staff/login" : "/login";
}

export function forgotPasswordPathForPortal(portal) {
  return portal === "staff" ? "/staff/forgot-password" : "/forgot-password";
}
