// node tools/tach-nameset-a3/tests/legacy_launcher_exit91_v842.test.js
// Regression: V8.22 launcher previously rejected modern updater and returned error 91.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const parent=path.join(__dirname,'..');
const updater=fs.readFileSync(path.join(parent,'UPDATE_DHL_NAMESET.ps1'),'utf8');
const ui=fs.readFileSync(path.join(parent,'src/DockerUI_CURRENT.html'),'utf8');
function legacyAllows(s) {
 // Direct port of V8.22 old PowerShell version-check condition.
 return s.indexOf('DHL Nameset Layout updater V8.22')>=0 ||
        s.indexOf('DHL Nameset Layout updater V8.23')>=0;
}
assert.ok(legacyAllows(updater),'V8.22 launcher accepts current direct-latest updater');
assert.ok(updater.includes('DockerUI_CURRENT.html?fresh='),'still downloads one latest UI snapshot');
assert.ok(updater.includes('[IO.File]::Replace('),'uses backed-up replacement');
assert.ok(updater.includes('Get-FileHash'),'skips unchanged installs');
assert.ok(ui.includes('DHL_UI_VERSION=8.42'));
assert.ok(ui.includes('id="dhl-v840-fast-update"'),'current handler retained');
assert.ok(!ui.includes('id="dhl-v822-update-recovery"'),'no code-91 loader registered');
assert.ok(!ui.includes('window.reloadFromGit=reloadV77'),'older handler cannot regain ownership');
assert.ok(!ui.includes('DHL_NAMESET_LAUNCHER_LOG.txt'),'obsolete launcher gone');
assert.ok(!ui.includes('CAI_TOOL_TACH_NAMESET_A3.bat'),'no BAT update path');
assert.ok(ui.includes("v8.42 · outline + UI"),'deferred version matches');
let scripts=[...ui.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
scripts.forEach((x,i)=>assert.doesNotThrow(()=>new Function(x[1]),'JavaScript block #'+i));
console.log('PASS: V8.22 compatibility, direct updater, legacy handler removal, '+scripts.length+' JS blocks');
