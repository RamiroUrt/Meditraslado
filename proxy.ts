import { auth } from "@/auth";

export const proxy = auth((req) => {
  if (!req.auth && req.nextUrl.pathname !== "/login") {
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)"],
};
