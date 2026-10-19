// Run: node tools/tach-nameset-a3/tests/excel_import_4col_size.test.js
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
function extract(file){
 const html=fs.readFileSync(path.join(__dirname,'../src',file),'utf8');
 let js=html.match(/<script[^>]*>([\s\S]*?)<\/script>/i)[1];
 js=js.replace(/\}\)\(\);\s*$/,"window.__test={rowsFromMatrix};})();");
 const win={addEventListener(){}};
 new Function('window','document','setTimeout','currentLang','localStorage',js)(
   win,{},()=>{},'vi',{getItem(){return null},setItem(){}}
 );
 return win.__test.rowsFromMatrix;
}
for(const file of ['V84_PATCH.html','V86_PATCH.html']){
 const parse=extract(file);
 const records=parse([
  ['Tên áo','Số áo','Dòng thứ 3','Size'],
  ['CUSTOMER A',11,'A12-K41-MK','S'],
  ['CUSTOMER B',868,'A12-K41-MK','S'],
  ['COACH',null,null,'M'],
  ['CUSTOMER C',6,'A12-K41-MK','XL']
 ]);
 assert.equal(records.length,4);
 assert.deepEqual(records.map(x=>x.size),['S','S','M','XL']);
 assert.equal(records[0].footer,'A12-K41-MK');
 assert.equal(records[1].number,'868');
 assert.equal(records[2].nameOnly,true);
 assert.equal(records[2].number,'');
 assert.equal(records[2].name,'COACH');
 assert.equal(parse([['Tên in áo','Số áo'],['MESSI',10]])[0].number,'10');
 assert.equal(parse([['Nội dung in'],['MESSI - 10 - A12-K41-MK']])[0].footer,'A12-K41-MK');
 assert.equal(parse([['Tên áo','Số áo','Dòng thứ 3','Size'],['RONALDINHO',10,'','L']])[0].size,'L');
}
console.log('PASS: 4-col nameset imports, size metadata, name-only COACH, legacy input');
