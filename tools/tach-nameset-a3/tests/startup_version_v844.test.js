// node tools/tach-nameset-a3/tests/startup_version_v844.test.js
// Prevent startup regression where a historical V8.24 timer rewrites the version label.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'src/DockerUI_CURRENT.html'),'utf8');
const fast=fs.readFileSync(path.join(root,'src/V840_FAST_UPDATER.html'),'utf8');
const ps=fs.readFileSync(path.join(root,'UPDATE_DHL_NAMESET.ps1'),'utf8');
const m=ui.match(/DHL_UI_VERSION=(\d+\.\d+)/);
assert.ok(m,'release marker');
const version=m[1];
assert.equal(version,'8.54');
assert.ok(ui.includes('<span class="ver">v'+version+'</span>'),'first paint uses latest version');
const writers=[...ui.matchAll(/\.innerHTML\s*=\s*['"]v(\d+\.\d+)['"]/g)];
assert.ok(writers.length>=20,'old deferred version writers are still covered by regression');
for(const setter of writers){
 assert.equal(setter[1],version,'no old timer may overwrite latest version: '+setter[0]);
}
const footers=[...ui.matchAll(/DHL Nameset Layout · v(\d+\.\d+) ·/g)];
for(const setter of footers){
 assert.equal(setter[1],version,'all UI footers use current release');
}
assert.ok(fast.includes('-CurrentAddonDir'),'passes live Corel Docker directory to updater');
assert.ok(ui.includes('-CurrentAddonDir'),'published HTML embeds fixed updater');
assert.ok(ps.includes('ACTIVE COREL DOCKER:'),'logs exact Docker path');
assert.ok(ps.includes('ACTIVE VERIFY OK:'),'verifies persistent file bytes');
assert.ok(ps.includes('ACTIVE VERIFY FAILED:'),'rejects wrong-target updates');
assert.ok(ps.includes('DockerUI_CURRENT.html?fresh='),'downloads current snapshot');
assert.ok(!ps.includes(' -Recurse'),'updater does not scan whole disk');
for(const [i,x] of [...ui.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].entries()){
 assert.doesNotThrow(()=>new Function(x[1]),'embedded script '+i+' compiles');
}
console.log('PASS V8.44: latest first-paint, no V8.24 timers, active addon update and verification');
