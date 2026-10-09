// Node.js: node tools/tach-nameset-a3/tests/contour_geometry.test.js
// Tests pure geometry in the Corel HTML module; it does not require CorelDRAW.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../src/V826_TRUE_CONTOUR_NEST.html'),'utf8');
let script=source.match(/<script[^>]*>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(script,'Corel script found');
script=script.replace(/\}\)\(\);\s*$/,"window.__test={pack,planDepth,anchors,valid,sampleLeaf};})();");
const win={addEventListener(){},DHL_ORDER:'area',DHL_SEARCH_DEADLINE:0};
new Function('window','document','setTimeout','currentLang','corelApp',script)(
  win,{getElementById(){return null}},()=>{},'vi',null
);
const {pack,planDepth,anchors,valid,sampleLeaf}=win.__test;
function rect(l,r,t,b) {
  return {closed:true,pts:[{x:l,y:t},{x:r,y:t},{x:r,y:b},{x:l,y:b}],
    bb:{l,r,t,b,w:r-l,h:b-t}};
}
function item(w,h,boxes) {
  const leaves=boxes.map(([l,r,t,b])=>{const loop=rect(l,r,t,b);return {loops:[loop],bb:loop.bb}});
  const obj={w,h,area:w*h,leaves,shape:{}};
  obj.anchors=anchors(obj);
  return obj;
}
const L=item(70,80,[[0,20,0,80],[0,70,60,80]]);
const small=item(30,30,[[0,30,0,30]]);
const open=pack([L,small],70,150,2);
assert.ok(open&&open.length===2);
assert.equal(planDepth(open),80,'small object nests inside L-shaped gap');
assert.ok(Number.isFinite(open[1].x)&&Number.isFinite(open[1].y));
assert.ok(valid(open[1].x,open[1].y,open[1].item,[open[0]],70,150,2));
const solid=item(70,80,[[0,70,0,80]]);
const closed=pack([solid,small],70,200,2);
assert.ok(closed&&planDepth(closed)>110,'solid rectangle needs second row');
assert.equal(valid(undefined,0,small,[],70,150,2),false,'NaN/undefined locations rejected');
assert.equal(valid(0,NaN,small,[],70,150,2),false,'invalid vertical coordinate rejected');
const curveShape={DisplayCurve:{SubPaths:{Count:1,Item(){return {Length:20,Closed:true,
  GetPointPositionAt(t){return {x:10+10*t,y:20+5*t}}};}}}};
const shape=sampleLeaf(curveShape,{l:0,t:100});
assert.ok(shape&&shape.loops[0].pts.length>=3,'curve sampling uses actual curve, not bbox');
console.log('PASS 6 geometry checks: gap nesting, non-overlap, invalid positions, contour sample');
