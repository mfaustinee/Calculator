import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// SVG with clear graphics: deep navy background, milk jug/drop + calculator grid lines, KDB letters
const svgStandard = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="50%" stop-color="#1e40af" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <linearGradient id="dropGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#e0f2fe" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" rx="108" fill="url(#bgGrad)" />

  <!-- Inner Badge Frame -->
  <rect x="24" y="24" width="464" height="464" rx="88" fill="none" stroke="#ffffff" stroke-opacity="0.15" stroke-width="4" />

  <!-- Central Graphic Group -->
  <g filter="url(#shadow)" transform="translate(0, -10)">
    <!-- Milk Jug / Drop Emblem -->
    <path d="M 256 100 C 256 100 180 200 180 265 C 180 307 214 340 256 340 C 298 340 332 307 332 265 C 332 200 256 100 256 100 Z" fill="url(#dropGrad)" />

    <!-- Calculator / Financial Grid inside Drop -->
    <rect x="216" y="220" width="80" height="22" rx="4" fill="#0284c7" opacity="0.85" />
    <circle cx="230" cy="265" r="7" fill="#0369a1" />
    <circle cx="256" cy="265" r="7" fill="#0369a1" />
    <circle cx="282" cy="265" r="7" fill="#0369a1" />
    <circle cx="230" cy="292" r="7" fill="#0369a1" />
    <circle cx="256" cy="292" r="7" fill="#0369a1" />
    <circle cx="282" cy="292" r="7" fill="#10b981" />
  </g>

  <!-- Title Badge -->
  <rect x="146" y="375" width="220" height="54" rx="14" fill="#ffffff" />
  <text x="256" y="412" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="900" fill="#1e3a8a" text-anchor="middle" letter-spacing="4">KDB LEVY</text>
</svg>`;

// Maskable icon with 15% safe padding
const svgMaskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="50%" stop-color="#1e40af" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <linearGradient id="dropGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#e0f2fe" />
    </linearGradient>
  </defs>

  <!-- Full bleed background for Android clipping -->
  <rect width="512" height="512" fill="url(#bgGradM)" />

  <!-- Elements scaled down into 80% safe zone -->
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <path d="M 256 90 C 256 90 180 190 180 255 C 180 297 214 330 256 330 C 298 330 332 297 332 255 C 332 190 256 90 256 90 Z" fill="url(#dropGradM)" />
    <rect x="216" y="210" width="80" height="22" rx="4" fill="#0284c7" opacity="0.85" />
    <circle cx="230" cy="255" r="7" fill="#0369a1" />
    <circle cx="256" cy="255" r="7" fill="#0369a1" />
    <circle cx="282" cy="255" r="7" fill="#0369a1" />
    <circle cx="230" cy="282" r="7" fill="#0369a1" />
    <circle cx="256" cy="282" r="7" fill="#0369a1" />
    <circle cx="282" cy="282" r="7" fill="#10b981" />

    <rect x="146" y="365" width="220" height="54" rx="14" fill="#ffffff" />
    <text x="256" y="402" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="900" fill="#1e3a8a" text-anchor="middle" letter-spacing="4">KDB LEVY</text>
  </g>
</svg>`;

async function generate() {
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgStandard, 'utf8');

  const standardBuffer = Buffer.from(svgStandard);
  const maskableBuffer = Buffer.from(svgMaskable);

  // Generate pwa-512x512.png
  await sharp(standardBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // Generate pwa-192x192.png
  await sharp(standardBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // Generate pwa-maskable-512x512.png
  await sharp(maskableBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // Generate apple-touch-icon.png (180x180)
  await sharp(standardBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // Generate favicon.png (64x64) and favicon.ico
  await sharp(standardBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  // Copy or create favicon.ico as png
  await sharp(standardBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  console.log('Successfully generated all PWA icons.');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
