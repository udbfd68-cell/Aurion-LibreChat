const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  console.log('=== Test UI Avancé - Aurion Chat ===\n');
  
  // 1. Ouvrir l'application
  console.log('1. Ouverture de l\'application...');
  await page.goto('https://client-gold-zeta.vercel.app', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  console.log('   ✓ Application chargée\n');
  
  // 2. Attendre que l'UI soit complètement chargée
  await page.waitForTimeout(3000);
  
  // 3. Prendre une capture initiale
  await page.screenshot({ path: 'aurion-1-home.png' });
  console.log('   ✓ Capture initiale prise\n');
  
  // 4. Tester le chat input
  console.log('2. Test du chat input...');
  try {
    const chatInput = await page.$('textarea, input[type="text"], [contenteditable="true"]');
    if (chatInput) {
      await chatInput.fill('Hello from Playwright automation test!');
      await page.waitForTimeout(1500);
      console.log('   ✓ Message tapé dans le chat\n');
      
      // Essayer d'envoyer le message
      const sendButton = await page.$('button[type="submit"], button:has-text("send"), button:has-text("Send"), button[aria-label="send"]');
      if (sendButton) {
        await sendButton.click();
        await page.waitForTimeout(2000);
        console.log('   ✓ Message envoyé\n');
      } else {
        // Essayer avec Enter
        await chatInput.press('Enter');
        await page.waitForTimeout(2000);
        console.log('   ✓ Message envoyé avec Enter\n');
      }
    }
  } catch (e) {
    console.log('   ✗ Erreur chat input:', e.message, '\n');
  }
  
  // 5. Tester le sélecteur de modèle
  console.log('3. Test du sélecteur de modèle...');
  try {
    const modelButton = await page.$('button:has-text("model"), button:has-text("Model"), [aria-label*="model"]');
    if (modelButton) {
      await modelButton.click();
      await page.waitForTimeout(1000);
      console.log('   ✓ Sélecteur de modèle ouvert\n');
      await page.screenshot({ path: 'aurion-2-model-selector.png' });
      
      // Fermer le sélecteur
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      console.log('   ✗ Bouton modèle non trouvé\n');
    }
  } catch (e) {
    console.log('   ✗ Erreur sélecteur modèle:', e.message, '\n');
  }
  
  // 6. Tester le sidebar navigation
  console.log('4. Test du sidebar...');
  try {
    const sidebarButtons = await page.$$('nav button, aside button, [role="navigation"] button');
    console.log(`   Nombre de boutons dans le sidebar: ${sidebarButtons.length}`);
    
    if (sidebarButtons.length > 0) {
      // Cliquer sur le premier bouton
      await sidebarButtons[0].click();
      await page.waitForTimeout(1000);
      console.log('   ✓ Premier bouton sidebar cliqué\n');
      await page.screenshot({ path: 'aurion-3-sidebar-click.png' });
    }
  } catch (e) {
    console.log('   ✗ Erreur sidebar:', e.message, '\n');
  }
  
  // 7. Tester les agents/tools
  console.log('5. Test des agents/tools...');
  try {
    const agentButton = await page.$('button:has-text("agent"), button:has-text("tool"), button:has-text("Agent"), button:has-text("Tool")');
    if (agentButton) {
      await agentButton.click();
      await page.waitForTimeout(1500);
      console.log('   ✓ Bouton agent cliqué\n');
      await page.screenshot({ path: 'aurion-4-agent-panel.png' });
      
      // Fermer le panel
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      console.log('   ✗ Bouton agent non trouvé\n');
    }
  } catch (e) {
    console.log('   ✗ Erreur agents:', e.message, '\n');
  }
  
  // 8. Tester les paramètres
  console.log('6. Test des paramètres...');
  try {
    const settingsButton = await page.$('button:has-text("settings"), button:has-text("Settings"), [aria-label*="settings"]');
    if (settingsButton) {
      await settingsButton.click();
      await page.waitForTimeout(1500);
      console.log('   ✓ Paramètres ouverts\n');
      await page.screenshot({ path: 'aurion-5-settings.png' });
      
      // Fermer les paramètres
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      console.log('   ✗ Bouton paramètres non trouvé\n');
    }
  } catch (e) {
    console.log('   ✗ Erreur paramètres:', e.message, '\n');
  }
  
  // 9. Tester le menu hamburger
  console.log('7. Test du menu hamburger...');
  try {
    const hamburgerButton = await page.$('button[aria-label*="menu"], button:has-text("menu"), button[aria-label="Menu"]');
    if (hamburgerButton) {
      await hamburgerButton.click();
      await page.waitForTimeout(1500);
      console.log('   ✓ Menu hamburger ouvert\n');
      await page.screenshot({ path: 'aurion-6-menu.png' });
      
      // Fermer le menu
      await hamburgerButton.click();
      await page.waitForTimeout(500);
    } else {
      console.log('   ✗ Bouton menu non trouvé\n');
    }
  } catch (e) {
    console.log('   ✗ Erreur menu:', e.message, '\n');
  }
  
  // 10. Capture finale
  await page.screenshot({ path: 'aurion-7-final.png' });
  console.log('   ✓ Capture finale prise\n');
  
  // 11. Attendre avant de fermer
  console.log('8. Attente avant fermeture...');
  await page.waitForTimeout(5000);
  
  // 12. Fermer le navigateur
  await browser.close();
  console.log('\n=== Test terminé avec succès ===');
})();
