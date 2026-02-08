const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Read the SVG
const svgPath = path.join(__dirname, '../public/icon.svg');
const publicPath = path.join(__dirname, '../public');

async function generateIcons() {
  const sizes = [192, 512];

  for (const size of sizes) {
    const svgBuffer = fs.readFileSync(svgPath);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(publicPath, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  }
}

generateIcons().catch(console.error);
