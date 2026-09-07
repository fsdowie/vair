// One-off asset generator: rasterizes the web app's SVG logo
// (public/vair-logo.svg) into the PNGs Expo needs (app icon, adaptive icon
// layers, splash, favicon, and an in-app logo image for the auth screen).
// Run with: node scripts/gen-assets.js
// These are placeholder-quality (solid brand background + the existing
// logo) — swap for final, designer-provided icons before a public store
// listing; see mobile/README.md.
const sharp = require('sharp');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SVG = path.join(ROOT, '..', 'public', 'vair-logo.svg');
const OUT = path.join(ROOT, 'assets');

const BG = '#0a1628'; // matches web app's darkest background tone

async function run() {
  // In-app logo (transparent), used on the auth screen. Wide aspect like
  // the source SVG (680x430).
  await sharp(SVG, { density: 300 })
    .resize({ width: 1200, fit: 'inside' })
    .png()
    .toFile(path.join(OUT, 'vair-logo.png'));

  // 1024x1024 app icon: brand-dark square background with the logo
  // centered and inset, flattened to opaque (iOS rejects alpha in icons).
  const iconLogo = await sharp(SVG, { density: 300 })
    .resize({ width: 760, fit: 'inside' })
    .png()
    .toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BG } })
    .composite([{ input: iconLogo, gravity: 'center' }])
    .flatten({ background: BG })
    .png()
    .toFile(path.join(OUT, 'icon.png'));

  // Android adaptive icon: transparent foreground layer (logo only, smaller
  // so it survives the OS's circular/rounded-square mask crop) + solid
  // background layer.
  const fgLogo = await sharp(SVG, { density: 300 })
    .resize({ width: 560, fit: 'inside' })
    .png()
    .toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fgLogo, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT, 'android-icon-foreground.png'));

  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BG } })
    .png()
    .toFile(path.join(OUT, 'android-icon-background.png'));

  // Monochrome adaptive-icon layer (Android 13+ themed icons): white logo
  // silhouette on transparent, approximated via alpha-channel extraction.
  const mono = await sharp(SVG, { density: 300 })
    .resize({ width: 560, fit: 'inside' })
    .ensureAlpha()
    .toColourspace('b-w')
    .png()
    .toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: mono, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT, 'android-icon-monochrome.png'));

  // Splash screen icon (shown on a solid backgroundColor set in app.json).
  const splashLogo = await sharp(SVG, { density: 300 })
    .resize({ width: 600, fit: 'inside' })
    .png()
    .toBuffer();
  await sharp({ create: { width: 1200, height: 1200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: splashLogo, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT, 'splash-icon.png'));

  // Web favicon
  await sharp(SVG, { density: 300 })
    .resize(196, 196, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(OUT, 'favicon.png'));

  console.log('Assets generated in', OUT);
}

run().catch((err) => { console.error(err); process.exit(1); });
