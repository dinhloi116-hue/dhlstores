// Node.js regression tests for the HTML-docker selection guard.
// Run from the repository root: node tools/tach-nameset-a3/tests/safe_selection.test.js
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const file = path.join(__dirname, '..', 'src', 'V832_SAFE_SELECTION.html');
const source = fs.readFileSync(file, 'utf8');
const code = source.match(/<script[^>]*>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(code, 'Safety script exists');
const fields = {
  v77NestW:{value:'32.5'},v77NestH:{value:'57.5'},
  v77MarginL:{value:'0'},v77MarginR:{value:'0'},
  v77MarginT:{value:'0'},v77MarginB:{value:'0'},
  v85Width:{value:'0'},v85Height:{value:'0'},
  v85Lock:{checked:true},v832AllowLoose:{checked:false},
  v832SafetyError:{innerHTML:''}
};
const document = {
  getElementById(id){return fields[id] || null;},
  addEventListener(){}
};
const window = {addEventListener(){}};
new Function('window','document','corelApp','currentLang',code)(
  window,document,undefined,'vi'
);
const doc = {Unit:4};
const app = {ActiveDocument:doc};
const loose = {SizeWidth:60,SizeHeight:70};
const group = {Shapes:{Count:3},SizeWidth:260,SizeHeight:280};
const tooWide = {Shapes:{Count:3},SizeWidth:525,SizeHeight:566.81};
function expectBlocked(shapes,message){
  assert.throws(()=>window.DHLNestPreflight(app,shapes),new RegExp(message));
  assert.equal(doc.Unit,4,'Document unit restored after rejection');
}
function expectAllowed(shapes){
  assert.equal(window.DHLNestPreflight(app,shapes),true);
  assert.equal(doc.Unit,4,'Document unit restored after acceptance');
}
expectBlocked(Array(10).fill(loose),'CHẶN');
expectAllowed([group,group]);
expectBlocked([tooWide],'không vừa khổ');
fields.v85Width.value='30';
expectAllowed([tooWide]);
fields.v85Width.value='0';
fields.v832AllowLoose.checked=true;
expectAllowed([loose,loose]);
fields.v832AllowLoose.checked=false;
console.log('PASS: 5 Corel-independent selection safety tests');
