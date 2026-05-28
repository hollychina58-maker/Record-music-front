const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];

  const pages = [
    { name: 'HomePage', url: 'http://localhost:3001/' },
    { name: 'CreateStoryPage', url: 'http://localhost:3001/create' },
    { name: 'LoginPage', url: 'http://localhost:3001/login' },
    { name: 'RegisterPage', url: 'http://localhost:3001/register' },
    { name: 'ProfilePage', url: 'http://localhost:3001/profile' },
    { name: 'PaymentPage', url: 'http://localhost:3001/payment' },
  ];

  for (const p of pages) {
    console.log('\n=== Testing: ' + p.name + ' ===');
    try {
      await page.goto(p.url, { waitUntil: 'networkidle', timeout: 15000 });
      const title = await page.title();
      console.log('Title: ' + title);
      const h1 = await page.locator('h1').first().textContent().catch(() => 'No H1');
      console.log('H1: ' + h1);
      await page.screenshot({ path: 'd:/projects/Record-App/screenshots/' + p.name + '.png' });
      console.log('Screenshot saved');
      results.push({ name: p.name, status: 'OK' });
    } catch (error) {
      console.log('Error: ' + error.message);
      results.push({ name: p.name, status: 'FAIL' });
    }
  }

  await browser.close();
  console.log('\n=== Summary ===');
  results.forEach(r => console.log(r.name + ': ' + r.status));
})();
