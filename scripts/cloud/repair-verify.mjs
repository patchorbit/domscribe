// Controller-owned browser assertions. Do not copy into the agent app worktree.
import fs from 'node:fs';
import path from 'node:path';
const labels = {
  'line-a': 'Midnight travel mug',
  'line-b': 'Ocean travel mug',
  'line-c': 'Graphite notebook',
};
async function quantities(page) {
  const result = {};
  for (const [id, label] of Object.entries(labels))
    result[id] = Number(
      await page
        .getByRole('article', { name: label, exact: true })
        .locator('output')
        .innerText(),
    );
  return result;
}
async function edit(page, id, value, cancel = false) {
  await page
    .getByRole('article', { name: labels[id], exact: true })
    .getByRole('button', { name: 'Edit quantity', exact: true })
    .click();
  await page
    .getByRole('spinbutton', { name: 'Quantity', exact: true })
    .fill(String(value));
  await page
    .getByRole('button', {
      name: cancel ? 'Cancel' : 'Save quantity',
      exact: true,
    })
    .click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}
function watch(page, evidence) {
  page.on('pageerror', (e) => evidence.pageErrors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') evidence.consoleErrors.push(m.text());
  });
  page.on('requestfailed', (r) =>
    evidence.networkErrors.push({
      url: r.url(),
      error: r.failure()?.errorText,
    }),
  );
  page.on('response', (r) => {
    if (r.status() >= 400)
      evidence.networkErrors.push({ url: r.url(), status: r.status() });
  });
}
async function withPage(browser, url, evidence, callback) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 820 },
  });
  const page = await context.newPage();
  watch(page, evidence);
  try {
    await page.goto(url);
    await page
      .getByRole('heading', { name: 'Your cart', exact: true })
      .waitFor();
    return await callback(page);
  } finally {
    await context.close();
  }
}
function errors() {
  return { pageErrors: [], consoleErrors: [], networkErrors: [] };
}
export async function verifyBefore(browser, url, reportDir) {
  fs.mkdirSync(reportDir, { recursive: true });
  const e = errors();
  await withPage(browser, url, e, async (page) => {
    await edit(page, 'line-a', 3);
    await page.reload();
    await page
      .getByRole('heading', { name: 'Your cart', exact: true })
      .waitFor();
    e.observed = await quantities(page);
    await page.screenshot({
      path: path.join(reportDir, 'repair-before.png'),
      fullPage: true,
    });
  });
  if (e.pageErrors.length || e.consoleErrors.length || e.networkErrors.length)
    throw Error('Before reproduction has application errors');
  if (
    JSON.stringify(e.observed) !==
    JSON.stringify({ 'line-a': 3, 'line-b': 3, 'line-c': 1 })
  )
    throw Error(
      'Expected seeded same-SKU sibling corruption was not reproduced',
    );
  return e;
}
export async function verifyAfter(browser, devUrl, productionUrl, reportDir) {
  const e = errors();
  await withPage(browser, devUrl, e, async (page) => {
    await edit(page, 'line-a', 3);
    e.saved = await quantities(page);
    await page.reload();
    await page
      .getByRole('heading', { name: 'Your cart', exact: true })
      .waitFor();
    e.reloaded = await quantities(page);
    await page.screenshot({
      path: path.join(reportDir, 'repair-after.png'),
      fullPage: true,
    });
  });
  await withPage(browser, devUrl, e, async (page) => {
    await page
      .getByRole('button', { name: 'Reverse order', exact: true })
      .click();
    await edit(page, 'line-b', 4);
    await page.reload();
    await page
      .getByRole('heading', { name: 'Your cart', exact: true })
      .waitFor();
    e.sorted = await quantities(page);
  });
  await withPage(browser, devUrl, e, async (page) => {
    const filter = page.getByRole('textbox', {
      name: 'Filter items',
      exact: true,
    });
    await filter.fill('Graphite');
    await edit(page, 'line-c', 2);
    await filter.fill('');
    await page.reload();
    await page
      .getByRole('heading', { name: 'Your cart', exact: true })
      .waitFor();
    e.filtered = await quantities(page);
  });
  await withPage(browser, devUrl, e, async (page) => {
    await edit(page, 'line-a', 7, true);
    await page.reload();
    await page
      .getByRole('heading', { name: 'Your cart', exact: true })
      .waitFor();
    e.cancelled = await quantities(page);
  });
  await withPage(browser, productionUrl, e, async (page) => {
    await edit(page, 'line-a', 3);
    e.production = await quantities(page);
    e.productionInstrumented = await page.evaluate(() =>
      Boolean(
        window.__runtime ||
        window.__DOMSCRIBE_RELAY_PORT__ ||
        [...document.querySelectorAll('*')].some(
          (el) =>
            el.tagName.toLowerCase().includes('domscribe') ||
            [...el.attributes].some((a) => a.name.startsWith('data-ds')),
        ),
      ),
    );
  });
  return e;
}
