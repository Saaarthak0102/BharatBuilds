import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webRoot = path.resolve(__dirname, '..');
const srcIconPath = path.join(webRoot, 'public', 'icon.jpeg');
const appDir = path.join(webRoot, 'app');
const publicIconsDir = path.join(webRoot, 'public', 'icons');

async function generateIcons() {
  console.log('Generating icons from:', srcIconPath);

  await fs.mkdir(publicIconsDir, { recursive: true });
  await fs.mkdir(appDir, { recursive: true });

  const metadata = await sharp(srcIconPath).metadata();
  const width = metadata.width || 500;
  const height = metadata.height || 500;

  // 10% inward crop: 50px on each side for 500x500 image
  const cropInsetX = Math.round(width * 0.10);
  const cropInsetY = Math.round(height * 0.10);
  const cropWidth = width - (cropInsetX * 2);
  const cropHeight = height - (cropInsetY * 2);

  console.log(`Cropping inward 10%: offset (${cropInsetX}, ${cropInsetY}), dimensions ${cropWidth}x${cropHeight}`);

  // Base cropped image (full bleed square, cutting off transparent rounded corners)
  const getCroppedBase = () => sharp(srcIconPath).extract({
    left: cropInsetX,
    top: cropInsetY,
    width: cropWidth,
    height: cropHeight,
  });

  // 1. app/icon.png (512x512)
  const icon512Path = path.join(appDir, 'icon.png');
  await getCroppedBase()
    .resize(512, 512)
    .png()
    .toFile(icon512Path);
  console.log('Created:', icon512Path);

  // 2. app/apple-icon.png (180x180)
  const appleIconPath = path.join(appDir, 'apple-icon.png');
  await getCroppedBase()
    .resize(180, 180)
    .png()
    .toFile(appleIconPath);
  console.log('Created:', appleIconPath);

  // 3. public/icons/icon-192.png (192x192)
  const pwa192Path = path.join(publicIconsDir, 'icon-192.png');
  await getCroppedBase()
    .resize(192, 192)
    .png()
    .toFile(pwa192Path);
  console.log('Created:', pwa192Path);

  // 4. public/icons/icon-512.png (512x512)
  const pwa512Path = path.join(publicIconsDir, 'icon-512.png');
  await getCroppedBase()
    .resize(512, 512)
    .png()
    .toFile(pwa512Path);
  console.log('Created:', pwa512Path);

  // 5. app/favicon.ico (16, 32, 48 sizes)
  const [b16, b32, b48] = await Promise.all([
    getCroppedBase().resize(16, 16).png().toBuffer(),
    getCroppedBase().resize(32, 32).png().toBuffer(),
    getCroppedBase().resize(48, 48).png().toBuffer(),
  ]);
  const icoBuffer = await pngToIco([b16, b32, b48]);
  const faviconPath = path.join(appDir, 'favicon.ico');
  await fs.writeFile(faviconPath, icoBuffer);
  console.log('Created multi-size favicon:', faviconPath);

  // 6. public/icons/maskable-512.png:
  // Full-bleed 512x512 on a solid fill sampled from the icon's background (#0c192c),
  // with the icon scaled to ~70% (358x358) and centered.
  const solidFillColor = { r: 12, g: 25, b: 44, alpha: 1 };
  const maskableSymbolSize = Math.round(512 * 0.70); // 358px
  const maskableOffset = Math.round((512 - maskableSymbolSize) / 2); // 77px

  const scaledIconBuffer = await sharp(srcIconPath)
    .resize(maskableSymbolSize, maskableSymbolSize)
    .png()
    .toBuffer();

  const maskablePath = path.join(publicIconsDir, 'maskable-512.png');
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: solidFillColor,
    },
  })
    .composite([
      {
        input: scaledIconBuffer,
        top: maskableOffset,
        left: maskableOffset,
      },
    ])
    .png()
    .toFile(maskablePath);
  console.log('Created maskable icon:', maskablePath);

  console.log('All icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
