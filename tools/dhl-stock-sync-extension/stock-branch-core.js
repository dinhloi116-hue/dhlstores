(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLStockBranchCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const text=v=>String(v==null?'':v).trim();
  const key=v=>text(v).normalize('NFC').toLowerCase().replace(/\s+/g,' ');
  // Screenshot supplied by the user: Sapo > Thông tin kho >
  // "Lưu kho tại": dhl sport. This fallback is scoped ONLY to the HD
  // supplier category, not to other shops or inventory profiles.
  const HD_WAREHOUSE_NAME='dhl sport';
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
  function resolve(entry,config){
    const e=entry&&typeof entry==='object'?entry:{};
    const existing=text(e.branch||e.branchName||e.warehouseBranchName);
    const verified=verifiedLocationName(config);
    if(verified&&existing&&key(existing)!==key(verified)){
      throw new Error('Tên chi nhánh trong dữ liệu quét ('+existing+
        ') khác chi nhánh Sapo đã xác minh ('+verified+'). Kiểm tra kho trước khi xuất hoặc đẩy tồn.');
    }
    return verified||existing||(isHdSource(e)?HD_WAREHOUSE_NAME:'');
  }
  return {HD_WAREHOUSE_NAME,isHdSource,verifiedLocationName,resolve};
});
