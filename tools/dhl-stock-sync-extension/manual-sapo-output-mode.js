(() => {
  'use strict';

  const BATCH_KEY='dhlPendingStockBatchV1';
  const CONFIG_KEY='dhlAutoSyncConfigV1';
  const QUEUE_KEY='dhlSapoPushQueueV1';
  const text=(v)=>String(v==null?'':v).trim();
  const setText=(el,value)=>{if(el&&el.textContent!==value)el.textContent=value;};

  function send(message){
    return new Promise((resolve,reject)=>{
      chrome.runtime.sendMessage(message,response=>{
        const err=chrome.runtime.lastError;
        if(err){reject(err);return;}
        if(!response){reject(new Error('Không nhận được phản hồi từ background.'));return;}
        resolve(response);
      });
    });
  }

  function setState(message,kind=''){
    const el=document.getElementById('manualSapoOutputState');
    if(!el)return;
    const cls=`manual-output-state ${kind}`.trim();
    setText(el,message);
    if(el.className!==cls)el.className=cls;
  }

  async function state(){
    const s=await chrome.storage.local.get([BATCH_KEY,CONFIG_KEY,QUEUE_KEY]);
    const pending=s[BATCH_KEY]&&typeof s[BATCH_KEY]==='object'?s[BATCH_KEY]:{};
    const config=s[CONFIG_KEY]&&typeof s[CONFIG_KEY]==='object'?s[CONFIG_KEY]:{};
    const queue=s[QUEUE_KEY]&&typeof s[QUEUE_KEY]==='object'?s[QUEUE_KEY]:null;
    const manualEntries=Object.values(pending).filter(x=>x&&x.auto!==true&&Array.isArray(x.rows)&&x.rows.length);
    return{pending,config,queue,manualEntries};
  }

  async function pushManual(){
    const btn=document.getElementById('manualSapoPushBtn');
    if(btn){btn.disabled=true;setText(btn,'ĐANG KHỞI TẠO...');}
    try{
      const s=await state();
      const profileIds=s.manualEntries.map(x=>String(x.profileId||'')).filter(Boolean);
      const isResume=s.queue&&s.queue.source==='manual'&&s.queue.status==='running'&&s.queue.manualPaused===true;
      if(!isResume&&!profileIds.length)throw new Error('Chưa có kết quả quét thủ công để đẩy lên Sapo.');
      const response=await send({type:'DHL_SAPO_PUSH_MANUAL',profileIds});
      if(!response.ok)throw new Error(response.error||'Không tạo được hàng đợi Sapo.');
      setState(response.result&&response.result.resumed?'Đã tiếp tục hàng đợi Sapo từ đúng dòng đang dừng.':'Đã tạo hàng đợi ghi tồn trực tiếp lên Sapo. Theo dõi báo cáo bên dưới.','ok');
      await refresh();
    }catch(error){
      setState(error.message||String(error),'bad');
    }finally{
      if(btn)btn.disabled=false;
      await refresh().catch(()=>{});
    }
  }

  function injectStyle(){
    if(document.getElementById('manualSapoOutputStyle'))return;
    const style=document.createElement('style');
    style.id='manualSapoOutputStyle';
    style.textContent=`
      .manual-output-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}
      .manual-output-actions button{width:100%;min-height:44px;margin-top:0!important;font-size:11px;font-weight:900}
      #manualSapoPushBtn{background:#0f172a;color:#fff;border-color:#0f172a}
      .manual-output-state{margin-top:7px;padding:7px 8px;border-radius:7px;background:#f8fafc;color:#475569;font-size:10px;line-height:1.4}
      .manual-output-state.ok{background:#f0fdf4;color:#166534}.manual-output-state.bad{background:#fef2f2;color:#991b1b}
      @media(max-width:390px){.manual-output-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function mount(){
    const box=document.getElementById('batchPendingBox');
    const excel=document.getElementById('batchExportBtn');
    if(!box||!excel)return false;
    if(document.getElementById('manualSapoPushBtn'))return true;

    const actions=document.createElement('div');
    actions.className='manual-output-actions';
    excel.insertAdjacentElement('beforebegin',actions);
    actions.appendChild(excel);
    setText(excel,'TẢI FILE EXCEL');
    excel.title='Tải file Excel nhập tồn kho Sapo từ kết quả quét thủ công.';

    const push=document.createElement('button');
    push.id='manualSapoPushBtn';
    push.type='button';
    push.className='primary';
    push.textContent='ĐẨY THẲNG LÊN SAPO';
    push.title='Ghi tồn trực tiếp qua Ứng dụng riêng Sapo đã xác minh.';
    push.addEventListener('click',pushManual);
    actions.appendChild(push);

    const note=document.createElement('div');
    note.id='manualSapoOutputState';
    note.className='manual-output-state';
    note.textContent='Sau khi quét thủ công, chọn tải Excel hoặc đẩy trực tiếp qua Ứng dụng riêng Sapo.';
    actions.insertAdjacentElement('afterend',note);
    return true;
  }

  async function refresh(){
    if(!mount())return;
    const s=await state();
    const excel=document.getElementById('batchExportBtn');
    const push=document.getElementById('manualSapoPushBtn');
    const sapo=s.config&&s.config.sapo||{};
    const verified=Boolean(sapo.verifiedAt&&sapo.locationId);
    const manualCount=s.manualEntries.length;
    const manualRows=s.manualEntries.reduce((sum,x)=>sum+Number(x.rowCount||(x.rows||[]).length||0),0);
    const paused=Boolean(s.queue&&s.queue.source==='manual'&&s.queue.status==='running'&&s.queue.manualPaused===true);
    const busy=Boolean(s.queue&&['running','queued'].includes(s.queue.status)&&!paused);

    if(excel)setText(excel,manualCount?`TẢI FILE EXCEL (${manualCount})`:'TẢI FILE EXCEL');
    if(push){
      setText(push,paused?'THỬ LẠI ĐẨY SAPO':manualRows?`ĐẨY LÊN SAPO (${manualRows} DÒNG)`:'ĐẨY THẲNG LÊN SAPO');
      push.disabled=paused?false:(!verified||!manualCount||busy);
      push.title=!verified?'Chưa xác minh Ứng dụng riêng Sapo.':busy?'Đang có hàng đợi Sapo khác.':'Ghi trực tiếp tồn kho qua Ứng dụng riêng Sapo.';
    }
    if(paused)setState('Hàng đợi Sapo thủ công đang dừng ở một dòng lỗi. Bấm THỬ LẠI ĐẨY SAPO để tiếp tục đúng dòng đó.','bad');
    else if(!verified)setState('Muốn đẩy trực tiếp: mở phần Sapo bên dưới và bấm KIỂM TRA KẾT NỐI SAPO trước.');
    else if(manualCount)setState(`Quét thủ công đã sẵn sàng: ${manualCount} hồ sơ • ${manualRows} dòng. Chọn TẢI FILE EXCEL hoặc ĐẨY LÊN SAPO.`,'ok');
    else setState('BƯỚC 3 sẽ sẵn sàng sau khi quét thành công ít nhất một hồ sơ.');
  }

  function install(){
    injectStyle();
    refresh().catch(()=>{});
    let queued=false;
    const observer=new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;refresh().catch(()=>{});});
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area==='local'&&(changes[BATCH_KEY]||changes[CONFIG_KEY]||changes[QUEUE_KEY]))refresh().catch(()=>{});
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
