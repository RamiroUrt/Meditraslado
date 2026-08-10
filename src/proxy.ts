import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const RUTAS_PUBLICAS = ["/login", "/forgot-password", "/reset-password"];

export const proxy = auth((req) => {
  if (!req.auth && !RUTAS_PUBLICAS.includes(req.nextUrl.pathname)) {
    return Response.redirect(new URL("/login", req.nextUrl.origin));
  }

  if (
    req.auth &&
    req.nextUrl.pathname.startsWith("/calendar") &&
    req.auth.user.rol !== "ADMIN" &&
    req.auth.user.rol !== "RECEPCIONISTA" &&
    req.auth.user.rol !== "CHOFER"
  ) {
    return Response.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  if (
    req.auth &&
    req.auth.user.rol === "CHOFER" &&
    !req.nextUrl.pathname.startsWith("/calendar") &&
    !req.nextUrl.pathname.startsWith("/settings")
  ) {
    return Response.redirect(new URL("/calendar", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|svg|webp)$).*)"],
};
