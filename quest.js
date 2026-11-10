/* v1.4: each run is owned by a Supabase anonymous or permanent user.
 * Supabase RPCs, not localStorage, authorize retrying and awarding items. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const pendingKey = 'thequest_pending_run_v14';
  let client, run, retryDeadline = 0, copied = false, failedRun = null;
  const api = {
    shadowEnabled:false, begin, finish, claimPending, renderInventory,
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
  function retryRemaining(){return Math.max(0,retryDeadline-Date.now());}
  function syncFailed(data){
    if(data?.last_outcome==='perished' && data.run_id){
      failedRun={id:data.run_id,secret:data.run_secret};
      copied=!!data.link_copied;
      retryDeadline=data.retry_at?new Date(data.retry_at).getTime():0;
    }else{failedRun=null;copied=false;retryDeadline=0;}
    refreshRetryUI();
  }
  async function loadStatus(){
    const {data:{user}}=await getClient().auth.getUser();
    if(!user)return null;
    const {data,error}=await getClient().rpc('quest_player_status');
    if(error)throw error;
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
    const status=await loadStatus();
    if(status?.completed){
      restoreCompletedRun(status);
      throw new Error('This Autumn edition is already complete. Your prize is in your inventory.');
    }
    if(status?.blocked){
      restoreFailedRun(status);
      throw new Error(copied?'Your five-minute retry timer is still running.':'Copy the adventure link before retrying.');
    }
    const {data,error}=await getClient().rpc('start_guest_quest');
    if(error)throw error;
    run={id:data.run_id,secret:data.run_secret,shadowEnabled:!!data.shadow_enabled};
    api.shadowEnabled=run.shadowEnabled;
    return run;
  }
  async function finish(choices){
    if(!run)throw new Error('No active run');
    const {data,error}=await getClient().rpc('finish_guest_quest',{
      p_run:run.id,p_secret:run.secret,p_choices:choices
    });
    if(error)throw error;
    save({run_id:run.id,secret:run.secret,outcome:data.outcome});
    const claimed=await claimPending();
    if(!claimed)console.warn('Run completed; claim pending; it can be retried on next visit.');
    if(data.outcome==='perished'){
      failedRun={id:run.id,secret:run.secret};copied=false;retryDeadline=0;
    }else syncFailed(null);
    return data.outcome;
  }
  async function claimPending(){
    const p=stored();if(!p)return null;
    const {data:{user}}=await getClient().auth.getUser();
    if(!user)return null;
    const {data,error}=await getClient().rpc('claim_guest_quest',{
      p_run:p.run_id,p_secret:p.secret
    });
    if(error){console.error('Claim pending:',error);return null;}
    forget();
    return data;
  }
  async function copyFailedLink(){
    if(!failedRun)throw new Error('No failed run available');
    const {data,error}=await getClient().rpc('copy_quest_link',{
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
    const rewards=['basic','medium','good','rare','legendary'];
    const mapping={'autumn-pebble':'basic','autumn-seashell':'medium',
      'autumn-cookies':'good','autumn-horse':'rare','autumn-puppies':'legendary'};
    let unlocked=new Set(),notice='Saved items from Supabase.';
    try{
      await claimPending();
      const {data:{user}}=await getClient().auth.getUser();
      if(!user)notice='Choose a name to load your collection.';
      else{
        const {data,error}=await getClient().from('player_inventory').select('collectible_id').eq('player_id',user.id);
        if(error)throw error;
        unlocked=new Set((data||[]).map(row=>mapping[row.collectible_id]).filter(Boolean));
        if(user.is_anonymous)notice='Saved to this browser’s anonymous account. Add email and password to keep these items across devices.';
      }
    }catch(err){notice='Could not load inventory: '+err.message;}
    if(!body.isConnected||$('hub-modal')?.dataset.panel!=='inventory')return;
    body.innerHTML=`<p>Your autumn collectibles:</p><div class="inventory-grid">${rewards.map(k=>{
      const out=EDITION.outcomes[k],active=unlocked.has(k);
      return `<div class="inventory-tile ${active?'unlocked':'locked'}"><span class="inventory-tier">${out.tier}</span>${active?`<img src="assets/reward-${k}.png" alt="${out.item}">`:'<span class="inventory-lock">?</span>'}<span class="inventory-label">${active?out.item:'Not collected'}</span></div>`;
    }).join('')}</div><p class="mini-meta">${notice}</p>`;
  }
  setInterval(refreshRetryUI,1000);
})();
