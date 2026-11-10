// node tools/tach-nameset-a3/tests/nameset_composer_v854.test.js
// CorelDRAW mock tests for V8.55 three-line editable NAMESET composer.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../src');
const src=fs.readFileSync(path.join(root,'V854_NAMESET_COMPOSER.html'),'utf8');
const release=fs.readFileSync(path.join(root,'DockerUI_CURRENT.html'),'utf8');
assert.match(release,/DHL_UI_VERSION=8\.54/);
assert.equal((release.match(/id="dhl-v854-composer"/g)||[]).length,1);
assert.ok(release.includes(src.trim()),'snapshot must contain exact module version');
assert.match(src,/#v82PanelNameset > \*\{display:none!important\}/);
assert.match(src,/#v82PanelNameset > #v854Composer\{display:block!important\}/);
for(const k of ['Name','Number','Footer']){
 assert.ok(src.includes("v854'+k+'Text"),k+' text input');
 assert.ok(src.includes("v854'+k+'Font"),k+' font selection');
 assert.ok(src.includes("v854'+k+'Recent"),k+' recent font suggestion');
 assert.ok(src.includes("v854'+k+'W"),k+' independent width');
 assert.ok(src.includes("v854'+k+'H"),k+' independent height');
}
for(const id of ['v854Gap1','v854Gap2','v854Fill','v854Stroke','v854StrokeMm',
 'v854Logo','v854Capture','v854Mirror','v854Create','v854LoadFonts'])
 assert.ok(src.includes(id),'missing '+id);
for(const [i,m] of [...release.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].entries())
 assert.doesNotThrow(()=>new Function(m[1]),'release script '+i);
const script=src.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)[1];
const fields={};
function field(id,val){
 const opts=[];opts.add=x=>opts.push(x);
 return fields[id]={id,value:String(val),checked:false,className:'',innerHTML:'',
   options:opts,remove(n){opts.splice(n,1);}};
}
const values={NameText:'MESSI',NumberText:'10',FooterText:'A12-K41-MK',
 NameFont:'Arial',NumberFont:'Arial Black',FooterFont:'Arial',
 NameW:20,NameH:5,NumberW:12,NumberH:25,FooterW:10,FooterH:2,
 Gap1:3,Gap2:1,Fill:'#FFFFFF',Stroke:'#000000',StrokeMm:2.5,
 LogoPct:9,LogoBottom:2,LogoInset:1,LogoMode:'per'};
for(const [k,v] of Object.entries(values))field('v854'+k,v);
field('v854Logo','').checked=true;field('v854Mirror','').checked=true;
let fail=false,undoCount=0;
const created=[],fonts=[],calls=[];
function shape(text){
 const s={Name:'',Text:{Story:{Text:text,Font:''}},CenterX:0,CenterY:0,SizeWidth:50,SizeHeight:30,
 Fill:{UniformColor:{RGBAssign(...r){s.fillColor=r;}}},
 Outline:{Width:0,Color:{RGBAssign(...r){s.outlineColor=r;}},SetNoOutline(){s.noOutline=true;}},
 SetSize(w,h){s.SizeWidth=w;s.SizeHeight=h;}};
 created.push(s);return s;
}
const d={Unit:4,BeginCommandGroup(x){calls.push('begin');},EndCommandGroup(){calls.push('end');},Undo(){undoCount++;}};
const g={Name:'',Flip(a){this.mirrorAxis=a;},CreateSelection(){this.selected=true;}};
const layer={CreateArtisticText(x,y,txt){if(fail)throw Error('mock creation failure');return shape(txt);}};
const app={ActiveDocument:d,ActivePage:{CenterX:100,CenterY:300,ActiveLayer:layer},ActiveWindow:{Refresh(){}},
 CreateShapeRange(){const ss=[];return{Add(s){ss.push(s);},Group(){g.shapes=ss.slice();return g;}};}};
const win={addEventListener(){},external:{Application:app},
 applyFontRecursive(s,font){fonts.push(font);s.Text.Story.Font=font;return true;},
 DHLNumberLogo:{settings(){return{on:false,pct:9,bottom:2,inset:1,mode:'per'};},
  configure(p){calls.push('logo:'+p.on);},available(){return true;},capture(){return true;},
  intoNumber(){return[shape('logo1'),shape('logo2')];}}};
const local={},storage={getItem(k){return local[k]||null;},setItem(k,v){local[k]=v;}};
const doc={getElementById(id){return fields[id]||null;},createElement(){return{};}};
new Function('window','document','currentLang','localStorage','setTimeout','corelApp','Option',script)(
 win,doc,'vi',storage,()=>{},()=>app,function Option(text,value){this.text=text;this.value=value;});
const api=win.DHLNamesetComposer,p=api.read();
assert.equal(p.name.w,200);assert.equal(p.name.h,50);
assert.equal(p.number.w,120);assert.equal(p.number.h,250);
assert.equal(p.footer.w,100);assert.equal(p.footer.h,20);
assert.equal(p.gap1,30);assert.equal(p.gap2,10);
const result=api.make(p);
assert.equal(result.success,true);
assert.equal(result.count,3);assert.equal(result.logos,2);
assert.equal(g.shapes.length,5);assert.equal(g.mirrorAxis,1);assert.equal(g.selected,true);
assert.equal(created[0].SizeWidth,120);assert.equal(created[0].SizeHeight,250);
assert.deepEqual(created[0].fillColor,[255,255,255]);
assert.deepEqual(created[0].outlineColor,[0,0,0]);
assert.equal(created[0].Outline.Width,2.5);
assert.ok(Math.abs(created[1].CenterY-created[0].CenterY-180)<1e-5,'name-to-number gap 30 mm');
assert.ok(Math.abs(created[2].CenterY-created[0].CenterY+145)<1e-5,'number-to-footer gap 10 mm');
assert.equal(d.Unit,4);assert.equal(undoCount,0);
assert.ok(api.recents().includes('Arial Black'));
api.remember(['Font 1','Font 2','Font 3','Font 4','Font 5','Font 6','Font 7','Font 8','Font 9','Font 10','Font 11']);
assert.equal(api.recents().length,10,'only last 10 fonts');
fields.v854Fill.value='#GG0000';
assert.throws(()=>api.read(),/HEX/,'invalid hex rejected before document change');
fields.v854Fill.value='#FFFFFF';
fail=true;
assert.throws(()=>api.make({...p,logo:false}),/mock creation failure/);
assert.equal(undoCount,1,'failed create rolled back');
assert.equal(d.Unit,4,'unit restored after rollback');
console.log('PASS V8.55: three fields, font history, custom width/height, gap, fill, outline, logo, mirror and undo rollback');