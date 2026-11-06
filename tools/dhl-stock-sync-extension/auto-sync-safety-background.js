(() => {
  'use strict';

  const CONFIG_KEY='dhlAutoSyncConfigV1';
  let repairing=false;
  const text=(v)=>String(v==null?'':v).trim();
  const host=(v)=>text(v).replace(/^https?:\/\//i,'').replace(/\/.*$/,'').toLowerCase();

  function authChanged(oldConfig,newConfig){
    const before=(oldConfig&&oldConfig.sapo)||{};
    const after=(newConfig&&newConfig.sapo)||{};
    return host(before.storeHost)!==host(after.storeHost)
      || text(before.apiKey)!==text(after.apiKey)
      || text(before.apiSecret)!==text(after.apiSecret);
  }

  chrome.storage.onChanged.addListener(async(changes,area)=>{
    if(area!=='local'||repairing||!changes[CONFIG_KEY])return;
    const change=changes[CONFIG_KEY];
    const before=change.oldValue&&typeof change.oldValue==='object'?change.oldValue:{};
    const after=change.newValue&&typeof change.newValue==='object'?change.newValue:{};
    if(!authChanged(before,after))return;
    const sapo=after.sapo&&typeof after.sapo==='object'?after.sapo:{};
    if(!after.autoPushSapo&&!sapo.verifiedAt&&!sapo.locationId)return;

    repairing=true;
    try{
      await chrome.storage.local.set({
        [CONFIG_KEY]:{
          ...after,
          autoPushSapo:false,
          sapo:{...sapo,verifiedAt:0,locationId:0,locationName:''}
        }
      });
    }finally{
      repairing=false;
    }
  });
})();
