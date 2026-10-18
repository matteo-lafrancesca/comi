import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIES, resolveSession, setAuthCookies, clearAuthCookies, toClientUser } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await resolveSession(cookieStore.get(SESSION_COOKIES.access)?.value, cookieStore.get(SESSION_COOKIES.refresh)?.value);

    if (session) {
      const response = NextResponse.json({ user: toClientUser(session.user) });
      if (session.renewed) setAuthCookies(response, session.renewed.accessToken, session.renewed.refreshToken);
      return response;
    }

    const response = NextResponse.json({ error: 'Non autorisé. Veuillez vous connecter.' }, { status: 401 });
    clearAuthCookies(response);
    return response;
  } catch (error) {
    console.error('Erreur profil utilisateur:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
