import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-at-least-32-chars-long';
const key = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Récupérer le token depuis les cookies
  const token = request.cookies.get('token')?.value;

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, key, { algorithms: ['HS256'] });
      isAuthenticated = true;
    } catch {
      // Le token est invalide ou expiré
      isAuthenticated = false;
    }
  }

  // Définir si la route actuelle est une route d'authentification publique (login, register)
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');

  // Si l'utilisateur est sur une page d'authentification mais est déjà connecté,
  // on le redirige vers la page d'accueil.
  if (isAuthPage) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url));
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
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Protège toutes les routes sauf :
     * - api/auth (routes d'API d'authentification)
     * - api/uploadthing (upload de fichiers)
     * - _next/static, _next/image (fichiers système de Next)
     * - Tout fichier statique contenant un point (ex: favicon.ico, manifest.json, sw.js, images, etc.)
     */
    '/((?!api/auth|api/uploadthing|_next/static|_next/image|.*\\..*$).*)',
  ],
};
