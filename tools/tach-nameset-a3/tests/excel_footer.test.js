// Run: node tools/tach-nameset-a3/tests/excel_footer.test.js
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
function getAPI(filename){
 const file=fs.readFileSync(path.join(__dirname,'..','src',filename),'utf8');
 let script=file.match(/<script[^>]*>([\s\S]*?)<\/script>/i)[1];
 script=script.replace(/\}\)\(\);\s*$/,"window.__api={rowsFromMatrix,splitPrintSyntax,groupPair:typeof groupPair==='function'?groupPair:null};})();");
 const window={addEventListener(){}};
 new Function('window','document','setTimeout','currentLang','localStorage',script)(
  window,{},()=>{},'vi',{getItem(){return null},setItem(){}}
 );
 return window.__api;
}
for(const filename of ['V84_PATCH.html','V86_PATCH.html']){
 const {rowsFromMatrix}=getAPI(filename);
 const cases=[
  {m:[['Tên','Số'],['MESSI','10']],footer:''},
  {m:[['Tên','Số','Dòng dưới số'],['MESSI','10','A12-K41-MK']],footer:'A12-K41-MK'},
  {m:[['Nội dung in'],['MESSI - 10 - A12-K41-MK']],footer:'A12-K41-MK'},
  {m:[['MESSI - 10 - A12-K41-MK']],footer:'A12-K41-MK'},
  {m:[['MESSI','10','A12-K41-MK']],footer:'A12-K41-MK'},
  {m:[['Nội dung in'],['MESSI - 10']],footer:''}
 ];
 for(const q of cases){
  const rows=rowsFromMatrix(q.m);
  assert.equal(rows.length,1);
  assert.equal(rows[0].name,'MESSI');
  assert.equal(rows[0].number,'10');
  assert.equal(rows[0].footer,q.footer);
 }
 const mixed=rowsFromMatrix([['Tên','Số','Dòng dưới số'],['MESSI','10',''],['RONALDO','7','A12-K41-MK']]);
 assert.equal(mixed.length,2);
 assert.equal(mixed[0].footer,'');
 assert.equal(mixed[1].footer,'A12-K41-MK');
}
const {groupPair}=getAPI('V86_PATCH.html');
let added=[];
const app={CreateShapeRange(){return{Add(s){added.push(s)},Group(){return{Count:added.length}}}}};
const name={SizeHeight:30,CenterX:0,CenterY:0};
const number={SizeHeight:200,CenterX:50,CenterY:300};
const footer={SizeHeight:18,CenterX:0,CenterY:0};
const group=groupPair(app,name,number,25,footer,10);
assert.equal(group.Count,3);
assert.equal(name.CenterX,50);
assert.equal(footer.CenterX,50);
assert.equal(name.CenterY,440);
assert.equal(footer.CenterY,181);
console.log('PASS 15: two-/three-column, one-cell syntax, mixed rows, footer positioning');
