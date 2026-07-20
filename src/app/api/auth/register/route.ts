import { NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { db } from '@/lib/db';
import { signJWT, createRefreshToken, setAuthCookies } from '@/lib/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Format de l\'email invalide.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères.' },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await db.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé.' },
        { status: 400 }
      );
    }

    // Hacher le mot de passe
    const passwordHash = await bcryptjs.hash(password, 10);

    // Créer l'utilisateur
    const user = await db.user.create({
      data: {
        email: trimmedEmail,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    // Générer l'Access Token et le Refresh Token
    const accessToken = await signJWT({ userId: user.id, email: user.email });
    const refreshToken = await createRefreshToken(user.id);

    // Renvoyer la réponse avec les cookies HTTP-only
    const response = NextResponse.json(
      {
        message: 'Compte créé avec succès.',
        user,
      },
      { status: 201 }
    );

    setAuthCookies(response, accessToken, refreshToken);

    return response;
  } catch (error) {
    console.error('Erreur inscription:', error);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue.' },
      { status: 500 }
    );
  }
}
