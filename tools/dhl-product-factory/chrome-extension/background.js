import {makeGeminiRequest,validateDraft} from './lib/core.mjs';
import {checkGithubVersion} from './lib/update-check.mjs';
import {connectDrive,getDriveToken,disconnectDrive,driveConnectionStatus} from './lib/google-auth.mjs';
import {resolveShop,resolveProductFolder,verifyProductFolder,uploadProductFile,listSourceFolder,loadSourceFile,driveAccount} from './lib/drive-sync.mjs';

// Open a full-size browser tab (not a narrow Side Panel).
// Re-use the tab if it is already open, so repeated toolbar clicks do not create duplicates.
chrome.action.onClicked.addListener(async () => {
  const url=chrome.runtime.getURL('panel.html');
  try {
    const tabs=await chrome.tabs.query({url});
    const existing=tabs.find(tab=>Number.isInteger(tab.id));
    if(existing){
      await chrome.tabs.update(existing.id,{active:true});
      if(Number.isInteger(existing.windowId)){
        try { await chrome.windows.update(existing.windowId,{focused:true}); }
        catch(e){ console.warn('Cannot focus Chrome window:',e); }
      }
    }else{
      await chrome.tabs.create({url,active:true});
    }
  }catch(e){
    console.error('Cannot reuse Product Factory tab:',e);
    await chrome.tabs.create({url,active:true});
  }
});
chrome.runtime.onInstalled.addListener(()=>{
  chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}).catch(console.error);
});

async function geminiAnalyze(product){
  const {geminiKey,geminiModel}=await chrome.storage.local.get(['geminiKey','geminiModel']);
  if(!geminiKey)throw Error('Chưa lưu Gemini API key trong Cài đặt.');
  const model=geminiModel||'gemini-2.5-flash-lite';
  if(!/^gemini-[a-zA-Z0-9.-]+$/.test(model))throw Error('Tên model không hợp lệ.');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),110000);
  try{
    const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
      method:'POST',headers:{'x-goog-api-key':geminiKey,'Content-Type':'application/json'},
      body:JSON.stringify(makeGeminiRequest(product)),signal:controller.signal
    });
    if(!res.ok){if(res.status===429)throw Error('Gemini đã hết hạn mức/tốc độ miễn phí. Thử lại sau; không tự chuyển sang API trả phí.');if(res.status===400||res.status===404)throw Error('Model hoặc dữ liệu Gemini không hợp lệ ('+res.status+').');if(res.status===401||res.status===403)throw Error('API key không hợp lệ hoặc không có quyền sử dụng ('+res.status+').');throw Error('Gemini HTTP '+res.status);}
    const data=await res.json();const content=(data.candidates||[]).flatMap(c=>c.content?.parts||[]).map(p=>p.text||'').join('');
    if(!content)throw Error('Gemini không trả nội dung; kiểm tra giới hạn hoặc ảnh nguồn.');
    try{return validateDraft(JSON.parse(content));}catch{throw Error('Gemini không trả JSON đúng cấu trúc. Thử lại hoặc thay model.');}
  }finally{clearTimeout(timeout);}
}
const BACKEND='http://127.0.0.1:4177';
async function backendRequest(message){
  const allowedPaths=new Set(['/api/config','/api/export-platform','/api/drive/fees','/api/drive/source']);
  if(!allowedPaths.has(message.path)&&message.path!=='/api/drive/list')throw Error('Đường dẫn máy chủ không được phép.');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),90000);
  try{
    const options={method:message.method==='GET'?'GET':'POST',headers:{'x-tool-password':String(message.password||'')},signal:controller.signal};
    if(options.method==='POST'){options.headers['Content-Type']='application/json';options.body=JSON.stringify(message.data||{});}
    const q=message.path==='/api/drive/list'?'?shop='+encodeURIComponent(String(message.shop||''))+(message.parentId?'&parentId='+encodeURIComponent(String(message.parentId)):''):'';
    const res=await fetch(BACKEND+message.path+q,options);
    if(!res.ok){let error='';try{error=(await res.json()).error||'';}catch{}throw Error(error||'Máy chủ trả mã '+res.status);}
    if(message.path==='/api/export-platform'){
      const arr=new Uint8Array(await res.arrayBuffer());if(arr.length>12_000_000)throw Error('File kết quả quá lớn.');
      let s='';for(let i=0;i<arr.length;i+=16000)s+=String.fromCharCode(...arr.subarray(i,i+16000));
      return {base64:btoa(s)};
    }
    return await res.json();
  }catch(err){if(err instanceof TypeError)throw Error('Không kết nối được máy chủ local 127.0.0.1:4177. Hãy chạy DHL Product Factory server trước.');throw err;}
  finally{clearTimeout(timeout);}
}
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(sender.id!==chrome.runtime.id)return false;
  (async()=>{
    if(message.type==='analyze')return {draft:await geminiAnalyze(message.product)};
    if(message.type==='github-update-check')return await checkGithubVersion(chrome.runtime.getManifest());
    if(message.type==='local-updater-ping'){
      try{return await chrome.runtime.sendNativeMessage('vn.dhl.product_factory_updater',{command:'ping'});}
      catch(e){throw Error('Chưa cài bộ cập nhật một lần trên Windows. Mở CAI-DAT-NUT-CAP-NHAT.cmd trong thư mục tool. Chi tiết: '+e.message);}
    }
    if(message.type==='local-updater-update'){
      try{
        const result=await chrome.runtime.sendNativeMessage('vn.dhl.product_factory_updater',{command:'update'});
        if(!result||result.ok!==true)throw Error(result?.message||'Bộ cập nhật trả lỗi.');
        return result;
      }catch(e){
        if(/native messaging host|Specified native messaging|host not found|forbidden/i.test(e.message||''))
          throw Error('Chưa cài bộ cập nhật trên Windows. Chạy CAI-DAT-NUT-CAP-NHAT.cmd một lần rồi thử lại.');
        throw e;
      }
    }
    if(message.type==='backend')return await backendRequest(message);
    if(message.type==='drive-connect'){
      await connectDrive();
      const token=await getDriveToken();
      try {
        const shop=await resolveShop(token,message.shop||'DHL STUDIO');
        return {connected:true,account:await driveAccount(token),verifiedShop:shop.name};
      } catch(e) { throw Error('Đăng nhập Google thành công, nhưng kiểm tra thư mục shop thất bại: '+e.message); }
    }
    if(message.type==='drive-source-list')return await listSourceFolder(await getDriveToken(),{shop:message.shop,folderId:message.folderId||''});
    if(message.type==='drive-source-read')return await loadSourceFile(await getDriveToken(),{shop:message.shop,folderId:message.folderId,fileId:message.fileId});
    if(message.type==='drive-account')return await driveAccount(await getDriveToken());
    if(message.type==='drive-status')return await driveConnectionStatus();
    if(message.type==='drive-disconnect')return await disconnectDrive();
    if(message.type==='drive-verify')return await resolveShop(await getDriveToken(),message.shop);
    if(message.type==='drive-folder')return await resolveProductFolder(await getDriveToken(),message.product);
    if(message.type==='drive-upload'){
      const token=await getDriveToken();
      await verifyProductFolder(token,{shop:message.shop,sku:message.sku,folderId:message.folderId});
      return await uploadProductFile(token,message.folderId,message.sku,message.file);
    }
    throw Error('Yêu cầu không hỗ trợ.');
  })().then(result=>sendResponse({ok:true,result})).catch(e=>sendResponse({ok:false,error:e.message||'Lỗi không xác định'}));
  return true;
});
