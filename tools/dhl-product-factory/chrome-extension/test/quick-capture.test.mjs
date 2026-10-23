import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {makeGeminiRequest} from '../lib/core.mjs';
const base=dirname(dirname(fileURLToPath(import.meta.url)));
const text=name=>readFile(join(base,name),'utf8');
const demoImage='data:image/png;base64,aGVsbG8=';

test('screenshot alone is enough for Gemini: no title SKU cost or product variants required',()=>{
  const result=makeGeminiRequest({shop:'STORE MIU MIU',images:[demoImage]});
  assert.equal(result.contents[0].parts.length,2);
  const info=JSON.parse(result.contents[0].parts[0].text);
  assert.equal(info.name,'');assert.equal(info.sku,'');assert.equal(info.notes,'');
  assert.match(result.systemInstruction.parts[0].text,/ẢNH CHỤP MÀN HÌNH/);
});
test('up to six screenshot images; seventh refused; per-image size guard retained',()=>{
  const ok=makeGeminiRequest({shop:'DHL SPORTS',images:Array(6).fill(demoImage)});
  assert.equal(ok.contents[0].parts.length,7);
  assert.throws(()=>makeGeminiRequest({shop:'DHL SPORTS',images:Array(7).fill(demoImage)}),/6 ảnh/);
  assert.throws(()=>makeGeminiRequest({shop:'DHL SPORTS',images:['data:image/png;base64,'+'A'.repeat(4_300_000)]}),/3MB/);
});
test('UI clearly exposes paste/drop/select and preserves optional field workflow',async()=>{
  const html=await text('panel.html');const js=await text('panel.js');
  assert.match(html,/id="screenshotDrop"/);assert.match(html,/Ctrl<\/kbd>\+<kbd>V/);
  assert.match(html,/id="screenshotStatus"/);assert.match(html,/id="extraInput"/);assert.match(html,/id="sellingDetails"/);
  assert.match(js,/document\.addEventListener\('paste'/);
  assert.match(js,/drop\.ondrop/);assert.match(js,/drop\.ondragover/);
  assert.match(js,/receiveScreenshots/);assert.match(js,/screenshotData/);
  assert.match(js,/images\.splice\(index,1\)/);
  assert.match(js,/MAX_SCREENSHOTS=6/);
});
test('commerce panel collapsed by default and analysis never demands SKU or price',async()=>{
  const html=await text('panel.html');
  const input=html.slice(html.indexOf('<section data-view="input">'),html.indexOf('</section>',html.indexOf('<section data-view="input">')));
  assert.match(input,/<details id="sellingDetails"/);
  assert.doesNotMatch(input,/<details id="sellingDetails"[^>]*\sopen(?:\s|>)/);
  assert.ok(input.indexOf('id="screenshotDrop"')<input.indexOf('id="analyze"'));
  assert.ok(input.indexOf('id="analyze"')<input.indexOf('id="sellingDetails"'));
  assert.ok(input.indexOf('id="extraInput"')<input.indexOf('id="analyze"'));
  const js=await text('panel.js');
  assert.match(js,/if\(!images\.length&&!text\('notes'\)/);
  assert.doesNotMatch(js,/if\(!text\('sku'\)\).*type:'analyze'/);
});
test('source shop listing price not silently classified as cost',()=>{
  const r=makeGeminiRequest({shop:'RABBIT STORE',images:[demoImage]});
  assert.match(r.systemInstruction.parts[0].text,/giá hiển thị của shop nguồn là giá vốn/);
});
