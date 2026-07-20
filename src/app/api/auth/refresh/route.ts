import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAndRotateRefreshToken, setAuthCookies, clearAuthCookies } from '@/lib/auth';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      const response = NextResponse.json(
        { error: 'Non autorisé. Aucun refresh token fourni.' },
        { status: 401 }
      );
      clearAuthCookies(response);
      return response;
    }

    const result = await verifyAndRotateRefreshToken(refreshToken);

    if (!result) {
      const response = NextResponse.json(
        { error: 'Session expirée. Veuillez vous reconnecter.' },
        { status: 401 }
      );
      clearAuthCookies(response);
      return response;
    }

    const response = NextResponse.json({
      message: 'Session rafraîchie avec succès.',
      user: result.user,
    });

    setAuthCookies(response, result.accessToken, result.refreshToken);

    return response;
  } catch (error) {
    console.error('Erreur rafraîchissement token:', error);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue.' },
      { status: 500 }
    );
  }
}
