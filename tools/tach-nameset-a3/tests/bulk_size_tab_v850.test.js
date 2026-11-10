// node tools/tach-nameset-a3/tests/bulk_size_tab_v850.test.js
// Standalone SIZE tab and original bulk geometry engine; not part of nesting.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../src');
const ui=fs.readFileSync(path.join(root,'DockerUI_CURRENT.html'),'utf8');
const tab=fs.readFileSync(path.join(root,'V850_BULK_SIZE_TAB.html'),'utf8');
assert.ok(ui.includes('DHL_UI_VERSION=8.54'));
assert.equal((ui.match(/id="dhl-v850-size-tab"/g)||[]).length,1);
assert.ok(ui.includes("try{\n   doc.Unit=3;\n   val=axis==='w'"));
const ids={},storageValue={},rootCard={appendChild(x){x.parentNode=this;if(x.id)ids[x.id]=x;}};
function elem(id){
 if(ids[id])return ids[id];
 const x={id:id||'',className:'',innerHTML:'',innerText:'',style:{},value:'',checked:false,parentNode:null,
  appendChild(child){child.parentNode=this;},removeChild(child){child.parentNode=null;}};
 ids[id]=x;return x;
}
function createElement(){
 const x={id:'',className:'',style:{},parentNode:null,children:[],appendChild(child){this.children.push(child);child.parentNode=this;},
  removeChild(child){this.children=this.children.filter(v=>v!==child);child.parentNode=null;}};
 Object.defineProperty(x,'innerHTML',{get(){return this._html||''},set(s){this._html=s;const expr=/<\w+[^>]*\bid="([^"]+)"[^>]*>/g;let m;
  while((m=expr.exec(s))!==null)elem(m[1]);
 }});
 return x;
}
const tabs=elem('v82Tabs'),nest=elem('v77NestCard');tabs.parentNode=rootCard;
tabs.className='v82-tabs';nest.className='v82-panel active';
elem('v82TabNest').className='v82-tabbtn selected';
let oldShowCall=[],resizeCount=0,optimizations=0;
const doc={Unit:4,BeginCommandGroup(){},EndCommandGroup(){}};
function shape(w,h,cx,cy){
 const x={widthMM:w,heightMM:h,CenterX:cx,CenterY:cy};
 Object.defineProperty(x,'SizeWidth',{get(){return doc.Unit===3?this.widthMM:this.widthMM/10;}});
 Object.defineProperty(x,'SizeHeight',{get(){return doc.Unit===3?this.heightMM:this.heightMM/10;}});
 x.SetSize=function(nw,nh){resizeCount++;this.widthMM=nw;this.heightMM=nh;};
 return x;
}
const shapes=[shape(50,80,10,20),shape(120,100,30,40)];
const app={ActiveDocument:doc,ActiveSelectionRange:{Count:2,Item(i){return shapes[i-1];}},ActiveWindow:{Refresh(){}}};
const win={addEventListener(){},external:{Application:app},
 V82ShowTab:function(name){oldShowCall.push(name);nest.className='v82-panel'+(name==='nest'?' active':'');storageValue.dhl_v82_tab=name;},
 DHLLicenseGate(){return true;}};
const dom={getElementById:id=>ids[id]||null,createElement:()=>createElement(),getElementsByClassName(){return [];}};
const storage={setItem(k,v){storageValue[k]=v;},getItem(k){return Object.prototype.hasOwnProperty.call(storageValue,k)?storageValue[k]:null;}};
const bulk=ui.match(/<script id="dhl-v821-bulk-height"[^>]*>([\s\S]*?)<\/script>/)[1];
new Function('window','document','setTimeout','currentLang','corelApp','localStorage',bulk)(win,dom,()=>{},'vi',()=>app,storage);
const newTab=tab.match(/<script id="dhl-v850-size-tab"[^>]*>([\s\S]*?)<\/script>/)[1];
new Function('window','document','setTimeout','currentLang','corelApp','localStorage',newTab)(win,dom,()=>{},'vi',()=>app,storage);
assert.equal(win.DHLBulkSizeTab.mount(),true);
assert.ok(ids.v850TabSize&&ids.v850PanelSize,'new dedicated tab and panel exist');
assert.ok(ids.v821BulkHeightBox,'existing bulk input IDs are reused');
assert.ok(!ids.v850PanelSize.className.includes('active'));
win.V82ShowTab('size');
assert.ok(ids.v850PanelSize.className.includes('active'));
assert.ok(!nest.className.includes('active'),'nest panel is not visible while SIZE selected');
assert.equal(storageValue.dhl_v82_tab,'size','SIZE is persistent');
win.V821GetHeight();
assert.equal(Number(ids.v821BulkHeightInput.value),8,'sample height from mm to cm');
assert.equal(doc.Unit,4,'sample measurement restores original Corel unit');
ids.v821BulkHeightInput.value='10';
win.V821SetHeight();
assert.equal(resizeCount,2,'both selected objects were resized');
assert.ok(Math.abs(shapes[0].widthMM-62.5)<.001);
assert.equal(shapes[0].heightMM,100);
assert.equal(shapes[1].heightMM,100);
assert.equal(shapes[1].widthMM,120);
assert.equal(shapes[0].CenterX,10);
assert.equal(shapes[1].CenterY,40);
assert.equal(doc.Unit,4);
win.V821GetWidth();
assert.equal(Number(ids.v821BulkWidthInput.value),6.25);
ids.v821BulkWidthInput.value='20';
win.V821SetWidth();
assert.equal(resizeCount,4);
assert.equal(shapes[0].widthMM,200);
assert.equal(shapes[1].widthMM,200);
assert.ok(Math.abs(shapes[0].heightMM-320)<.01);
assert.ok(Math.abs(shapes[1].heightMM-166.66666667)<.01);
assert.equal(doc.Unit,4);
win.V82ShowTab('nest');
assert.ok(!ids.v850PanelSize.className.includes('active'));
assert.ok(nest.className.includes('active'));
assert.equal(storageValue.dhl_v82_tab,'nest');
assert.equal(optimizations,0,'bulk sizing must not invoke nesting');
console.log('PASS V8.50: independent SIZE tab, mass height/width, sample cm units, aspect ratios, centers, tab persistence, no nesting');
