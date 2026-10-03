(() => {
  'use strict';

  if (globalThis.__DHL_SAPO_INVENTORY_SET_COMPAT__) return;
  globalThis.__DHL_SAPO_INVENTORY_SET_COMPAT__ = true;

  const originalFetch = globalThis.fetch.bind(globalThis);

  function requestUrl(input) {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    return input && input.url ? String(input.url) : '';
  }

  async function jsonOf(response) {
    try { return await response.clone().json(); } catch (_) { return {}; }
  }

  function inventoryLevelsFrom(data) {
    if (Array.isArray(data && data.inventory_levels)) return data.inventory_levels;
    if (Array.isArray(data && data.data)) return data.data;
    if (data && data.data && Array.isArray(data.data.inventory_levels)) return data.data.inventory_levels;
    return [];
  }

  function syntheticOk(inventoryItemId, locationId, available, method='synthetic') {
    return new Response(JSON.stringify({
      inventory_level: {
        inventory_item_id: inventoryItemId,
        location_id: locationId,
        available
      },
      dhl_stock_write_method: method
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  function authSafeStatus(response) {
    const status=Number(response && response.status);
    return [401,403,408,429].includes(status) || status>=500;
  }

  function compatStatus(response) {
    return [400,404,405,409,422].includes(Number(response && response.status));
  }

  async function currentInventoryLevel(origin, init, inventoryItemId, locationId) {
    const url=`${origin}/admin/inventory_levels.json?inventory_item_id=${inventoryItemId}&location_id=${locationId}&limit=5`;
    const response=await originalFetch(url,{...init,method:'GET',body:undefined});
    if(!response.ok)return{response,level:null};
    const levels=inventoryLevelsFrom(await jsonOf(response));
    const level=levels.find(x=>Number(x&&x.inventory_item_id)===inventoryItemId&&Number(x&&x.location_id)===locationId)
      ||levels.find(x=>Number(x&&x.inventory_item_id)===inventoryItemId)
      ||levels[0]
      ||null;
    return{response,level};
  }

  async function adjustAbsolute(origin, init, inventoryItemId, locationId, available, fallbackResponse) {
    let current;
    try{current=await currentInventoryLevel(origin,init,inventoryItemId,locationId);}
    catch(_){return fallbackResponse;}
    if(!current||!current.level)return fallbackResponse;

    const currentAvailable=Number(current.level.available);
    if(!Number.isFinite(currentAvailable))return fallbackResponse;
    const adjustment=available-currentAvailable;
    if(adjustment===0)return syntheticOk(inventoryItemId,locationId,available,'inventory_levels/adjust:no-op');

    const adjustResponse=await originalFetch(`${origin}/admin/inventory_levels/adjust.json`,{
      ...init,
      method:'POST',
      body:JSON.stringify({
        location_id:locationId,
        inventory_item_id:inventoryItemId,
        available_adjustment:adjustment
      })
    });
    return adjustResponse;
  }

  async function writeAbsolute(origin, init, inventoryItemId, locationId, available) {
    const url=`${origin}/admin/inventory_levels/set.json`;
    const body={
      location_id:locationId,
      inventory_item_id:inventoryItemId,
      available
    };

    // Chuẩn Sapo Admin API: POST /inventory_levels/set.json.
    const postResponse=await originalFetch(url,{
      ...init,
      method:'POST',
      body:JSON.stringify(body)
    });
    if(postResponse.ok || authSafeStatus(postResponse) || !compatStatus(postResponse))return postResponse;

    // Một số shop/version từng trả 405 cho POST; thử PUT để tương thích ngược.
    const putResponse=await originalFetch(url,{
      ...init,
      method:'PUT',
      body:JSON.stringify(body)
    });
    if(putResponse.ok || authSafeStatus(putResponse) || !compatStatus(putResponse))return putResponse;

    // Nếu set không được, dùng API adjust đã hỗ trợ theo location:
    // GET tồn hiện tại -> tính delta -> POST /inventory_levels/adjust.json.
    return adjustAbsolute(origin,init,inventoryItemId,locationId,available,putResponse);
  }

  function legacyRequest(url,method,init){
    const match=url.match(/^(https:\/\/[^/]+)\/admin\/inventory_items\/(\d+)\/locations\/(\d+)\.json(?:[?#].*)?$/i);
    if(method!=='PUT'||!match)return null;
    let payload={};
    try{payload=typeof init.body==='string'?JSON.parse(init.body):(init.body||{});}catch(_){}
    const available=Number(payload&&payload.inventory_level&&payload.inventory_level.available);
    if(!Number.isFinite(available)||available<0)return null;
    return{
      origin:match[1],
      inventoryItemId:Number(match[2]),
      locationId:Number(match[3]),
      available
    };
  }

  function setRequest(url,method,init){
    const match=url.match(/^(https:\/\/[^/]+)\/admin\/inventory_levels\/set\.json(?:[?#].*)?$/i);
    if(!match||!['POST','PUT'].includes(method))return null;
    let payload={};
    try{payload=typeof init.body==='string'?JSON.parse(init.body):(init.body||{});}catch(_){}
    const inventoryItemId=Number(payload&&payload.inventory_item_id);
    const locationId=Number(payload&&payload.location_id);
    const available=Number(payload&&payload.available);
    if(!inventoryItemId||!locationId||!Number.isFinite(available)||available<0)return null;
    return{origin:match[1],inventoryItemId,locationId,available};
  }

  globalThis.fetch=async function dhlSapoFetchCompat(input,init={}){
    const url=requestUrl(input);
    const method=String(init&&init.method||(input&&input.method)||'GET').toUpperCase();
    const target=legacyRequest(url,method,init)||setRequest(url,method,init);
    if(!target)return originalFetch(input,init);
    return writeAbsolute(target.origin,init,target.inventoryItemId,target.locationId,target.available);
  };
})();
