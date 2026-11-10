// node tools/tach-nameset-a3/tests/safe_pair_v851.test.js
// CorelDRAW/MSHTML independent tests: preview, pairing, mm units, undo, no guessing.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../src');
const src=fs.readFileSync(path.join(root,'V851_SAFE_NAMESET.html'),'utf8');
const ui=fs.readFileSync(path.join(root,'DockerUI_CURRENT.html'),'utf8');
const js=src.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)[1];
assert.ok(ui.includes('DHL_UI_VERSION=8.53'));
assert.ok(ui.includes('id="dhl-v851-safe-nameset"'));
assert.ok(src.includes('#v82PanelNameset > *{display:none!important}'));
function run(shapes,mode){
 const ids={},settings={},log={begin:0,end:0,undo:0},doc={Unit:4,Name:'test.cdr'};
 doc.BeginCommandGroup=()=>{log.begin++;};
 doc.EndCommandGroup=()=>{log.end++;};
 doc.Undo=()=>{log.undo++;};
 function field(id){return ids[id]||(ids[id]={id,innerHTML:'',className:'',value:'',disabled:false,checked:false,options:[{text:''},{text:''}]});}
 const root=field('v82PanelNameset');root.className='v82-panel active';root.insertBefore=o=>{ids[o.id]=o;};
 field('mode').value=mode||'auto';field('nameNumberGap').value='30';
 const dom={getElementById:id=>ids[id]||null,createElement(){
  const x={id:'',className:'',firstChild:null};
  Object.defineProperty(x,'innerHTML',{set(s){this.content=s;for(const m of s.matchAll(/<\w+[^>]*\bid="([^"]+)"[^>]*>/g))field(m[1]);},get(){return this.content||'';}});
  return x;
 }};
 const app={ActiveDocument:doc,ActiveSelectionRange:{get Count(){return shapes.length;},Item(i){return shapes[i-1];}},ActiveWindow:{Refresh(){}}};
 const win={external:{Application:app},addEventListener(){}},storage={getItem(k){return settings[k]||null;},setItem(k,v){settings[k]=v;}};
 new Function('window','document','setTimeout','currentLang','localStorage',js)(win,dom,()=>{},'vi',storage);
 assert.equal(win.DHLNamesetSafe.build(),true);
 if(mode==='group'){field('v851Mode').value='group';field('v851Mode').onchange();}
 return{win,ids,doc,log,shapes,field,app};
}
function object(doc,word,x,y,w,h,fail){
 const a={_x:x,_y:y,_w:w,_h:h};
 if(word!==null)a.Text={Story:{Text:word}};
 function fromMM(v){return doc.Unit===3?v:v/10;}
 function toMM(v){return doc.Unit===3?v:v*10;}
 Object.defineProperties(a,{
  CenterX:{get(){return fromMM(this._x);},set(v){this._x=toMM(v);}},
  CenterY:{get(){return fromMM(this._y);},set(v){if(fail)throw Error('mock Corel failure');this._y=toMM(v);}},
  SizeWidth:{get(){return fromMM(this._w);}},
  SizeHeight:{get(){return fromMM(this._h);}}
 });
 return a;
}
function nameset(){
 const doc={Unit:4};
 return[object(doc,'MESSI',120,250,110,25),object(doc,'10',150,130,95,250)];
}
// Inputs are mm internally but shown in cm when Corel document Unit=4.
{
 const d={Unit:4},name=object(d,'MESSI',120,250,110,25),number=object(d,'10',150,130,95,250);
 const t=run([name,number]);Object.defineProperty(t.doc,'Unit',{get(){return d.Unit;},set(v){d.Unit=v;}});
 assert.ok(t.win.DHLNamesetSafe.inspect());
 assert.equal(name._y,250,'inspect must not edit selected objects');
 assert.equal(t.win.DHLNamesetSafe.align(),true);
 assert.equal(name._x,150);
 assert.ok(Math.abs((name._y-name._h/2)-(number._y+number._h/2)-30)<.0001);
 assert.equal(t.doc.Unit,4);assert.equal(t.log.begin,1);assert.equal(t.log.end,1);
}
{
 const d={Unit:4},name=object(d,null,120,250,110,25),number=object(d,null,150,130,95,250);
 const t=run([name,number]);Object.defineProperty(t.doc,'Unit',{get(){return d.Unit;},set(v){d.Unit=v;}});
 assert.ok(t.win.DHLNamesetSafe.inspect(),'two vertically distinguishable curves should work');
 assert.equal(t.win.DHLNamesetSafe.align(),true);
 assert.equal(name._x,150);
}
{
 const d={Unit:4},a=object(d,null,0,0,50,30),b=object(d,null,50,0,40,30);
 const t=run([a,b]);Object.defineProperty(t.doc,'Unit',{get(){return d.Unit;},set(v){d.Unit=v;}});
 assert.equal(t.win.DHLNamesetSafe.inspect(),null,'ambiguous curves must not be guessed');
 assert.equal(t.log.begin,0);assert.equal(t.win.DHLNamesetSafe.align(),false);
}
{
 const d={Unit:4},name=object(d,'RONALDO',120,250,110,25),number=object(d,'7',150,130,95,250),
 logo=object(d,null,148,20,14,14);
 const g={Shapes:{Count:3,Item(i){return[name,number,logo][i-1];}}};
 const t=run([g],'group');Object.defineProperty(t.doc,'Unit',{get(){return d.Unit;},set(v){d.Unit=v;}});
 assert.ok(t.win.DHLNamesetSafe.inspect(),'Group containing extra logo must keep it');
 assert.equal(t.win.DHLNamesetSafe.align(),true);
 assert.equal(logo._x,148);assert.equal(logo._y,20);
 assert.equal(g.Shapes.Count,3);
}
{
 const d={Unit:4},name=object(d,'KANE',120,250,110,25),number=object(d,'9',150,130,95,250);
 const t=run([name,number]);Object.defineProperty(t.doc,'Unit',{get(){return d.Unit;},set(v){d.Unit=v;}});
 assert.ok(t.win.DHLNamesetSafe.inspect());
 name._x+=12; // external artwork mutation after preview
 assert.equal(t.win.DHLNamesetSafe.align(),false);
 assert.equal(t.log.begin,0,'changed selection not touched');
}
{
 const d={Unit:4},a=object(d,'AAA',100,250,80,25),b=object(d,'BBB',102,248,80,25),
 c=object(d,'10',101,130,80,200),f=object(d,'20',101,130,80,200);
 const t=run([a,b,c,f]);Object.defineProperty(t.doc,'Unit',{get(){return d.Unit;},set(v){d.Unit=v;}});
 assert.equal(t.win.DHLNamesetSafe.inspect(),null,'ties must be rejected');
}
{
 const d={Unit:4},name=object(d,'KAKA',100,250,80,25,true),number=object(d,'22',100,130,80,210);
 const t=run([name,number]);Object.defineProperty(t.doc,'Unit',{get(){return d.Unit;},set(v){d.Unit=v;}});
 assert.ok(t.win.DHLNamesetSafe.inspect());
 assert.equal(t.win.DHLNamesetSafe.align(),false);
 assert.equal(t.log.undo,1,'failed Corel mutation must rollback its command');
 assert.equal(t.doc.Unit,4);
}
for(const [i,script] of [...ui.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].entries())
 assert.doesNotThrow(()=>new Function(script[1]),'snapshot script '+i);
console.log('PASS V8.51: text, outlined curves, Groups with logos, exact mm gap, safe preview, ambiguous rejection, Corel unit restoration and rollback');
