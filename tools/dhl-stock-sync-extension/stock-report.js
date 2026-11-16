(() => {
  'use strict';
  const core=globalThis.DHLStockReportCore;
  if(!core)return;
  const HISTORY_KEY='dhlStockScanHistoryV1';
  const REPORT_KEY='dhlManualStockReportV1';
  const $=id=>document.getElementById(id);
  const text=v=>String(v==null?'':v).trim();
  const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=v=>Number(v)?new Date(Number(v)).toLocaleString('vi-VN'):'—';
  let selectedId='';
  let filter='focus';
  let query='';
  let limit=40;
  let entries=[];
  let lastModel=null;
  const filters=[
    {key:'focus',label:'Cần chú ý'},
    {key:'zero',label:'Đang hết hàng'},
    {key:'soldout',label:'Vừa hết hàng'},
    {key:'restocked',label:'Có hàng trở lại'},
    {key:'increased',label:'Tăng tồn'},
    {key:'decreased',label:'Giảm tồn'},
    {key:'missing',label:'Không còn thấy'},
    {key:'all',label:'Tất cả SKU'}
  ];
  const labels={
    zero:'ĐANG HẾT HÀNG',soldout:'VỪA HẾT HÀNG',restocked:'CÓ HÀNG LẠI',
    increased:'TĂNG TỒN',decreased:'GIẢM TỒN',missing:'KHÔNG CÒN THẤY',
    added:'SKU MỚI',unchanged:'KHÔNG ĐỔI'
  };
  function matches(row,which){
    if(which==='focus')return row.type!=='unchanged';
    if(which==='zero')return row.currentlyOut;
    if(which==='all')return true;
    return row.type===which;
  }
  function card(row){
    const url=core.safeUrl(row.imageUrl);
    const href=core.safeUrl(row.productUrl);
    const state=labels[row.type]||row.type;
    const after=row.stock===null?'—':String(row.stock);
    const before=row.before===null?'—':String(row.before);
    const delta=row.delta===null?'Không có mốc so sánh'
      :row.delta===0?'Không đổi':(row.delta>0?'+':'')+row.delta;
    const dclass=row.delta===null?'':row.delta>0?'up':row.delta<0?'down':'';
    const ptitle=[row.name,row.color,row.size?'Size '+row.size:''].filter(Boolean).join(' • ');
    return '<article class="stock-row">'
      +'<div class="photo-wrap'+(!url?' no-photo':'')+'">'
      +(url?'<button class="photo-zoom" type="button" data-url="'+esc(url)+'" data-name="'+esc(ptitle)+'" aria-label="Phóng to ảnh sản phẩm">'
         +'<img loading="lazy" decoding="async" src="'+esc(url)+'" alt="'+esc(ptitle)+'"></button>':'')
      +'<div class="photo-empty">Chưa có ảnh<br>đúng biến thể</div></div>'
      +'<div class="product-info"><span class="tag '+esc(row.type)+'">'+esc(state)+'</span>'
      +'<h3 class="product-name">'+esc(row.name||row.sourceName||'Sản phẩm chưa có tên')+'</h3>'
      +'<div class="product-detail">'+esc([row.color,row.size?'Size '+row.size:''].filter(Boolean).join(' • '))+'</div>'
      +'<span class="sku">'+esc(row.sku||'Chưa lấy được SKU')+'</span>'
      +(href?'<a class="source-link" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">Trang sản phẩm nguồn</a>':'')
      +(url&&row.imageScope==='product'?'<div class="photo-note">Ảnh đại diện của sản phẩm một màu</div>':'')
      +'</div>'
      +'<div class="stock-numbers"><div>Tồn trước → sau</div><div class="stock-values">'
      +'<span class="before">'+esc(before)+'</span><span class="arrow">→</span>'
      +'<span class="after '+(row.stock===0?'zero':row.type==='restocked'?'restocked':'')+'">'+esc(after)+'</span></div>'
      +'<small class="delta '+dclass+'">'+esc(delta)+'</small></div></article>';
  }
  function setStatus(message){
    $('alert').hidden=!message;
    $('alert').textContent=message||'';
  }
  function renderResults(){
    const model=lastModel;
    if(!model||!model.ready){
      $('results').innerHTML='<div class="empty">Chưa có dữ liệu báo cáo hợp lệ.</div>';
      $('resultCount').textContent='';
      $('moreBtn').hidden=true;
      return;
    }
    const needle=query.toLocaleLowerCase('vi').trim();
    const matching=model.items.filter(row=>matches(row,filter)
      &&(!needle||[row.sku,row.name,row.color,row.size,row.sourceName]
        .some(v=>text(v).toLocaleLowerCase('vi').includes(needle))));
    const display=matching.slice(0,limit);
    $('results').innerHTML=display.length?display.map(card).join('')
      :'<div class="empty">Không có SKU nào thuộc nhóm này hoặc phù hợp từ khóa tìm kiếm.</div>';
    $('resultCount').textContent=matching.length+' SKU'+(matching.length>limit?' • hiển thị '+display.length:'');
    $('moreBtn').hidden=matching.length<=limit;
    for(const img of $('results').querySelectorAll('img')){
      img.addEventListener('error',()=>{
        const box=img.closest('.photo-wrap');
        if(box)box.classList.add('no-photo');
      },{once:true});
    }
    for(const btn of $('results').querySelectorAll('.photo-zoom')){
      btn.addEventListener('click',()=>{
        const url=core.safeUrl(btn.dataset.url);
        if(!url)return;
        $('largePhoto').src=url;
        $('largePhotoLabel').textContent=text(btn.dataset.name);
        $('photoDialog').showModal();
      });
    }
  }
  function renderReport(){
    const item=entries.find(x=>x.id===selectedId)||null;
    const model=item?core.build(item.report,item.history):null;
    lastModel=model;
    if(!model||!model.ready){
      $('reportInfo').innerHTML='<div class="notice">'+esc(model&&model.reason||'Chưa có lượt quét. Hãy quét danh mục trong Side Panel rồi mở lại báo cáo.')+'</div>';
      $('summary').innerHTML='';
      $('filters').innerHTML='';
      renderResults();
      return;
    }
    $('reportInfo').innerHTML='<div class="report-meta">'
      +'<strong>'+esc(model.profileName)+'</strong><span class="dot">•</span>'
      +'Quét lúc '+esc(date(model.at))+'<span class="dot">•</span>'
      +(model.comparable?'So với '+esc(date(model.previousAt)):'Chưa có hai lượt quét đủ điều kiện để so sánh')
      +'<span class="dot">•</span> Tổng tồn đã đọc '+Number(model.totalStock).toLocaleString('vi-VN')+' sản phẩm/đơn vị tồn</div>'
      +(model.notice?'<div class="notice">'+esc(model.notice)+'</div>':'');
    const metrics=[
      {key:'zero',name:'SKU đang hết hàng',value:model.counts.zero},
      {key:'soldout',name:'Vừa chuyển về tồn 0',value:model.counts.soldout},
      {key:'restocked',name:'Đã có hàng trở lại (0 → có)',value:model.counts.restocked},
      {key:'increased',name:'Tăng tồn so với lần trước',value:model.counts.increased}
    ];
    $('summary').innerHTML=metrics.map(m=>'<div class="metric '+m.key+'"><small>'+esc(m.name)+'</small><strong>'+m.value+'</strong></div>').join('');
    $('filters').innerHTML=filters.map(f=>'<button type="button" class="filter '+(f.key===filter?'active':'')
      +'" data-filter="'+esc(f.key)+'">'+esc(f.label)+' <span>'+(
       f.key==='focus'?model.counts.focus:model.counts[f.key]
      )+'</span></button>').join('');
    for(const btn of $('filters').querySelectorAll('button')){
      btn.addEventListener('click',()=>{
        filter=btn.dataset.filter||'focus';
        limit=40;
        renderReport();
      });
    }
    renderResults();
  }
  async function refresh(){
    try{
      const stored=await chrome.storage.local.get([REPORT_KEY,HISTORY_KEY]);
      const reports=stored[REPORT_KEY]&&typeof stored[REPORT_KEY]==='object'?stored[REPORT_KEY]:{};
      const histories=stored[HISTORY_KEY]&&typeof stored[HISTORY_KEY]==='object'?stored[HISTORY_KEY]:{};
      entries=Object.entries(reports).filter(([,r])=>r&&typeof r==='object').map(([id,report])=>({
        id:String(id),report,history:Array.isArray(histories[id])?histories[id]:[]
      })).sort((a,b)=>Number(b.report.at||0)-Number(a.report.at||0));
      if(!entries.some(x=>x.id===selectedId))selectedId=entries.length?entries[0].id:'';
      $('profileSelect').innerHTML=entries.length?entries.map(x=>
        '<option value="'+esc(x.id)+'">'+esc(x.report.profileName||x.id)+'</option>').join('')
        :'<option value="">Chưa có lượt quét</option>';
      $('profileSelect').value=selectedId;
      setStatus('');
      renderReport();
    }catch(e){setStatus('Không thể đọc lịch sử tồn kho: '+String(e&&e.message||e));}
  }
  $('profileSelect').addEventListener('change',event=>{
    selectedId=event.target.value;
    filter='focus';
    limit=40;
    renderReport();
  });
  $('searchInput').addEventListener('input',event=>{
    query=event.target.value;
    limit=40;
    renderResults();
  });
  $('moreBtn').addEventListener('click',()=>{limit+=40;renderResults();});
  $('printBtn').addEventListener('click',()=>window.print());
  $('closePhotoBtn').addEventListener('click',()=>$('photoDialog').close());
  $('photoDialog').addEventListener('close',()=>{$('largePhoto').removeAttribute('src');});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==='local'&&(changes[REPORT_KEY]||changes[HISTORY_KEY]))refresh().catch(()=>{});
  });
  refresh().catch(()=>{});
})();
