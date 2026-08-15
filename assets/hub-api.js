/* Cloud-only JSONBin data layer. */
(() => {
  'use strict';
  const BASE='https://api.jsonbin.io/v3';
  const BIN_ID='6a806543da38895dfee86ff1';
  const ACCESS_KEY='$2a$10$J9blma/PKDEBjvlGZ/YiHOPIw7vQPAOi3jndnhZ9/5tu/NQio7.Gq';
  const URL=`${BASE}/b/${BIN_ID}`;
  const EMPTY={applications:[],payments:[],quizScores:[],messages:[],accessCodes:[]};
  async function request(url,options={}){
    const r=await fetch(url,{...options,headers:{'Content-Type':'application/json','X-Access-Key':ACCESS_KEY,...(options.headers||{})}});
    const text=await r.text(); let body=null; try{body=text?JSON.parse(text):null}catch(_){}
    if(!r.ok) throw new Error(body?.message||body?.error||text||`JSONBin error ${r.status}`);
    return body;
  }
  function normalize(record){return Array.isArray(record)?{...EMPTY,applications:record}:{...EMPTY,...(record&&typeof record==='object'?record:{})};}
  async function loadFromJsonBin(){const data=await request(`${URL}/latest`);return normalize(data?.record);}
  async function saveRecord(record){return request(URL,{method:'PUT',headers:{'X-Bin-Versioning':'true'},body:JSON.stringify(normalize(record))});}
  async function saveToJsonBin(collection,data){
    const record=await loadFromJsonBin(); if(!Array.isArray(record[collection])) record[collection]=[];
    const item={...data,id:data.id||(crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`),createdAt:data.createdAt||new Date().toISOString()};
    record[collection].unshift(item); await saveRecord(record); return item;
  }
  async function saveSubmission(data){data.type=data.type||'application';return saveToJsonBin('applications',data);}
  async function savePaymentRequest(data){data.type=data.type||'payment_request';return saveToJsonBin('payments',data);}
  async function createAccessCode(){
    const record=await loadFromJsonBin(); if(!Array.isArray(record.accessCodes)) record.accessCodes=[];
    let code; do {code=Array.from(crypto.getRandomValues(new Uint32Array(8))).map(n=>(n%36).toString(36)).join('').toUpperCase().slice(0,10);} while(record.accessCodes.some(x=>String(x.code||'').toUpperCase()===code));
    const item={type:'access_code',code,used:false,createdAt:new Date().toISOString()}; record.accessCodes.unshift(item); await saveRecord(record); return item;
  }
  async function validateAccessCode(raw){
    const code=String(raw||'').trim().toUpperCase(); if(!code)return{ok:false,reason:'invalid'};
    const record=await loadFromJsonBin(); const item=record.accessCodes.find(x=>String(x.code||'').toUpperCase()===code);
    if(!item)return{ok:false,reason:'invalid'}; if(item.used)return{ok:false,reason:'used'};
    item.used=true; item.usedAt=new Date().toISOString(); await saveRecord(record); return{ok:true};
  }
  window.loadFromJsonBin=loadFromJsonBin; window.saveToJsonBin=saveToJsonBin; window.saveSubmission=saveSubmission; window.savePaymentRequest=savePaymentRequest; window.createAccessCode=createAccessCode; window.validateAccessCode=validateAccessCode;
})();
