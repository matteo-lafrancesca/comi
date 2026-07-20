import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revokeRefreshToken, clearAuthCookies } from '@/lib/auth';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    const response = NextResponse.json({
      message: 'Déconnexion réussie.',
    });

    clearAuthCookies(response);

    return response;
  } catch (error) {
    console.error('Erreur déconnexion:', error);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue.' },
      { status: 500 }
    );
  }
}
