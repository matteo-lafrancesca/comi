import { NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { db } from '@/lib/db';
import { signJWT } from '@/lib/auth';

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
      // Message générique pour éviter l'énumération d'utilisateurs
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

    // Générer le JWT
    const token = await signJWT({ userId: user.id, email: user.email });

    // Renvoyer la réponse avec le cookie HTTP-only
    const response = NextResponse.json({
      message: 'Connexion réussie.',
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
    });

    return response;
  } catch (error) {
    console.error('Erreur connexion:', error);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue.' },
      { status: 500 }
    );
  }
}
