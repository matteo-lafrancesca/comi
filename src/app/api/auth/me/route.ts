import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, verifyAndRotateRefreshToken, setAuthCookies, clearAuthCookies } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (token) {
      const payload = await verifyJWT(token);
      if (payload) {
        const user = await db.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            email: true,
            createdAt: true,
            weekStartDay: true,
          },
        });
        if (user) {
          return NextResponse.json({ user });
        }
      }
    }

    // Tenter de rafraîchir la session avec le refresh_token
    const refreshToken = cookieStore.get('refresh_token')?.value;
    if (refreshToken) {
      const result = await verifyAndRotateRefreshToken(refreshToken);
      if (result) {
        const response = NextResponse.json({ user: result.user });
        setAuthCookies(response, result.accessToken, result.refreshToken);
        return response;
      }
    }

    const response = NextResponse.json(
      { error: 'Non autorisé. Veuillez vous connecter.' },
      { status: 401 }
    );
    clearAuthCookies(response);
    return response;
  } catch (error) {
    console.error('Erreur profil utilisateur:', error);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue.' },
      { status: 500 }
    );
  }
}
