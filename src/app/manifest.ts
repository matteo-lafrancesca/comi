import type { MetadataRoute } from 'next';
import { BASE_PATH } from '@/lib/api';

const ICON_SIZES = [16, 32, 57, 60, 72, 76, 114, 120, 128, 144, 152, 180, 192, 256, 512, 1024];
/** Tailles également proposées en icône adaptative (Android). */
const MASKABLE = new Set([192, 512]);

/** Manifest de la PWA, servi sous le basePath de l'instance (`/comi` ou `/comi/dev`). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Comi',
    short_name: 'Comi',
    description: 'Gestion de repas et liste de courses',
    start_url: `${BASE_PATH}/`,
    scope: `${BASE_PATH}/`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FAF6F0',
    theme_color: '#E64A33',
    icons: ICON_SIZES.map((size) => ({
      src: `${BASE_PATH}/light/ios/${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      ...(MASKABLE.has(size) && { purpose: 'maskable' as const }),
    })),
  };
}
