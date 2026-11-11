/* v1.4: each run is owned by a Supabase anonymous or permanent user.
 * Supabase RPCs, not localStorage, authorize retrying and awarding items. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const pendingKey = 'thequest_pending_run_v14';
  let client, run, retryDeadline = 0, copied = false, failedRun = null, live = null;
  const api = {
    shadowEnabled:false, previewMode:false, begin, finish, claimPending, renderInventory, loadActiveEdition,
    copyFailedLink, retryRemaining, refreshRetryUI, loadStatus, restoreFailedRun, restoreCompletedRun,
    isBlocked: () => !!failedRun && (!copied || retryRemaining()>0),
    hasCopied: () => copied
  };
  window.adventureQuest=api;
  function getClient(){
    if(client)return client;
    if(!window.supabase?.createClient)throw new Error('Supabase SDK unavailable');
    const cfg=window.ADVENTURE_SUPABASE_CONFIG;
    client=window.supabase.createClient(cfg.url,cfg.publishableKey,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    return client;
  }
  window.getAdventureClient=getClient;
  const stored=()=>{try{return JSON.parse(localStorage.getItem(pendingKey)||'null')}catch{return null}};
  const save=(data)=>localStorage.setItem(pendingKey,JSON.stringify(data));
  const forget=()=>localStorage.removeItem(pendingKey);
  async function loadActiveEdition(){
    if(live)return live;
    const draftId=new URLSearchParams(location.search).get('preview_edition');
    if(draftId){
      const {data,error}=await getClient().rpc('quest_preview_edition',{p_edition_id:draftId});
      if(error)throw new Error('Private preview unavailable: '+error.message);
      if(!data?.config?.nodes)throw new Error('No saved Studio draft to preview');
      live=data;api.previewMode=true;window.applyLiveEdition?.(data);
      const banner=document.createElement('div');banner.className='studio-preview-banner';
      banner.textContent='PRIVATE STUDIO PREVIEW · No real prizes, attempts or Guild scores will be saved';
      document.body.prepend(banner);
      return live;
    }
    const {data,error}=await getClient().rpc('quest_get_live_edition');
    if(error){console.warn('Quest Studio publishing not installed; using original Autumn engine:',error.message);return null;}
    if(data?.config?.nodes){live=data;window.applyLiveEdition?.(data);}
    return live;
  }
  function retryRemaining(){return Math.max(0,retryDeadline-Date.now());}
  function syncFailed(data){
    if(data?.last_outcome==='perished' && data.run_id){
      failedRun={id:data.run_id,secret:data.run_secret,legacy:!!data.legacy};
      copied=!!data.link_copied;
      retryDeadline=data.retry_at?new Date(data.retry_at).getTime():0;
    }else{failedRun=null;copied=false;retryDeadline=0;}
    refreshRetryUI();
  }
  async function loadStatus(){
    const {data:{user}}=await getClient().auth.getUser();
    if(!user)return null;
    await loadActiveEdition();
    if(api.previewMode)return {has_identity:true,completed:false,blocked:false};
    const {data,error}=await getClient().rpc(live?'quest_live_status':'quest_player_status');
    if(error)throw error;
    if(api.previewMode)return {has_identity:true,completed:false,blocked:false};
    syncFailed(data);
    return data;
  }
  function restoreCompletedRun(data){
    if(!data?.completed || !data.winning_outcome) return false;
    if(typeof state==='undefined')return false;
    state.outcome=data.winning_outcome;
    state.restoredCompletion=true;
    state.decisions=0;
    state.startedAt=Date.now();
    state.completedAt=state.startedAt;
    state.user=window.adventureAuth?.profileUser || {username:'Traveler'};
    if(typeof openHub==='function'){
      openHub();
      return true;
    }
    return false;
  }
  function restoreFailedRun(data){
    if(data?.last_outcome!=='perished' || !data?.blocked)return false;
    if(typeof state==='undefined')return false;
    state.outcome='perished';state.decisions=0;
    state.startedAt=Date.now();state.completedAt=Date.now();
    state.user=window.adventureAuth?.profileUser || {username:'Traveler'};
    if(typeof openHub==='function'){
      openHub();showHubPanel('share');
      return true;
    }
    return false;
  }
  async function begin(){
    const {data:{user}}=await getClient().auth.getUser();
    if(!user)throw new Error('Choose your adventurer name first.');
    await loadActiveEdition();
    if(api.previewMode){run={id:'preview',secret:'preview',shadowEnabled:true,live:true};api.shadowEnabled=true;return run;}
    const status=await loadStatus();
    if(status?.completed){
      restoreCompletedRun(status);
      throw new Error('This Autumn edition is already complete. Your prize is in your inventory.');
    }
    if(status?.blocked){
      restoreFailedRun(status);
      throw new Error(copied?'Your five-minute retry timer is still running.':'Copy the adventure link before retrying.');
    }
    const {data,error}=await getClient().rpc(live?'quest_begin_live':'start_guest_quest');
    if(error)throw error;
    if(live && data.config){live={...live,config:data.config,release_version:data.release_version};window.applyLiveEdition?.(live);}
    run={id:data.run_id,secret:data.run_secret,shadowEnabled:!!data.shadow_enabled,live:!!live};
    api.shadowEnabled=run.shadowEnabled;
    return run;
  }
  async function finish(choices){
    if(!run)throw new Error('No active run');
    if(api.previewMode){
      const nodes=live.config.nodes;
      let current=live.config.start_node;
      let ending=null;
      for(let i=0;i<choices.length;i++){
        const step=choices[i];if(step.node!==current)throw new Error('Preview path is invalid');
        const choice=nodes[current]?.choices?.find(x=>x.label===step.choice);
        if(!choice)throw new Error('Preview choice missing');
        if(choice.target.startsWith('!'))ending=choice.target.slice(1);
        else{current=choice.target;ending=nodes[current]?.ending||null;}
        if(ending && i!==choices.length-1)throw new Error('Preview continued after ending');
      }
      if(!ending)throw new Error('Preview run has no ending');
      if(ending==='perished'){failedRun={id:'preview',secret:'preview',legacy:false};copied=false;retryDeadline=0;}
      return ending;
    }
    const {data,error}=await getClient().rpc(run.live?'quest_finish_live':'finish_guest_quest',{
      p_run:run.id,p_secret:run.secret,p_choices:choices
    });
    if(error)throw error;
    save({run_id:run.id,secret:run.secret,outcome:data.outcome,live:run.live});
    const claimed=await claimPending();
    if(!claimed)console.warn('Run completed; claim pending; it can be retried on next visit.');
    if(data.outcome==='perished'){
      failedRun={id:run.id,secret:run.secret,legacy:!run.live};copied=false;retryDeadline=0;
    }else syncFailed(null);
    return data.outcome;
  }
  async function claimPending(){
    if(api.previewMode)return {preview:true};
    const p=stored();if(!p)return null;
    const {data:{user}}=await getClient().auth.getUser();
    if(!user)return null;
    const {data,error}=await getClient().rpc(p.live?'quest_claim_live':'claim_guest_quest',{
      p_run:p.run_id,p_secret:p.secret
    });
    if(error){console.error('Claim pending:',error);return null;}
    forget();
    return data;
  }
  async function copyFailedLink(){
    if(!failedRun)throw new Error('No failed run available');
    if(api.previewMode){copied=true;retryDeadline=Date.now();refreshRetryUI();return {preview:true};}
    const {data,error}=await getClient().rpc(failedRun.legacy?'copy_quest_link':'quest_copy_live_link',{
      p_run:failedRun.id,p_secret:failedRun.secret
    });
    if(error)throw error;
    copied=true;retryDeadline=new Date(data.retry_at).getTime();
    refreshRetryUI();return data;
  }
  function refreshRetryUI(){
    const panel=$('retry-panel'),clock=$('retry-clock'),btn=$('retry-button');
    if(!panel||!clock||!btn)return;
    let seconds=Math.ceil(retryRemaining()/1000);
    clock.textContent=copied?
      `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`:'05:00';
    btn.disabled=!copied||retryRemaining()>0;
    btn.textContent=!copied?'COPY LINK TO UNLOCK':seconds?'WAIT TO RETRY':'TRY AGAIN';
    const p=panel.querySelector('p');
    if(p)p.textContent=!copied?'Copy the link to begin the five-minute cooldown.':
      seconds?'The forest will reopen when your timer expires.':'Your next adventure is unlocked!';
  }
  async function renderInventory(body){
    const esc=s=>String(s||'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
    if(api.previewMode){body.innerHTML='<p>Studio preview only — no real inventory changes are made.</p>';return;}
    let items=[],notice='Saved permanently in your Supabase adventurer inventory.';
    try{
      await claimPending();
      const {data:{user}}=await getClient().auth.getUser();
      if(!user)notice='Choose a username to view your inventory.';
      else{
        const {data:rows,error:e}=await getClient().from('player_inventory').select('collectible_id').eq('player_id',user.id);
        if(e)throw e;
        const ids=(rows||[]).map(x=>x.collectible_id);
        if(ids.length){const {data:catalog,error:ce}=await getClient().from('collectibles').select('id,title,tier,image_path,edition_id').in('id',ids);
          if(ce)throw ce;items=catalog||[];}
        if(user.is_anonymous)notice='Items are saved to this browser’s anonymous player. Add email and password to retain them across devices.';
      }
    }catch(e){notice='Inventory could not load: '+e.message;}
    if(!body.isConnected||$('hub-modal')?.dataset.panel!=='inventory')return;
    const activeId=typeof ACTIVE_EDITION_ID==='string'?ACTIVE_EDITION_ID:'autumn-01';
    const activeTiers=['BASIC','MEDIUM','GOOD','RARE','LEGENDARY'];
    const active=items.filter(item=>item.edition_id===activeId);
    const other=items.filter(item=>item.edition_id!==activeId);
    const itemCard=item=>`<div class="inventory-tile unlocked"><span class="inventory-tier">${esc(item.tier)}</span><img src="${esc(artUrl(item.image_path))}" alt="${esc(item.title)}"><span class="inventory-label">${esc(item.title)}</span><small>${esc(item.edition_id)}</small></div>`;
    const tiles=activeTiers.map(tier=>{
      const item=active.find(x=>x.tier===tier);
      return item?itemCard(item):`<div class="inventory-tile locked"><span class="inventory-tier">${tier}</span><span class="inventory-lock">?</span><span class="inventory-label">Not collected</span></div>`;
    }).join('');
    body.innerHTML=`<p>${esc(uiCopy('inventory','heading','YOUR INVENTORY'))}</p><p class="mini-meta">Current edition: ${esc(activeId)}</p><div class="inventory-grid">${tiles}</div>${other.length?'<h3>Previous adventures</h3><div class="inventory-grid">'+other.map(itemCard).join('')+'</div>':''}<p class="mini-meta">${esc(notice)}</p>`;
  }
  setInterval(refreshRetryUI,1000);
})();
