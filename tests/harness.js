const tests = [];
const stack = [];

export function describe(name, fn) {
  stack.push(name);
  try { fn(); } finally { stack.pop(); }
}

export function it(name, fn) {
  tests.push({ name: [...stack, name].join(' > '), fn });
}

function fmt(v) {
  try { return JSON.stringify(v); } catch (e) { return String(v); }
}

function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = stable(v[k]);
    return out;
  }
  return v;
}

export function expect(actual) {
  const fail = (msg) => { throw new Error(msg); };
  return {
    toBe(e) { if (!Object.is(actual, e)) fail(`expected ${fmt(actual)} to be ${fmt(e)}`); },
    toEqual(e) {
      const a = JSON.stringify(stable(actual));
      const b = JSON.stringify(stable(e));
      if (a !== b) fail(`expected ${a} to equal ${b}`);
    },
    toBeTruthy() { if (!actual) fail(`expected ${fmt(actual)} to be truthy`); },
    toBeFalsy() { if (actual) fail(`expected ${fmt(actual)} to be falsy`); },
    toBeGreaterThan(n) { if (!(actual > n)) fail(`expected ${fmt(actual)} > ${n}`); },
    toBeGreaterThanOrEqual(n) { if (!(actual >= n)) fail(`expected ${fmt(actual)} >= ${n}`); },
    toBeLessThan(n) { if (!(actual < n)) fail(`expected ${fmt(actual)} < ${n}`); },
    toBeLessThanOrEqual(n) { if (!(actual <= n)) fail(`expected ${fmt(actual)} <= ${n}`); },
    toContain(x) {
      const ok = typeof actual === 'string' ? actual.includes(x) : Array.isArray(actual) && actual.includes(x);
      if (!ok) fail(`expected ${fmt(actual)} to contain ${fmt(x)}`);
    },
    toThrow() {
      let threw = false;
      try { actual(); } catch (e) { threw = true; }
      if (!threw) fail('expected function to throw');
    },
  };
}

export async function run(grep = '') {
  const out = document.getElementById('results');
  const lines = [];
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    if (grep && !t.name.includes(grep)) continue;
    try {
      await t.fn();
      passed++;
      lines.push(`PASS ${t.name}`);
    } catch (e) {
      failed++;
      lines.push(`FAIL ${t.name}\n    ${e && e.message ? e.message : e}`);
    }
  }
  lines.push('');
  lines.push(`${passed} passed, ${failed} failed`);
  if (failed === 0 && passed > 0) lines.push('ALL PASSED');
  out.textContent = lines.join('\n');
  document.title = failed === 0 && passed > 0 ? 'PASS' : 'FAIL';
  window.__results = { passed, failed };
  return { passed, failed };
}
