// Screenshot pages via Chrome DevTools Protocol (no puppeteer): node scripts/shots.mjs <outDir> [base]
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const outDir = process.argv[2] ?? 'shots';
const base = process.argv[3] ?? 'http://localhost:5199';
fs.mkdirSync(outDir, { recursive: true });
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9333;
const chrome = spawn(CHROME, [`--remote-debugging-port=${port}`, '--headless=new', '--remote-allow-origins=*', '--disable-gpu', '--hide-scrollbars', '--window-size=1280,900', '--user-data-dir=' + path.join(outDir, '.profile'), 'about:blank'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));

const list = (await (await fetch(`http://localhost:${port}/json`)).json()).filter(t => t.type === 'page');
console.log('cdp: connecting', list[0]?.webSocketDebuggerUrl);
const ws = new WebSocket(list[0].webSocketDebuggerUrl);
await new Promise(r => (ws.onopen = r));
let id = 0; const pending = new Map(); const events = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else if (m.method) events.push(m); };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
console.log('cdp: ready');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PAGES = [
  ['home', '/'], ['warroom', '/#/warroom'], ['leaderboard', '/#leaderboard'], ['coding', '/#/coding'], ['images', '/#/images'], ['videos', '/#/videos'],
  ['speech', '/#/speech'], ['providers', '/#/providers'], ['benchmarks', '/#/benchmarks'], ['compare', '/#/compare'], ['planner', '/#/planner'], ['race', '/#/race'], ['methodology', '/#methodology'],
];
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const errors = [];
for (const [name, p] of PAGES) {
  if (only && !only.includes(name)) continue;
  for (const [tag, w, h, mobile] of (process.env.MOBILE_ONLY ? [['mobile', 390, 1600, true]] : [['desktop', 1280, 1800, false], ['mobile', 390, 1600, true]])) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
    events.length = 0;
    await send('Page.navigate', { url: 'about:blank' }); await sleep(300);
    await send('Page.navigate', { url: base + p });
    await sleep(1200);
    // Skip the intro screen if present + settle data + animations
    await send('Runtime.evaluate', { expression: `try{sessionStorage.setItem('aiwar-intro-seen','1')}catch(e){}` });
    await sleep(2200);
    // Scroll through so IntersectionObserver reveals fire, then back to top
    await send('Runtime.evaluate', { expression: `(async()=>{for(let y=0;y<document.body.scrollHeight;y+=400){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}window.scrollTo(0,0);})()`, awaitPromise: true });
    await sleep(1400);
    const { result } = await send('Runtime.evaluate', { expression: `JSON.stringify({h:document.body.scrollHeight, text:document.body.innerText.slice(0,120).replace(/\\n/g,' ')})`, returnByValue: true });
    const info = JSON.parse(result.result.value);
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: Math.min(info.h, process.env.MAXH ? +process.env.MAXH : 6000), deviceScaleFactor: 1, mobile });
    await sleep(300);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    fs.writeFileSync(path.join(outDir, `${name}-${tag}.png`), Buffer.from(shot.result.data, 'base64'));
    const errs = events.filter(e => (e.method === 'Runtime.exceptionThrown') || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error')).map(e => e.method === 'Runtime.exceptionThrown' ? e.params.exceptionDetails.exception?.description ?? e.params.exceptionDetails.text : e.params.entry.text);
    if (errs.length) errors.push({ page: `${name}-${tag}`, errs });
    console.log(`${name}-${tag}: ${info.h}px · ${errs.length} console errors · "${info.text.slice(0, 70)}"`);
  }
}
ws.close(); chrome.kill();
if (errors.length) { console.log('\nCONSOLE ERRORS'); for (const e of errors) console.log(e.page, e.errs.slice(0, 3)); }
process.exit(0);
