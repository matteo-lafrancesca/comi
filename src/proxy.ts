import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { verifyAndRotateRefreshToken, setAuthCookies, key } from '@/lib/auth';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Récupérer les tokens depuis les cookies
  const token = request.cookies.get('token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  let isAuthenticated = false;
  let newCookiesToSet: { accessToken: string; refreshToken: string } | null = null;

  if (token) {
    try {
      await jwtVerify(token, key, { algorithms: ['HS256'] });
      isAuthenticated = true;
    } catch {
      // Le token d'accès est invalide ou expiré
      isAuthenticated = false;
    }
  }

  // Si l'Access Token n'est plus valide mais qu'un Refresh Token est présent,
  // tenter un rafraîchissement transparent de la session.
  if (!isAuthenticated && refreshToken) {
    const refreshed = await verifyAndRotateRefreshToken(refreshToken);
    if (refreshed) {
      isAuthenticated = true;
      newCookiesToSet = {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
      };
    }
  }

  // Définir si la route actuelle est une route d'authentification publique (login, register)
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');

  // Si l'utilisateur est sur une page d'authentification mais est déjà connecté
  if (isAuthPage) {
    if (isAuthenticated) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = '/';
      const response = NextResponse.redirect(homeUrl);
      if (newCookiesToSet) {
        setAuthCookies(response, newCookiesToSet.accessToken, newCookiesToSet.refreshToken);
      }
      return response;
    }
    return NextResponse.next();
  }

  // Si la route n'est pas publique et que l'utilisateur n'est pas connecté
  if (!isAuthenticated) {
    // Si c'est une route d'API, on renvoie une erreur 401
    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        { error: 'Non autorisé. Veuillez vous connecter.' },
        { status: 401 }
      );
    }
    // Sinon, on redirige vers la page de connexion
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  if (newCookiesToSet) {
    setAuthCookies(response, newCookiesToSet.accessToken, newCookiesToSet.refreshToken);
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Protège toutes les routes sauf :
     * - api/auth (routes d'API d'authentification)
     * - api/uploadthing (upload de fichiers)
     * - _next/static, _next/image (fichiers système de Next)
     * - Tout fichier statique contenant un point (ex: favicon.ico, manifest.json, images, etc.)
     */
    '/((?!api/auth|api/uploadthing|_next/static|_next/image|.*\\..*$).*)',
  ],
};
