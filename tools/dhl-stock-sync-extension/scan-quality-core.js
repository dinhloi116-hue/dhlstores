(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DHLScanQualityCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const text=v=>String(v==null?'':v).trim();
  function rowValid(row){
    const stock=Number(row&&row.stock);
    return Boolean(text(row&&row.sku))&&Number.isSafeInteger(stock)&&stock>=0
      &&row.stock!==''&&row.stock!==null&&row.stock!==undefined;
  }
  function evaluate(job,results,prepared,issues,forcedStatus=''){
    const rows=Array.isArray(prepared&&prepared.rows)?prepared.rows:[];
    const products=Array.isArray(results)?results:[];
    const problems=Array.isArray(issues)?issues:[];
    const total=Number(job&&job.total||0),index=Number(job&&job.index||0);
    const variants=products.reduce((n,p)=>n+(Array.isArray(p&&p.variants)?p.variants.length:0),0);
    const reasons=[];
    if(forcedStatus)reasons.push('Lượt quét bị dừng hoặc chưa hoàn thành.');
    if(!(total>0&&index===total&&products.length===total))reasons.push('Chưa quét đủ sản phẩm được chọn.');
    if(products.some(p=>p&&p.complete!==true||!Array.isArray(p&&p.variants)||!p.variants.length))
      reasons.push('Còn sản phẩm chưa xác minh đủ màu/size/tồn.');
    if(problems.length)reasons.push('Báo cáo còn '+problems.length+' lỗi cần xử lý.');
    if(!rows.length||rows.length!==variants)reasons.push('Số dòng SKU khác số biến thể nguồn.');
    if(rows.some(row=>!rowValid(row)))reasons.push('Có SKU hoặc số tồn không hợp lệ.');
    const seen=new Set();
    for(const row of rows){
      const sku=text(row&&row.sku).toUpperCase();
      if(sku&&seen.has(sku)){reasons.push('Trùng SKU đầu ra: '+sku);break;}
      seen.add(sku);
    }
    return {ok:reasons.length===0,reasons,sourceProductCount:products.length,
      sourceVariantCount:variants,rowCount:rows.length,issueCount:problems.length};
  }
  function trustedEntry(entry){
    if(!entry||entry.qualityValidated!==true||!entry.report||!entry.report.quality
      ||entry.report.quality.ok!==true)return false;
    if(Number(entry.report.issueCount||0)!==0)return false;
    const rows=Array.isArray(entry.rows)?entry.rows:[];
    if(!rows.length||Number(entry.rowCount)!==rows.length)return false;
    if(Number(entry.report.quality.rowCount)!==rows.length)return false;
    if(Number(entry.report.quality.sourceVariantCount)!==rows.length)return false;
    const seen=new Set();
    for(const row of rows){
      if(!rowValid(row))return false;
      const sku=text(row.sku).toUpperCase();
      if(seen.has(sku))return false;
      seen.add(sku);
    }
    return true;
  }
  return {rowValid,evaluate,trustedEntry};
});
