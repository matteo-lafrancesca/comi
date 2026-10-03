import { NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { db } from '@/lib/db';
import { isRateLimited, rateLimitKey } from '@/lib/rate-limit';
import { signJWT, createRefreshToken, setAuthCookies } from '@/lib/auth';

// Hash bcrypt (coût 10) d'une valeur arbitraire, uniquement pour égaliser le temps de réponse.
const DUMMY_HASH = '$2b$10$UvM0.tI.fFW8b.gjdvJ43enf6I.OSKKIs4l6jORbOd7DKu1C9zHaK';

export async function POST(request: Request) {
  try {
    if (isRateLimited(rateLimitKey(request, 'login'))) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    // Validation des entrées
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis.' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Rechercher l'utilisateur
    const user = await db.user.findUnique({
      where: { email: trimmedEmail },
    });

    // Comparaison toujours exécutée (hash factice si inconnu) : temps de réponse constant
    const isPasswordValid = await bcryptjs.compare(String(password), user?.passwordHash ?? DUMMY_HASH);

    if (!user || !isPasswordValid) {
      return NextResponse.json(
        { error: 'Identifiants invalides.' },
        { status: 401 }
      );
    }

    // Générer l'Access Token et le Refresh Token
    const accessToken = await signJWT({ userId: user.id, email: user.email });
    const refreshToken = await createRefreshToken(user.id);

    // Renvoyer la réponse avec les cookies HTTP-only
    const response = NextResponse.json({
      message: 'Connexion réussie.',
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
    });

    setAuthCookies(response, accessToken, refreshToken);

    return response;
  } catch (error) {
    console.error('Erreur connexion:', error);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue.' },
      { status: 500 }
    );
  }
}
