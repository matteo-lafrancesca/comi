import { NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { db } from '@/lib/db';
import { signJWT, createRefreshToken, setAuthCookies } from '@/lib/auth';

export async function POST(request: Request) {
  try {
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

    if (!user) {
      return NextResponse.json(
        { error: 'Identifiants invalides.' },
        { status: 400 }
      );
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcryptjs.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Identifiants invalides.' },
        { status: 400 }
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
