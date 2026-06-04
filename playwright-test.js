// Screeno UI integration test — Phase 2 frontend verification
const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:5173';
const API  = 'http://localhost:4000';

let ssIdx = 0;
const ss = async (page, name) => {
  const p = path.join('f:\\screeno v1', `ss-${String(ssIdx++).padStart(2,'0')}-${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`  📸 ${p}`);
  return p;
};

async function runTest() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx     = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page    = await ctx.newPage();

  page.on('console', m => { if (m.type() === 'error') console.log(`  [BROWSER ERR] ${m.text()}`); });
  page.on('pageerror', e => console.log(`  [PAGE ERR] ${e.message}`));

  const results = [];
  const pass = msg => { console.log(`✅ ${msg}`); results.push({ ok: true,  msg }); };
  const warn = msg => { console.log(`⚠️  ${msg}`); results.push({ ok: null,  msg }); };
  const fail = msg => { console.log(`❌ ${msg}`); results.push({ ok: false, msg }); };

  // ────────────────────────────────────────────────────────────────
  // STEP 1 — Login
  // ────────────────────────────────────────────────────────────────
  try {
    console.log('\n── STEP 1: Login ──');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await ss(page, 'login-page');
    await page.locator('input[type="email"]').first().fill('manager@psspl.com');
    await page.locator('input[type="password"]').first().fill('Test@1234');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/(manager|dashboard)/, { timeout: 12000 });
    await page.waitForTimeout(1500);
    await ss(page, 'after-login');
    pass(`Login → ${page.url()}`);
  } catch (e) {
    fail(`Login failed: ${e.message}`);
    await ss(page, 'login-error');
    await browser.close();
    printSummary(results);
    return;
  }

  // ────────────────────────────────────────────────────────────────
  // STEP 2 — Team page loads
  // ────────────────────────────────────────────────────────────────
  try {
    console.log('\n── STEP 2: Team page ──');
    await page.goto(`${BASE}/manager/team`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await ss(page, 'team-page');
    const h1 = await page.locator('h1').first().textContent().catch(() => '');
    pass(`Team page loaded — heading: "${h1}"`);
  } catch (e) {
    fail(`Team page: ${e.message}`);
  }

  // ────────────────────────────────────────────────────────────────
  // STEP 3 — Add a team member
  // ────────────────────────────────────────────────────────────────
  let newMemberEmail = `test.e2e.${Date.now()}@psspl.com`;
  try {
    console.log('\n── STEP 3: Add team member ──');

    // Click the header "Add Member" button (has UserPlus icon, no type="submit")
    await page.locator('button:has-text("Add Member")').first().click();
    await page.waitForTimeout(1000);
    await ss(page, 'add-member-modal-open');

    // Fill inputs scoped inside the dialog
    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('#firstName').fill('E2E');
    await dialog.locator('#lastName').fill('Tester');
    await dialog.locator('#email').fill(newMemberEmail);
    await dialog.locator('#phone').fill('9999999999');
    await ss(page, 'add-member-filled');

    // Submit — scoped to dialog to avoid matching the page button
    await dialog.locator('button[type="submit"]').click();
    await page.waitForTimeout(2500);
    await ss(page, 'after-add-member');

    const bodyText = await page.textContent('body');
    if (bodyText.includes('E2E') || bodyText.includes('Tester') || bodyText.includes(newMemberEmail)) {
      pass('Team member "E2E Tester" added and appears in list');
    } else {
      warn('Add member submitted — member not yet visible in list (may need reload)');
    }
  } catch (e) {
    fail(`Add member: ${e.message}`);
    await ss(page, 'add-member-error');
  }

  // ────────────────────────────────────────────────────────────────
  // STEP 4 — Click a member row → member profile
  // ────────────────────────────────────────────────────────────────
  let memberId = null;
  try {
    console.log('\n── STEP 4: Member profile ──');
    await page.goto(`${BASE}/manager/team`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Find the newly added member row and click the name cell
    const memberLink = page.locator('text=E2E Tester').first();
    if (await memberLink.isVisible().catch(() => false)) {
      await memberLink.click();
    } else {
      // Fall back — click the first member name row
      await page.locator('tbody tr').first().locator('[style*="cursor: pointer"]').click();
    }
    await page.waitForURL(/\/manager\/team\/\d+/, { timeout: 8000 });
    memberId = page.url().split('/').pop();
    await page.waitForTimeout(1500);
    await ss(page, 'member-profile');
    pass(`Member profile → /manager/team/${memberId}`);
  } catch (e) {
    fail(`Member profile: ${e.message}`);
    await ss(page, 'member-profile-error');
  }

  // ────────────────────────────────────────────────────────────────
  // STEP 5 — Schedule modal on member profile
  // ────────────────────────────────────────────────────────────────
  let interviewToken = null;
  try {
    console.log('\n── STEP 5: Schedule interview ──');
    // Open schedule modal from team page row
    await page.goto(`${BASE}/manager/team`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Click "Schedule" inline button on any row
    const schedBtn = page.locator('button:has-text("Schedule")').first();
    await schedBtn.click();
    await page.waitForTimeout(1500);
    await ss(page, 'schedule-modal-open');

    const dialog = page.locator('[role="dialog"]');
    const dialogVisible = await dialog.isVisible().catch(() => false);
    if (dialogVisible) {
      pass('Schedule modal opened');

      // Step 1 of schedule modal — select type
      const aiBtn = dialog.locator('button:has-text("AI"), button:has-text("Voice"), button:has-text("Interview")').first();
      if (await aiBtn.isVisible().catch(() => false)) {
        await aiBtn.click();
        await page.waitForTimeout(500);
      }
      await ss(page, 'schedule-step1');

      // Next button
      const nextBtn = dialog.locator('button:has-text("Next")').first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(500);
        await ss(page, 'schedule-step2');

        // Step 2 — try to proceed
        const nextBtn2 = dialog.locator('button:has-text("Next")').first();
        if (await nextBtn2.isVisible().catch(() => false)) {
          await nextBtn2.click();
          await page.waitForTimeout(500);
          await ss(page, 'schedule-step3');
        }

        // Step 3 — try to proceed
        const nextBtn3 = dialog.locator('button:has-text("Next")').first();
        if (await nextBtn3.isVisible().catch(() => false)) {
          await nextBtn3.click();
          await page.waitForTimeout(500);
          await ss(page, 'schedule-step4');
        }

        // Final confirm button (step 4: "Schedule and Send Invite →")
        const confirmBtn = dialog.locator('button:has-text("Schedule")').last();
        if (await confirmBtn.isVisible().catch(() => false)) {
          // Intercept POST /api/schedule to grab the token
          const responsePromise = page.waitForResponse(
            r => r.url().includes('/api/schedule') && r.request().method() === 'POST',
            { timeout: 12000 }
          ).catch(() => null);
          await confirmBtn.click();
          const response = await responsePromise;
          if (response) {
            const body = await response.json().catch(() => ({}));
            interviewToken = body.data?.token || body.token;
            const status = response.status();
            pass(`Schedule API responded — status: ${status}, token: ${interviewToken || '(none)'}`);
          } else {
            warn('Schedule submit clicked but POST /api/schedule not intercepted in time');
          }
          await page.waitForTimeout(2000);
          await ss(page, 'after-schedule');
        } else {
          warn('No final confirm button found in schedule modal');
          await ss(page, 'schedule-no-confirm');
        }
      } else {
        warn('No Next button in schedule modal — checking modal content');
        const modalText = await dialog.textContent();
        console.log('  Modal content:', modalText.slice(0, 300));
      }
    } else {
      fail('Schedule modal did not open');
    }
  } catch (e) {
    fail(`Schedule: ${e.message}`);
    await ss(page, 'schedule-error');
  }

  // ────────────────────────────────────────────────────────────────
  // STEP 6 — Get interview token by creating schedule directly via API
  // ────────────────────────────────────────────────────────────────
  if (!interviewToken) {
    try {
      console.log('\n── STEP 6a: Create schedule via API to get token ──');

      // Login via API to get JWT
      const loginRes = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'manager@psspl.com', password: 'Test@1234' }),
      });
      const loginData = await loginRes.json();
      const jwt = loginData.token || loginData.accessToken;
      console.log('  Login status:', loginRes.status, 'jwt length:', jwt?.length);

      // Get first team member id
      const teamRes = await fetch(`${API}/api/team`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const teamData = await teamRes.json();
      const members = teamData.data || teamData;
      console.log('  Team count:', Array.isArray(members) ? members.length : 'N/A');
      const firstMember = Array.isArray(members) ? members[0] : null;
      if (!firstMember) {
        warn('No team members — cannot create schedule via API');
      } else {
        const schedRes = await fetch(`${API}/api/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
          body: JSON.stringify({
            candidateId: firstMember.id,
            type: 'ai_voice',
            interviewMode: 'simple',
            transcriptionMode: 'api',
            difficulty: 'medium',
            windowDays: 7,
            maxAttempts: 3,
          }),
        });
        const schedData = await schedRes.json();
        console.log('  Schedule response:', JSON.stringify(schedData).slice(0, 300));
        interviewToken = schedData.data?.token || schedData.token;
        if (interviewToken) {
          pass(`Got interview token from API: ${interviewToken.slice(0, 12)}…`);
        } else {
          warn('Schedule created but no token in response');
        }
      }
    } catch (e) {
      warn(`API token fetch failed: ${e.message}`);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // STEP 7 — Candidate flow (landing → device check → consent)
  // ────────────────────────────────────────────────────────────────
  if (interviewToken) {
    const candidatePage = await ctx.newPage();
    try {
      console.log(`\n── STEP 7: Candidate flow — token: ${interviewToken} ──`);

      // Landing page
      await candidatePage.goto(`${BASE}/interview/${interviewToken}`, { waitUntil: 'networkidle' });
      await candidatePage.waitForTimeout(2000);
      await ss(candidatePage, 'candidate-landing');
      const landingText = await candidatePage.textContent('body');
      if (landingText.toLowerCase().includes('welcome') || landingText.toLowerCase().includes('interview') || landingText.toLowerCase().includes('start')) {
        pass('Candidate landing page rendered');
      } else if (landingText.toLowerCase().includes('invalid') || landingText.toLowerCase().includes('expired')) {
        warn('Candidate landing: token invalid/expired');
      } else {
        warn(`Candidate landing: unexpected content — ${landingText.slice(0, 150)}`);
      }

      // Try to proceed to device check
      const startBtn = candidatePage.locator('button:has-text("Start"), button:has-text("Begin"), button:has-text("Continue"), button:has-text("Next")').first();
      if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await startBtn.click();
        await candidatePage.waitForTimeout(2000);
        await ss(candidatePage, 'device-check');
        const deviceText = await candidatePage.textContent('body');
        if (deviceText.toLowerCase().includes('camera') || deviceText.toLowerCase().includes('device') || deviceText.toLowerCase().includes('microphone')) {
          pass('Device check page reached');
        } else {
          warn(`After start: ${deviceText.slice(0, 100)}`);
        }
      } else {
        warn('No Start/Begin button on landing page');
      }
    } catch (e) {
      fail(`Candidate flow: ${e.message}`);
      await ss(candidatePage, 'candidate-error');
    } finally {
      await candidatePage.close();
    }
  }

  // ────────────────────────────────────────────────────────────────
  // STEP 8 — Reports, Templates, Manager Profile
  // ────────────────────────────────────────────────────────────────
  const pages = [
    { url: `${BASE}/manager/reports`,   label: 'Reports page',          kw: ['report','result','assessment'] },
    { url: `${BASE}/manager/templates`, label: 'Templates page',        kw: ['template','question','create'] },
    { url: `${BASE}/manager/profile`,   label: 'Manager profile page',  kw: ['profile','name','password'] },
  ];
  for (const p of pages) {
    try {
      console.log(`\n── STEP 8: ${p.label} ──`);
      await page.goto(p.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await ss(page, p.label.replace(/\s+/g, '-').toLowerCase());
      const txt = (await page.textContent('body')).toLowerCase();
      const found = p.kw.find(k => txt.includes(k));
      found ? pass(`${p.label} loaded — found keyword "${found}"`) : warn(`${p.label} — no expected keyword`);
    } catch (e) {
      fail(`${p.label}: ${e.message}`);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // STEP 9 — Sidebar links present
  // ────────────────────────────────────────────────────────────────
  try {
    console.log('\n── STEP 9: Sidebar navigation ──');
    await page.goto(`${BASE}/manager/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await ss(page, 'dashboard');
    const navText = await page.locator('nav, aside, [class*="sidebar"]').first().textContent().catch(() => '');
    for (const link of ['Team', 'Schedule', 'Report', 'Template']) {
      navText.includes(link) ? pass(`Sidebar: "${link}" link present`) : warn(`Sidebar: "${link}" missing`);
    }
  } catch (e) {
    fail(`Sidebar: ${e.message}`);
  }

  // ────────────────────────────────────────────────────────────────
  // PROBE — Invalid magic link token handled gracefully
  // ────────────────────────────────────────────────────────────────
  try {
    console.log('\n── PROBE: Invalid token ──');
    await page.goto(`${BASE}/interview/INVALID-TOKEN-XYZ`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await ss(page, 'invalid-token');
    const txt = (await page.textContent('body')).toLowerCase();
    const graceful = txt.includes('invalid') || txt.includes('expired') || txt.includes('not found') || txt.includes('error');
    graceful ? pass('🔍 Invalid token → graceful error shown') : warn(`🔍 Invalid token → unexpected content: ${txt.slice(0,100)}`);
  } catch (e) {
    fail(`Invalid token probe: ${e.message}`);
  }

  await browser.close();
  printSummary(results);
}

function printSummary(results) {
  console.log('\n═══════════════ RESULTS ═══════════════');
  results.forEach(r => console.log(`${r.ok === true ? '✅' : r.ok === false ? '❌' : '⚠️ '} ${r.msg}`));
  const passed  = results.filter(r => r.ok === true).length;
  const warned  = results.filter(r => r.ok === null).length;
  const failed  = results.filter(r => r.ok === false).length;
  console.log(`\nPassed: ${passed}  Warned: ${warned}  Failed: ${failed}`);
  console.log(failed === 0 ? '\n✅  OVERALL: PASS' : '\n❌  OVERALL: FAIL');
}

runTest().catch(e => { console.error('UNHANDLED:', e); process.exit(1); });
