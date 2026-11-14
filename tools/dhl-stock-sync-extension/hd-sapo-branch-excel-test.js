const assert=require('assert');
const fs=require('fs');
const branch=require('./stock-branch-core.js');
const stockImport=require('./stock-import-core.js');
const xlsx=require('./xlsx-lite.js');
const batch=require('./batch-stock-core.js');
const quality=require('./scan-quality-core.js');

(async()=>{
  const base={profileId:'hd',profileName:'HD',sourceUrl:'https://si.aobongda.net/hd-pc36029.html',branch:''};
  const noApi={sapo:{}};
  // A single known Sapo warehouse must work across ALL scan profiles.
  for(const name of ['HD','S trẻ em','M trẻ em','Áo CLB','Áo trẻ em','Kho tổng','Khác']){
    assert.strictEqual(branch.resolve({...base,profileName:name,sourceUrl:'https://si.aobongda.net/ao-tre-em-pc37502.html'},noApi),'dhl sport',name);
  }
  assert.strictEqual(branch.DEFAULT_WAREHOUSE_NAME,'dhl sport');
  assert.strictEqual(branch.resolve({...base,branch:'Kho A'},noApi),'Kho A');
  const named={sapo:{excelLocationName:'Kho Tự Chọn'}};
  assert.strictEqual(branch.resolve({...base,profileName:'S trẻ em'},named),'Kho Tự Chọn');
  assert.strictEqual(branch.resolve({...base,branch:'dhl sport'},named),'Kho Tự Chọn','Old cached default must be overrideable');
  assert.strictEqual(branch.resolve({...base,branch:'Kho Tự Chọn'},named),'Kho Tự Chọn');
  assert.throws(()=>branch.resolve({...base,branch:'Kho A'},named),/khác kho Excel/);
  assert.throws(()=>branch.resolve({...base,branch:'dhl sport',branchSource:'legacy-file'},named),/khác kho Excel/);
  const verified={sapo:{locationName:'Kho API',locationId:12,verifiedAt:123456}};
  assert.strictEqual(branch.resolve(base,verified),'Kho API');
  assert.strictEqual(branch.resolve({...base,branch:'dhl sport'},verified),'Kho API');
  assert.throws(()=>branch.resolve({...base,branch:'Kho A'},verified),/khác chi nhánh/);
  assert.throws(()=>branch.resolve(base,{sapo:{...verified.sapo,excelLocationName:'Kho Excel'}}),/khác chi nhánh/i);
  assert.strictEqual(branch.resolve({...base,branch:''},{sapo:{locationName:'Chưa xác minh'}}),'dhl sport');

  // Recreate the user's valid 244-row scan, including sold-out 0 stock.
  const rows=Array.from({length:244},(_,i)=>({
    sku:'KIDS-S-'+String(i+1).padStart(3,'0'),
    variantName:'Áo trẻ em / Mẫu '+(i+1)+' / Size '+(i%5),
    stock:i%10===0?0:i%13
  }));
  const source=[{complete:true,variants:rows.map(r=>({size:'S',stock:r.stock}))}];
  const scanQuality=quality.evaluate({total:1,index:1},source,{rows},[]);
  assert.strictEqual(scanQuality.ok,true,scanQuality.reasons.join(';'));
  const entry={
    ...base,profileId:'kids-s',profileName:'S trẻ em',
    sourceUrl:'https://si.aobongda.net/ao-tre-em-pc37502.html',
    rows,rowCount:rows.length,qualityValidated:true,
    report:{quality:scanQuality,issueCount:0}
  };
  assert.strictEqual(quality.trustedEntry(entry),true);
  const combined=batch.combineEntries([{...entry,branch:branch.resolve(entry,noApi)}]);
  assert.strictEqual(combined.rows.length,244);
  assert.strictEqual(combined.branch,'dhl sport');
  const out=stockImport.buildOfficialInventoryWorkbook(xlsx,combined.rows,combined.branch);
  const book=await xlsx.readFirstSheet(out.bytes);
  assert.strictEqual(book.rows[2][5],'dhl sport','Warehouse name must appear at F3');
  assert.strictEqual(book.rows[4][1],rows[0].sku);
  assert.strictEqual(book.rows[4][5],0,'Sold out rows must export as 0');
  assert.strictEqual(out.rows,244);

  const mixed=batch.combineEntries([
    {...entry,profileId:'hd',profileName:'HD',rows:[{sku:'HD-A-S',stock:5}] ,branch:branch.resolve(base,noApi)},
    {...entry,profileId:'kids-s',profileName:'S trẻ em',rows:[{sku:'KIDS-A-S',stock:0}],branch:branch.resolve(entry,noApi)},
    {...entry,profileId:'kids-m',profileName:'M trẻ em',rows:[{sku:'KIDS-B-M',stock:2}],branch:branch.resolve({...entry,profileName:'M trẻ em'},noApi)}
  ]);
  assert.strictEqual(mixed.profileCount,3);
  assert.strictEqual(mixed.rows.length,3);
  assert.strictEqual(mixed.branch,'dhl sport');

  const exportSrc=fs.readFileSync(__dirname+'/batch-stock-cache-mode.js','utf8');
  const runner=fs.readFileSync(__dirname+'/manual-job-runner-background.js','utf8');
  const push=fs.readFileSync(__dirname+'/manual-sapo-background.js','utf8');
  const bg=fs.readFileSync(__dirname+'/background.js','utf8');
  const html=fs.readFileSync(__dirname+'/popup.html','utf8');
  const auto=fs.readFileSync(__dirname+'/auto-sync-background-v2.js','utf8');
  const ui=fs.readFileSync(__dirname+'/auto-sync-mode.js','utf8');
  assert.ok(exportSrc.includes('branch:branchCore.resolve(entry,config)'));
  assert.ok(exportSrc.includes('await chrome.storage.local.set({[BATCH_KEY]:{}})'));
  assert.ok(runner.includes('const branch=branchCore.resolve({'));
  assert.ok(runner.includes('branchSource:legacy&&legacy.warehouseData.warehouseBranchName'));
  assert.ok(runner.includes('const recoveredQuality=quality.evaluate(job,sourceResults,prepared,recoveredIssues,'));
  assert.ok(runner.includes('if(!recoveredQuality.ok)'), 'Incomplete historical results cannot become valid exports');
  assert.ok(runner.includes('report:{quality:recoveredQuality,issueCount:recoveredIssues.length}'));
  assert.ok(auto.includes("branchSource:parsed.warehouseData.warehouseBranchName?'legacy-file'"));
  assert.ok(auto.includes('const verified={...sapo,'));
  assert.ok(ui.includes('id="sapoExcelLocation"'));
  assert.ok(ui.includes('excelLocationName:text(document.getElementById('));
  assert.ok(ui.includes('Đã lưu kho xuất Excel cho tất cả hồ sơ.'));
  assert.ok(push.includes('config=await ensureVerifiedSapo(config)'),'Sapo direct push must require API');
  assert.ok(bg.includes("'stock-branch-core.js'"));
  assert.ok(html.includes('<script src="stock-branch-core.js"></script>'));
  console.log('GLOBAL SAPO WAREHOUSE PASS: 244 children rows, F3=dhl sport, sold out=0, HD/kids/multiple profiles, Excel without API');
})().catch(err=>{console.error(err);process.exitCode=1;});
