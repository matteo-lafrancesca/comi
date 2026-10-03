import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-at-least-32-chars-long';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production.');
}

/** Clé de signature/vérification des JWT (partagée avec le proxy). */
export const key = new TextEncoder().encode(JWT_SECRET);

export interface TokenPayload {
  userId: number;
  email: string;
}

export const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_EXPIRY_DAYS = 30; // 30 jours glissants

/**
 * Signe un token JWT d'accès de courte durée (15 minutes)
 */
export async function signJWT(payload: TokenPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_EXPIRY_SECONDS}s`)
    .sign(key);
}

/**
 * Vérifie un token JWT d'accès et renvoie son payload ou null s'il est invalide/expiré
 */
export async function verifyJWT(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return {
      userId: payload.userId as number,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

/**
 * Génère et sauvegarde un nouveau Refresh Token en BDD pour un utilisateur (durée: 30 jours)
 */
export async function createRefreshToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
}

/**
 * Vérifie un Refresh Token en BDD, renouvelle sa date d'expiration (30 jours glissants)
 * et génère un nouvel Access Token.
 */
export async function verifyAndRotateRefreshToken(tokenString: string) {
  try {
    const storedToken = await db.refreshToken.findUnique({
      where: { token: tokenString },
      include: { user: true },
    });

    if (!storedToken) {
      return null;
    }

    // Si le token a expiré, on le supprime de la BDD
    if (storedToken.expiresAt < new Date()) {
      await db.refreshToken.delete({ where: { id: storedToken.id } }).catch(() => {});
      return null;
    }

    // Renouvellement glissant : on repousse l'expiration à 30 jours à partir d'aujourd'hui
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    await db.refreshToken.update({
      where: { id: storedToken.id },
      data: { expiresAt: newExpiresAt },
    });

    const newAccessToken = await signJWT({
      userId: storedToken.user.id,
      email: storedToken.user.email,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: storedToken.token,
      user: {
        id: storedToken.user.id,
        email: storedToken.user.email,
        createdAt: storedToken.user.createdAt,
        weekStartDay: storedToken.user.weekStartDay,
      },
    };
  } catch (error) {
    console.error('Erreur lors du rafraîchissement du token:', error);
    return null;
  }
}

/**
 * Révoque (supprime) un Refresh Token spécifique en BDD
 */
export async function revokeRefreshToken(tokenString: string) {
  try {
    await db.refreshToken.delete({
      where: { token: tokenString },
    });
  } catch {
    // Ignorer si le token n'existe déjà plus
  }
}

/**
 * Définit de manière centralisée les cookies HTTP-Only de session
 */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
) {
  const isProd = process.env.NODE_ENV === 'production';

  // Cookie Access Token (15 min)
  response.cookies.set('token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_EXPIRY_SECONDS,
  });

  // Cookie Refresh Token (30 jours)
  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
  });
}

/**
 * Efface les cookies d'authentification
 */
export function clearAuthCookies(response: NextResponse) {
  const isProd = process.env.NODE_ENV === 'production';

  response.cookies.set('token', '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });

  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
}

/**
 * Récupère l'utilisateur connecté depuis les cookies de session.
 * Si le token d'accès est expiré ou absent, tente un rafraîchissement silencieux via le refresh_token.
 */
export async function getSessionUser() {
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
        if (user) return user;
      }
    }

    // Si pas de token valide, on essaye avec le refresh_token
    const refreshToken = cookieStore.get('refresh_token')?.value;
    if (!refreshToken) return null;

    const refreshed = await verifyAndRotateRefreshToken(refreshToken);
    if (!refreshed) return null;

    // Tenter de rafraîchir les cookies de la requête courante si le cookieStore le permet
    try {
      cookieStore.set('token', refreshed.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: ACCESS_TOKEN_EXPIRY_SECONDS,
      });
      cookieStore.set('refresh_token', refreshed.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
      });
    } catch {
      // Dans certains contextes en lecture seule de Next.js, cookieStore.set peut lever une erreur
    }

    return refreshed.user;
  } catch {
    return null;
  }
}
