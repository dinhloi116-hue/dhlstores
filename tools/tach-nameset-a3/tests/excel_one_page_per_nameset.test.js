// Run: node tools/tach-nameset-a3/tests/excel_one_page_per_nameset.test.js
// CorelDRAW COM simulation. Production COM behavior must be verified on Windows.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../src/V86_PATCH.html'),'utf8');
let code=html.match(/<script[^>]*>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(code,'Excel controller exists');
code=code.replace(/\}\)\(\);\s*$/,"window.__tests={separatePages,orderedExcelGroups};})();");
function scenario(count,options={}){
 let pages=[],deleteCount=0,undoCount=0,copies=0;
 function page(i){return{SizeWidth:297,SizeHeight:420,CenterX:148.5,CenterY:210,ActiveLayer:{id:i},Name:'',Activate(){},MoveTo(n){this.index=n}};}
 pages=[page(1)];
 const shapes=Array.from({length:count},(_,i)=>({
  Name:'DHL_EXCEL_ROW_'+(i+2)+'_SIZE_M',
  SizeWidth:options.tooWideIndex===i?290:200,SizeHeight:380,
  CenterX:0,CenterY:0,
  CopyToLayer(layer){
   if(options.failureIndex===i)throw Error('simulated COM copy failure');
   copies++;
   return{layer,CenterX:0,CenterY:0,Flip(){},CreateSelection(){}};
  },
  Delete(){deleteCount++;}
 }));
 const doc={
  Unit:4,get Pages(){return{Count:pages.length}},
  BeginCommandGroup(){},EndCommandGroup(){},
  Undo(){undoCount++},
  AddPagesEx(n,w,h){assert.equal(w,297);assert.equal(h,420);const result=page(pages.length+1);pages.push(result);return result;}
 };
 if(options.extraSourcePage)pages.push(page(2));
 const app={ActiveDocument:doc,ActivePage:pages[0],
  ActiveSelectionRange:{Count:shapes.length,Item(i){return shapes[i-1]}},
  ActiveWindow:{Refresh(){}}
 };
 const fields={
  sheetWidth:{value:297},sheetHeight:{value:420},sheetGap:{value:8},
  excelMirror:{checked:false},excelResult:{innerHTML:'',className:''}
 };
 const window={addEventListener(){},external:{Application:app}};
 const document={getElementById(id){return fields[id]||null}};
 new Function('window','document','setTimeout','currentLang','localStorage','corelApp',code)(
  window,document,()=>{},'vi',{getItem(){return null},setItem(){}},()=>app
 );
 const success=window.__tests.separatePages();
 return{success,pageCount:pages.length,deleteCount,undoCount,copies,
  pageNames:pages.map(p=>p.Name),msg:fields.excelResult.innerHTML,restored:doc.Unit===4};
}
const yes=scenario(37);
assert.equal(yes.success,true);
assert.equal(yes.pageCount,37,'exactly 37 pages without blank source');
assert.equal(yes.deleteCount,37,'delete 37 originals only after all 37 copies made');
assert.equal(yes.copies,37);
assert.equal(yes.restored,true);
assert.ok(yes.pageNames[0].includes('R2_SIZE_M'));
assert.ok(yes.pageNames[36].includes('R38_SIZE_M'));
const fail=scenario(37,{failureIndex:9});
assert.equal(fail.success,false);
assert.equal(fail.deleteCount,0,'do not delete originals if page/copy fails');
assert.equal(fail.undoCount,1,'undo the command group on failure');
assert.equal(fail.restored,true);
const huge=scenario(37,{tooWideIndex:12});
assert.equal(huge.success,false);
assert.equal(huge.copies,0,'preflight all shapes before moving anything');
assert.equal(huge.deleteCount,0);
const multi=scenario(37,{extraSourcePage:true});
assert.equal(multi.success,false);
assert.equal(multi.copies,0,'warn instead of silently creating extra print pages');
console.log('PASS: 37 pages; ordered entries; rollback; oversize preflight; extra-source-page guard');
