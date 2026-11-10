/* Server-backed guest run receipt, email-confirmation recovery and retry countdown. */
(() => {
 'use strict';
 const key='autumn_quest_pending_v13';
 const cooldownKey='autumn_retry_until_v13';
 const $=id=>document.getElementById(id);
 let client=null, run=null;
 const getClient=()=>{
   if(client)return client;
   if(!window.supabase?.createClient)throw new Error('Supabase library not loaded');
   const cfg=window.ADVENTURE_SUPABASE_CONFIG;
   client=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
   return client;
 };
 // Share the same auth client to avoid multiple simultaneous Supabase auth instances.
 const api={shadowEnabled:false,retryRemaining,begin,finish,claimPending,renderInventory,beginRetryCooldown,refreshRetryUI,clearPendingFailure};
 window.adventureQuest=api;
 window.getAdventureClient=getClient;
 function getPending(){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
 function putPending(value){localStorage.setItem(key,JSON.stringify(value));}
 function retryRemaining(){return Math.max(0,Number(localStorage.getItem(cooldownKey)||0)-Date.now());}
 async function begin(){
   if(retryRemaining()>0)throw new Error('Retry cooldown is still active.');
   const {data,error}=await getClient().rpc('start_guest_quest');
   if(error)throw error;
   run={id:data.run_id,secret:data.run_secret,shadowEnabled:!!data.shadow_enabled};
   api.shadowEnabled=run.shadowEnabled;
   return run;
 }
 async function finish(choices){
   if(!run)throw new Error('No active quest run');
   const {data,error}=await getClient().rpc('finish_guest_quest',{p_run:run.id,p_secret:run.secret,p_choices:choices});
   if(error)throw error;
   const pending={run_id:run.id,secret:run.secret,outcome:data.outcome,finished_at:data.finished_at};
   putPending(pending);
   // A signed-in player can claim immediately; otherwise claim after email confirmation.
   const {data:{user}}=await getClient().auth.getUser();
   if(user)await claimPending();
   return data.outcome;
 }
 async function claimPending(){
   const pending=getPending();
   if(!pending)return false;
   const {data:{user},error:userErr}=await getClient().auth.getUser();
   if(userErr||!user)return false;
   const {data,error}=await getClient().rpc('claim_guest_quest',{p_run:pending.run_id,p_secret:pending.secret});
   if(error){console.error('Reward claim failed',error);$('home-auth-status').textContent='Your pending reward is waiting, but could not be claimed: '+error.message;return false;}
   localStorage.removeItem(key);
   if(window.state){ // top-level const in game.js is not a property of window
     window.state.outcome=data.outcome;
   }
   const item=window.EDITION?.outcomes?.[data.outcome]?.item;
   $('home-auth-status').textContent=data.reward_saved ? 'Your completed run and collectible were saved to your inventory!' : 'Your failed run was saved to your account.';
   return data;
 }
 async function renderInventory(body){
   const rewardKeys=['basic','medium','good','rare','legendary'];
   let unlocked=new Set();
   let warning='';
   try {
     await claimPending();
     const {data:{user}}=await getClient().auth.getUser();
     if(!user)warning='Sign in to see your saved items. This run will be claimable after email confirmation.';
     else{
       const {data,error}=await getClient().from('player_inventory').select('collectible_id').eq('player_id',user.id);
       if(error)throw error;
       const mapping={'autumn-pebble':'basic','autumn-seashell':'medium','autumn-cookies':'good','autumn-horse':'rare','autumn-puppies':'legendary'};
       unlocked=new Set((data||[]).map(row=>mapping[row.collectible_id]).filter(Boolean));
     }
   }catch(err){warning='Could not load saved inventory: '+err.message;}
   if(!body.isConnected||document.getElementById('hub-modal')?.dataset.panel!=='inventory')return;
   const inventory=rewardKeys.map(k=>{
     const item=EDITION.outcomes[k];const active=unlocked.has(k);
     return `<div class="inventory-tile ${active?'unlocked':'locked'}"><span class="inventory-tier">${item.tier}</span>${active?`<img src="assets/reward-${k}.png" alt="${item.item}">`:'<span class="inventory-lock">?</span>'}<span class="inventory-label">${active?item.item:'Not collected'}</span></div>`;
   }).join('');
   body.innerHTML=`<p>Saved rewards from your adventure account.</p><div class="inventory-grid">${inventory}</div><p class="mini-meta">${warning||'Items shown here are loaded from Supabase.'}</p>`;
 }
 function beginRetryCooldown(){
   if(retryRemaining()<=0)localStorage.setItem(cooldownKey,String(Date.now()+5*60*1000));
   refreshRetryUI();
 }
 function clearPendingFailure(){
   const p=getPending();if(p?.outcome==='perished')localStorage.removeItem(key);
 }
 function refreshRetryUI(){
   const remaining=retryRemaining();
   const clock=$('retry-clock');const button=$('retry-button');
   if(!clock)return;
   const secs=Math.ceil(remaining/1000);
   clock.textContent=`${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
   if(button){button.disabled=remaining>0 || !localStorage.getItem(cooldownKey);button.textContent=remaining>0?'WAIT TO RETRY':'TRY AGAIN';}
   const panel=$('retry-panel');
   if(panel && !remaining && localStorage.getItem(cooldownKey))panel.querySelector('p').textContent='Your five-minute cooldown is complete. You may try again!';
 }
 setInterval(refreshRetryUI,1000);
})();
