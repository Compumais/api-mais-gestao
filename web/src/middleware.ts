import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = new Set(["/", "/entrar", "/registrar"]);
const AUTH_ROUTES = new Set(["/entrar", "/registrar"]);

function hasSessionCookie(request: NextRequest) {
	return request.cookies.getAll().some((cookie) => {
		const normalizedName = cookie.name.toLowerCase();
		return (
			normalizedName.includes("mais-gestao") ||
			normalizedName.includes("session_token") ||
			normalizedName.includes("better-auth.session_token")
		);
	});
}

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const isPublicRoute = PUBLIC_ROUTES.has(pathname);
	const isAuthRoute = AUTH_ROUTES.has(pathname);
	const isAuthenticated = hasSessionCookie(request);

	if (!isAuthenticated && !isPublicRoute) {
		const loginUrl = new URL("/entrar", request.url);
		loginUrl.searchParams.set("redirect", pathname);
		return NextResponse.redirect(loginUrl);
	}

	if (isAuthenticated && isAuthRoute) {
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
