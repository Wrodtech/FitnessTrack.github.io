const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function generateIcons() {
    const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];
    
    // Create icons directory
    await fs.mkdir('icons', { recursive: true });
    
    for (const size of sizes) {
        await sharp('icon-template.svg')
            .resize(size, size)
            .png()
            .toFile(`icons/icon-${size}x${size}.png`);
    }
    
    console.log('Icons generated successfully!');
}

generateIcons().catch(console.error);