(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLStockBranchCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const text=v=>String(v==null?'':v).trim();
  const key=v=>text(v).normalize('NFC').toLowerCase().replace(/\s+/g,' ');
  // All DHL Stock Sync source profiles share one Sapo export warehouse unless
  // a profile explicitly contains a different warehouse from its Sapo file.
  // The user identified the warehouse in Sapo as "dhl sport".
  const DEFAULT_WAREHOUSE_NAME='dhl sport';
  const HD_WAREHOUSE_NAME=DEFAULT_WAREHOUSE_NAME; // backward-compatible name
  function isHdSource(entry){
    const e=entry&&typeof entry==='object'?entry:{};
    if(key(e.profileName||e.name)==='hd')return true;
    const url=text(e.sourceUrl||e.lastSourceUrl||e.sourceKey);
    return /(?:^|\/)hd-pc36029(?:\.html)?(?:[?#].*)?$/i.test(url);
  }
  function verifiedLocationName(config){
    const sapo=config&&config.sapo||{};
    return Number(sapo.locationId)>0&&Number(sapo.verifiedAt)>0
      ?text(sapo.locationName):'';
  }
  function configuredExportName(config){
    const sapo=config&&config.sapo||{};
    return text(sapo.excelLocationName||config&&config.excelLocationName);
  }
  function resolve(entry,config){
    const e=entry&&typeof entry==='object'?entry:{};
    const existing=text(e.branch||e.branchName||e.warehouseBranchName);
    const verified=verifiedLocationName(config);
    const configured=configuredExportName(config);
    // Old builds stored the default as an ordinary profile branch. Treat
    // those values as fallback so an intentionally edited global warehouse
    // can take effect on cached results without rescan.
    const legacyDefault=key(existing)===key(DEFAULT_WAREHOUSE_NAME)
      &&e.branchSource!=='legacy-file'&&e.branchSource!=='explicit';
    if(verified&&configured&&key(verified)!==key(configured)){
      throw new Error('Tên kho Excel ('+configured+') khác chi nhánh Sapo đã xác minh ('+
        verified+'). Hãy chọn cùng một kho trước khi xuất hoặc đẩy tồn.');
    }
    if(existing&&verified&&key(existing)!==key(verified)&&!legacyDefault){
      throw new Error('Tên chi nhánh hồ sơ ('+existing+
        ') khác chi nhánh Sapo đã xác minh ('+verified+'). Kiểm tra kho trước khi xuất hoặc đẩy tồn.');
    }
    if(existing&&configured&&key(existing)!==key(configured)&&!legacyDefault){
      throw new Error('Tên chi nhánh hồ sơ ('+existing+
        ') khác kho Excel đang chọn ('+configured+'). Kiểm tra kho trước khi xuất.');
    }
    return verified||configured||existing||DEFAULT_WAREHOUSE_NAME;
  }
  return{DEFAULT_WAREHOUSE_NAME,HD_WAREHOUSE_NAME,isHdSource,verifiedLocationName,configuredExportName,resolve};
});
