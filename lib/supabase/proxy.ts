import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedUserId } from "@/lib/auth/authorized-users";
import { getSupabaseConfig } from "@/lib/supabase/config";

type CookieToSet = { name: string; value: string; options: CookieOptions };

function applySessionHeaders(response: NextResponse, cookies: CookieToSet[], headers: Record<string, string>) {
  cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
  return response;
}

function isPublicPath(pathname: string) {
  return pathname === "/login" || pathname === "/api/health";
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  let sessionCookies: CookieToSet[] = [];
  let sessionHeaders: Record<string, string> = {};
  const { url, publishableKey } = getSupabaseConfig();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        sessionCookies = [
          ...sessionCookies.filter((current) => !cookiesToSet.some((next) => next.name === current.name)),
          ...cookiesToSet,
        ];
        sessionHeaders = { ...sessionHeaders, ...headers };
        response = NextResponse.next({ request });
        applySessionHeaders(response, sessionCookies, sessionHeaders);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();

  if (!isPublicPath(request.nextUrl.pathname) && !isAuthorizedUserId(data?.claims?.sub)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.hash = "";
    return applySessionHeaders(NextResponse.redirect(loginUrl), sessionCookies, sessionHeaders);
  }

  return response;
}
