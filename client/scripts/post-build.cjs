const fs = require('fs-extra');

async function postBuild() {
  try {
    await fs.copy('public/assets', 'dist/assets');
    await fs.copy('public/robots.txt', 'dist/robots.txt');
    // Ensure /favicon.ico is served (browsers request it by default)
    if (await fs.pathExists('public/assets/favicon-32x32.png')) {
      await fs.copy('public/assets/favicon-32x32.png', 'dist/favicon.ico');
    }
    console.log('✅ PWA icons, robots.txt, favicon.ico copied successfully.');
  } catch (err) {
    console.error('❌ Error copying files:', err);
    process.exit(1);
  }
}

postBuild();
