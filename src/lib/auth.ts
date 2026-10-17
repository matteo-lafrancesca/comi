import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from './db';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required.');
}

/** Clé de signature/vérification des JWT. */
const key = new TextEncoder().encode(JWT_SECRET);

/** Seul le hash SHA-256 du refresh token est stocké en base. */
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

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
  await db.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } }); // purge des expirés
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db.refreshToken.create({
    data: {
      token: hashToken(token),
      userId,
      expiresAt,
    },
  });

  return token;
}

/**
 * Vérifie un Refresh Token en BDD, repousse son expiration (30 jours glissants) et émet un
 * nouvel Access Token. Le token lui-même n'est PAS renouvelé (voir docs/dette-technique.md).
 */
export async function renewRefreshToken(tokenString: string) {
  try {
    const storedToken = await db.refreshToken.findUnique({
      where: { token: hashToken(tokenString) },
      include: { user: { select: SESSION_USER_SELECT } },
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
      refreshToken: tokenString,
      user: storedToken.user,
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
      where: { token: hashToken(tokenString) },
    });
  } catch {
    // Ignorer si le token n'existe déjà plus
  }
}

/** Utilisateur de la session courante. */
export interface SessionUser {
  id: number;
  email: string;
  createdAt: Date;
  weekStartDay: number;
  /** Nom d'affichage ; null tant que l'utilisateur ne l'a pas choisi. */
  pseudo: string | null;
  photoUrl: string | null;
}

/** Colonnes d'un `SessionUser` : à utiliser pour toute réponse qui renvoie l'utilisateur connecté. */
export const SESSION_USER_SELECT = {
  id: true,
  email: true,
  createdAt: true,
  weekStartDay: true,
  pseudo: true,
  photoUrl: true,
} as const;

/** Cookies de session (nom, valeur, options) : source unique pour set sur Response ou cookieStore. */
function sessionCookies(accessToken: string, refreshToken: string) {
  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
  return [
    { name: 'token', value: accessToken, options: { ...base, maxAge: ACCESS_TOKEN_EXPIRY_SECONDS } },
    { name: 'refresh_token', value: refreshToken, options: { ...base, maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 } },
  ];
}

/** Pose les cookies HTTP-Only de session sur une réponse. */
export function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  for (const { name, value, options } of sessionCookies(accessToken, refreshToken)) {
    response.cookies.set(name, value, options);
  }
}

/** Efface les cookies d'authentification. */
export function clearAuthCookies(response: NextResponse) {
  for (const { name, options } of sessionCookies('', '')) {
    response.cookies.set(name, '', { ...options, maxAge: undefined, expires: new Date(0) });
  }
}

export interface ResolvedSession {
  user: SessionUser;
  /** Nouveaux cookies à poser si la session a été rafraîchie via le refresh token. */
  renewed: { accessToken: string; refreshToken: string } | null;
}

/**
 * Point d'entrée unique pour retrouver l'utilisateur d'une session : access token valide,
 * sinon rafraîchissement via le refresh token. Renvoie null si la session est invalide.
 */
export async function resolveSession(token?: string, refreshToken?: string): Promise<ResolvedSession | null> {
  if (token) {
    const payload = await verifyJWT(token);
    if (payload) {
      const user = await db.user.findUnique({ where: { id: payload.userId }, select: SESSION_USER_SELECT });
      if (user) return { user, renewed: null };
    }
  }
  if (!refreshToken) return null;

  const refreshed = await renewRefreshToken(refreshToken);
  if (!refreshed) return null;
  return {
    user: refreshed.user,
    renewed: { accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken },
  };
}

/**
 * Utilisateur connecté d'après les cookies de la requête (Server Components et routes API).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const session = await resolveSession(cookieStore.get('token')?.value, cookieStore.get('refresh_token')?.value);
    if (!session) return null;

    if (session.renewed) {
      try {
        for (const { name, value, options } of sessionCookies(session.renewed.accessToken, session.renewed.refreshToken)) {
          cookieStore.set(name, value, options);
        }
      } catch {
        // Cookies en lecture seule (Server Component) : la session sera rafraîchie par la prochaine route/proxy.
      }
    }
    return session.user;
  } catch {
    return null;
  }
}
