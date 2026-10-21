// Run: node tools/tach-nameset-a3/tests/digit_logo.test.js
// Mock-Corel test for V8.37. Windows/CorelDRAW COM integration must be tested separately.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../src/V837_DIGIT_LOGO.html'),'utf8');
let script=html.match(/<script[^>]*>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(script,'V8.37 script present');
script=script.replace(/\}\)\(\);\s*$/,"window.__test={prefs,slotsFor,glyphWidths,intoNumber,manual,parkSource,numberText};})();");
const created=[],temporary=[],grouped=[];
let selected=[],undo=0;
const layer={Name:'Layer 1'};
const doc={
 Name:'Untitled-1',FullFileName:'',Unit:4,
 BeginCommandGroup(){},EndCommandGroup(){},Undo(){undo++}
};
const logo={
 Name:'CREST_SOURCE',SizeWidth:12,SizeHeight:14,CenterX:148.5,CenterY:210,Layer:layer,
 CopyToLayer(dst){
  const s={Name:'',Layer:dst,SizeWidth:12,SizeHeight:14,CenterX:0,CenterY:0,
   SetSize(w,h){this.SizeWidth=w;this.SizeHeight=h;},Delete(){this.deleted=true;},
   OrderFrontOne(){},Flip(){}};
  created.push(s);return s;
 }
};
const app={
 ActiveDocument:doc,
 ActiveWindow:{Refresh(){}},
 get ActiveSelectionRange(){return{Count:selected.length,Item(i){return selected[i-1];}};},
 CreateShapeRange(){
  const shapes=[];
  return{Add(x){shapes.push(x)},Group(){
    const s={Name:'',Shapes:{Count:shapes.length,Item(i){return shapes[i-1];}},CreateSelection(){}};
    grouped.push({shapes,group:s});return s;
  }};
 }
};
const window={addEventListener(){},external:{Application:app}};
const document={getElementById(){return null}};
const localStorage={getItem(){return null},setItem(){}};
new Function('window','document','localStorage','setTimeout','currentLang','corelApp',script)(
 window,document,localStorage,()=>{},'vi',null
);
const {prefs,slotsFor,intoNumber,manual,parkSource}=window.__test;
selected=[logo];assert.equal(window.DHLNumberLogo.capture(),true);
prefs.on=true;prefs.pct=9;prefs.bottom=2;prefs.inset=1;
const charWidths={0:65,1:25,2:57,3:55,4:45,5:56,6:60,7:45,8:62,9:59};
function number(text){
 return {
  Name:'NUMBER',Layer:layer,SizeWidth:80,SizeHeight:250,CenterX:100,CenterY:300,
  Text:{Story:{Text:text,Font:'Sports'}},
  Duplicate(){
   let token=text;
   const fake={SizeHeight:250,Text:{Story:{
     get Text(){return token;},set Text(s){token=s;}
   }},Delete(){temporary.push(this)}};
   Object.defineProperty(fake,'SizeWidth',{get(){return charWidths[token]||70}});
   return fake;
  }
 };
}
const ten=number('10'),out=intoNumber(ten,'10',layer),slots=slotsFor(ten,'10','per');
assert.equal(out.length,2,'two digit logos for number 10');
assert.ok(out[0].CenterX<out[1].CenterX);
assert.ok(slots[0].width<slots[1].width,'proportional glyph widths, not equal split');
assert.ok(out.every(x=>x.SizeHeight<=22.5),'height in percent of number height');
assert.ok(out.every(x=>x.Name==='DHL_DIGIT_LOGO'));
assert.equal(intoNumber(number('7'),'7',layer).length,1);
assert.equal(intoNumber(number(''),'',layer).length,0,'COACH / blank numbers get no logo');
prefs.mode='whole';
assert.equal(intoNumber(number('10'),'10',layer).length,1,'optional whole-number logo');
prefs.mode='per';
selected=[number('10')];
assert.equal(manual(),true);
assert.equal(grouped.length,1);
assert.equal(grouped[0].shapes.length,3,'number + 2 logos grouped together');
assert.equal(undo,0);
assert.equal(logo.Name,'CREST_SOURCE','source logo is preserved');
assert.ok(temporary.length>=3&&temporary.every(x=>x.Delete),'measurement duplicates cleaned');
const page={CenterX:148.5,CenterY:210,SizeWidth:297,SizeHeight:420};
assert.equal(parkSource(page),true,'source moved outside printable area when needed');
assert.ok(logo.CenterX>page.CenterX+page.SizeWidth/2);
assert.equal(parkSource(page),false,'do not move already parked source again');
prefs.on=false;
logo.CenterX=148.5;logo.CenterY=210;
assert.equal(parkSource(page),false,'disabled setting does not move source');
console.log('PASS: capture, per-digit 10/7, optional whole, no-number, manual group, clone cleanup, print-safe source');
