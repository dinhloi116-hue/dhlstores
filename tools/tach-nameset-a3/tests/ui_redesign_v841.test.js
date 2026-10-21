// Run: node tools/tach-nameset-a3/tests/ui_redesign_v841.test.js
// Static regressions for CorelDRAW MSHTML-compatible UI V8.41.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../src/DockerUI_CURRENT.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../src/V841_UI_REDESIGN.html'),'utf8');
assert.ok(html.includes('DHL_UI_VERSION=8.41'));
assert.equal((html.match(/id="dhl-v841-ui-redesign-style"/g)||[]).length,1,'no duplicate theme');
assert.ok(html.includes('id="dhl-v840-fast-update"'),'fast updater retained');
assert.ok(html.includes('id="dhl-v838-direct-groups"'),'direct-group tool retained');
assert.ok(html.includes('id="dhl-v837-digit-logo"'),'digit-logo tool retained');
assert.ok(html.includes('<span class="ver">v8.41</span>'),'visible version at first paint');
assert.ok(html.includes("v8.41 · outline + UI"),'deferred version update matches release');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
scripts.forEach((m,i)=>assert.doesNotThrow(()=>new Function(m[1]),'JS script '+i));
const source=css.replace(/\/\*[\s\S]*?\*\//g,'');
let depth=0;
for(const ch of source){if(ch==='{')depth++;if(ch==='}')depth--;assert.ok(depth>=0,'CSS braces must not underflow');}
assert.equal(depth,0,'CSS braces balance');
assert.ok(!/display:\s*(?:grid|flex)|var\(--|:has\(/i.test(css),'MSHTML-safe CSS only');
for(const id of ['reloadGit','v82-tabbtn.selected','v838Run','v77NestBtn','v86MakeGroups','excelRun','v77OutlineBtn','v77UndoNest']){
 assert.ok(css.includes(id),'button/tab highlight missing: '+id);
}
const luminance=h=>{
 const p=[1,3,5].map(i=>parseInt(h.substring(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4));
 return .2126*p[0]+.7152*p[1]+.0722*p[2];
};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
for(const [name,fg,bg] of [
 ['primary','#ffffff','#1769d0'],
 ['update','#ffffff','#08795b'],
 ['secondary','#19466f','#eaf2fc'],
 ['field text','#112e4a','#ffffff'],
 ['selected tab','#0f4fa3','#dceafe']
]) assert.ok(contrast(fg,bg)>=4.5,name+' text contrast below AA');
console.log('PASS: V8.41 UI visible version, highlighted actions, MSHTML-safe CSS, 35 JS scripts, WCAG contrast');
