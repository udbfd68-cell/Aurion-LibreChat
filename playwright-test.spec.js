const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('=== Test UI Automation - Aurion Chat ===');
  
  // 1. Ouvrir l'application
  console.log('1. Ouverture de l\'application...');
  await page.goto('https://client-gold-zeta.vercel.app');
  await page.waitForLoadState('networkidle');
  console.log('   ✓ Application chargée');
  
  // 2. Prendre une capture d'écran
  await page.screenshot({ path: 'aurion-home.png' });
  console.log('   ✓ Capture d\'écran prise');
  
  // 3. Vérifier le titre
  const title = await page.title();
  console.log(`   Titre: ${title}`);
  
  // 4. Attendre que l'UI soit chargée
  await page.waitForTimeout(2000);
  
  // 5. Vérifier les éléments principaux
  console.log('2. Vérification des éléments principaux...');
  try {
    await page.waitForSelector('body', { timeout: 5000 });
    console.log('   ✓ Body chargé');
  } catch (e) {
    console.log('   ✗ Body non trouvé');
  }
  
  // 6. Tester les boutons de navigation
  console.log('3. Test des boutons de navigation...');
  const buttons = await page.$$('button');
  console.log(`   Nombre de boutons trouvés: ${buttons.length}`);
  
  // 7. Vérifier le sidebar
  console.log('4. Vérification du sidebar...');
  try {
    const sidebar = await page.$('nav, aside, [role="navigation"]');
    if (sidebar) {
      console.log('   ✓ Sidebar trouvé');
    } else {
      console.log('   ✗ Sidebar non trouvé');
    }
  } catch (e) {
    console.log('   ✗ Erreur sidebar');
  }
  
  // 8. Vérifier le chat input
  console.log('5. Vérification du chat input...');
  try {
    const chatInput = await page.$('textarea, input[type="text"], [contenteditable="true"]');
    if (chatInput) {
      console.log('   ✓ Chat input trouvé');
      // Taper un message
      await chatInput.fill('Test message from Playwright');
      console.log('   ✓ Message tapé');
      await page.waitForTimeout(1000);
      await chatInput.fill('');
    } else {
      console.log('   ✗ Chat input non trouvé');
    }
  } catch (e) {
    console.log('   ✗ Erreur chat input');
  }
  
  // 9. Vérifier les agents/tools
  console.log('6. Vérification des agents/tools...');
  try {
    const agentButton = await page.$('button:has-text("agent"), button:has-text("tool"), [aria-label*="agent"]');
    if (agentButton) {
      console.log('   ✓ Bouton agent/tool trouvé');
      await agentButton.click();
      await page.waitForTimeout(1000);
    } else {
      console.log('   ✗ Bouton agent/tool non trouvé');
    }
  } catch (e) {
    console.log('   ✗ Erreur agent/tool');
  }
  
  // 10. Vérifier le sélecteur de modèle
  console.log('7. Vérification du sélecteur de modèle...');
  try {
    const modelSelect = await page.$('select, [role="combobox"], button:has-text("model")');
    if (modelSelect) {
      console.log('   ✓ Sélecteur de modèle trouvé');
    } else {
      console.log('   ✗ Sélecteur de modèle non trouvé');
    }
  } catch (e) {
    console.log('   ✗ Erreur sélecteur de modèle');
  }
  
  // 11. Prendre une capture finale
  await page.screenshot({ path: 'aurion-final.png' });
  console.log('   ✓ Capture finale prise');
  
  // 12. Fermer le navigateur
  await browser.close();
  console.log('\n=== Test terminé ===');
})();
