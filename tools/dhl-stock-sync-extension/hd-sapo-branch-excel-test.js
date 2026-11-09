const assert=require('assert');
const branch=require('./stock-branch-core.js');
const stockImport=require('./stock-import-core.js');
const xlsx=require('./xlsx-lite.js');
const batch=require('./batch-stock-core.js');
const quality=require('./scan-quality-core.js');

(async()=>{
  const profile={
    profileId:'tab-si.aobongda.net-hd-pc36029.html',
    profileName:'HD',
    sourceUrl:'https://si.aobongda.net/hd-pc36029.html',
    branch:'',
    rows:[{sku:'ARS-26-27-HD-DO-S',variantName:'CLB ARS 26-27 HD / Đỏ / S',stock:0}]
  };
  const noApi={sapo:{}};
  assert.strictEqual(branch.resolve(profile,noApi),'dhl sport');
  assert.strictEqual(branch.resolve({...profile,profileName:'Khác'},noApi),'dhl sport');
  assert.strictEqual(branch.resolve({...profile,profileName:'Trẻ em HD',sourceUrl:'https://si.aobongda.net/kids-pc204.html'},noApi),'');
  assert.strictEqual(branch.resolve({...profile,branch:'Kho A'},noApi),'Kho A');
  assert.strictEqual(branch.resolve({...profile,branch:'',profileName:'HD'}, {sapo:{locationName:'Kho B',locationId:12,verifiedAt:123456}}),'Kho B');
  assert.throws(()=>branch.resolve({...profile,branch:'dhl sport'},{sapo:{locationName:'Kho Khác',locationId:18,verifiedAt:123456}}),/khác chi nhánh/i);
  assert.strictEqual(branch.resolve({...profile,branch:'',profileName:'HD'},{sapo:{locationName:'Kho chưa xác minh'}}),'dhl sport');

  const rows=profile.rows;
  const scan=[{complete:true,variants:[{size:'S',stock:0}]}];
  const q=quality.evaluate({total:1,index:1},scan,{rows},[]);
  assert.strictEqual(q.ok,true);
  const entry={...profile,qualityValidated:true,rowCount:1,
    report:{quality:{...q,sourceVariantCount:1,rowCount:1},issueCount:0}};
  assert.strictEqual(quality.trustedEntry(entry),true);
  const normalized={...entry,branch:branch.resolve(entry,noApi)};
  const merged=batch.combineEntries([normalized]);
  assert.strictEqual(merged.branch,'dhl sport');
  const output=stockImport.buildOfficialInventoryWorkbook(xlsx,merged.rows,merged.branch);
  const book=await xlsx.readFirstSheet(output.bytes);
  assert.strictEqual(book.rows[2][5],'dhl sport','Official Sapo warehouse name must be F3');
  assert.strictEqual(book.rows[4][1],rows[0].sku);
  assert.strictEqual(book.rows[4][5],0);
  assert.strictEqual(output.rows,1);

  const exportSrc=require('fs').readFileSync(__dirname+'/batch-stock-cache-mode.js','utf8');
  const runner=require('fs').readFileSync(__dirname+'/manual-job-runner-background.js','utf8');
  const push=require('fs').readFileSync(__dirname+'/manual-sapo-background.js','utf8');
  const bg=require('fs').readFileSync(__dirname+'/background.js','utf8');
  const html=require('fs').readFileSync(__dirname+'/popup.html','utf8');
  assert.ok(exportSrc.includes('branch:branchCore.resolve(entry,config)'));
  assert.ok(exportSrc.includes('await chrome.storage.local.set({[BATCH_KEY]:{}})'),'Clear cache only on successful export');
  assert.ok(runner.includes('const branch=branchCore.resolve({'));
  assert.ok(push.includes('config=await ensureVerifiedSapo(config)'),'Sapo pushes must require verified location');
  assert.ok(push.includes('branch:branchCore.resolve(entry,config)'));
  assert.ok(bg.includes("'stock-branch-core.js'"));
  assert.ok(html.includes('<script src="stock-branch-core.js"></script>'));
  console.log('HD SAPO BRANCH EXCEL PASS: location dhl sport, F3, stock=0, cached scan preserved on errors');
})().catch(err=>{console.error(err);process.exitCode=1;});
