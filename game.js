/*
  AUTUMN ADVENTURE — branching adventure prototype
  The monthly adventure is data-driven: edit EDITION.nodes and EDITION.outcomes.
  The hidden shadow encounter is rolled once per run (10% by default).
  Add ?shadow=1 to the URL to force the rare encounter for testing only.
*/
const EDITION = {
  title: 'The Autumn Castle',
  shadowRouteChance: 0.10,
  nodes: {
    start: {
      location: 'THE FOREST FORK', title: 'Three paths beneath the leaves',
      description: 'The autumn forest parts before you. One trail is dim and overgrown, another glows in the afternoon light. Behind you, the road home is already fading.',
      answers: [
        { label: 'Take the shaded path', next: 'shaded_path' },
        { label: 'Follow the bright path', next: 'bright_path' },
        { label: 'Turn around and leave', ending: 'perished' }
      ]
    },
    shaded_path: {
      location: 'THE SHADED PATH', title: 'A figure among the trees',
      description: 'The light thins beneath the branches. Ahead, a gnoll stands in the path. You could approach, ignore him, or hurry toward the brighter trail.',
      answers: [
        { label: 'Approach the tree gnoll', next: 'tree_gnoll' },
        { label: 'Ignore him and keep walking', ending: 'perished' },
        { label: 'Dart away toward the bright path', next: 'bright_path' }
      ]
    },
    tree_gnoll: {
      location: 'THE GNOLL’S CLEARING', title: 'The gnoll blocks your way',
      description: 'The gnoll watches you carefully. He offers a riddle, but there may be another way past him. (Some encounters are rarer than others.)',
      answers: [
        { label: 'Answer his riddle', next: 'riddle_success' },
        { label: 'Give the wrong answer', ending: 'perished' }
      ],
      shadowAnswer: { label: 'Fight the gnoll', next: 'puppy_cave', shadowOnly: true }
    },
    riddle_success: {
      location: 'BEYOND THE CLEARING', title: 'The gnoll lets you pass',
      description: 'Your answer satisfies the gnoll. He steps aside, revealing three possible destinations. But the cave is not what it seems...',
      answers: [
        { label: 'Head toward the castle', next: 'castle' },
        { label: 'Follow the sound of water', next: 'river' },
        { label: 'Enter the cave', next: 'empty_cave' }
      ]
    },
    empty_cave: {
      location: 'THE EMPTY CAVE', title: 'Something stirs in the dark',
      description: 'The cave is empty. Before you can turn back, another gnoll emerges from the shadows and crushes you beneath its weight.',
      answers: [], ending: 'perished'
    },
    puppy_cave: {
      location: 'THE HIDDEN CAVE', title: 'A tiny chorus of whimpers',
      description: 'You overcome the gnoll and discover a hidden den. A litter of puppies huddles together in the warm straw. What will you do?',
      answers: [
        { label: 'Rescue the puppies and take them with you', ending: 'legendary' },
        { label: 'Leave them and continue onward', next: 'after_puppies' },
        { label: 'Kill the puppies', ending: 'perished' }
      ]
    },
    after_puppies: {
      location: 'OUTSIDE THE CAVE', title: 'The path continues',
      description: 'You leave the puppies undisturbed and step back into the autumn air. The castle rises to one side, while the river winds through the trees on the other.',
      answers: [
        { label: 'Continue toward the castle', next: 'castle' },
        { label: 'Make your way to the river', next: 'river' }
      ]
    },
    bright_path: {
      location: 'THE BRIGHT PATH', title: 'Sunlight through the canopy',
      description: 'The trees thin and golden light spills across the trail. You hear a river nearby and spot a strange plant growing beside the path.',
      answers: [
        { label: 'Dip your toes in the river', next: 'river' },
        { label: 'Drink from the strange plant', ending: 'perished' },
        { label: 'Bathe and follow the path onward', next: 'bathing' }
      ]
    },
    bathing: {
      location: 'THE CLEARING', title: 'A place to catch your breath',
      description: 'Refreshed, you reach a clearing where the castle road branches away from a dark stretch of forest.',
      answers: [
        { label: 'Head toward the castle', next: 'castle' },
        { label: 'Wander back into the forest', ending: 'perished' }
      ]
    },
    river: {
      location: 'THE RIVERBANK', title: 'The river’s offerings',
      description: 'Clear water runs over smooth stones. A glimmer catches your eye beneath the surface. Nearby, a fish struggles and a turtle has become caught on a hook.',
      answers: [
        { label: 'Reach for the shiny golden pebble', ending: 'basic' },
        { label: 'Kick away the fish', ending: 'perished' },
        { label: 'Help the hooked turtle', ending: 'medium' }
      ]
    },
    castle: {
      location: 'THE CASTLE', title: 'The castle doors stand open',
      description: 'You arrive at the castle. From within, you hear footsteps, clattering dishes, and the restless sounds of horses in the stables. Where will you go?',
      answers: [
        { label: 'Sneak into the throne room', ending: 'perished' },
        { label: 'Scout the stables', ending: 'rare' },
        { label: 'Raid the kitchen', ending: 'good' }
      ]
    }
  },
  outcomes: {
    perished: { tier: 'BAD', title: 'You have perished', item: 'No item collected', icon: '☠', description: 'The forest has claimed another adventurer. Share the newsletter with a friend and return for another attempt after the cooldown.' },
    basic: { tier: 'BASIC', title: 'Simple but sufficient', item: 'Golden Pebble', icon: '◆', description: 'A little treasure, found by keeping your eyes open. Simple, but sufficient.' },
    medium: { tier: 'MEDIUM', title: 'Well-deserved', item: 'Seashell', icon: '🐚', description: 'A kind choice brought you a well-earned keepsake from the river.' },
    good: { tier: 'GOOD', title: 'Interesting!', item: 'Cookies', icon: '✦', description: 'A sweet reward for a bold little castle raid.' },
    rare: { tier: 'RARE', title: 'Unique!', item: 'Horse', icon: '♞', description: 'You found the stables and earned a remarkable companion.' },
    legendary: { tier: 'LEGENDARY', title: 'Holy smokes', item: 'Puppies', icon: '♥', description: 'The secret shadow route led you to a litter of puppies. You rescued them and uncovered the legendary reward!' }
  }
};

const state = { nodeId: 'start', decisions: 0, user: null, outcome: null, startedAt: 0, completedAt: 0, shadowRouteAvailable: false, history: [], squirrelVisible: false, squirrelSide: 'left' };
const $ = (id) => document.getElementById(id);
const screens = ['home','question','account','hub'];
function showScreen(name){ screens.forEach(s => $('screen-'+s).classList.toggle('active',s===name)); }
function transition(callback){
  const layer=$('transition');
  layer.classList.add('show');
  // Hold the lantern wipe for about one second longer than the first prototype.
  setTimeout(()=>{ callback(); setTimeout(()=>layer.classList.remove('show'),420); },2000);
}
function ensureTravelerSprite(){
  const traveler = $('traveler');
  if(!traveler) return null;
  if(!traveler.querySelector('.traveler-sprite')){
    const sprite=document.createElement('div');
    sprite.className='traveler-sprite';
    sprite.setAttribute('aria-hidden','true');
    traveler.appendChild(sprite);
  }
  return traveler;
}
async function startGame(){
  try{await window.adventureQuest.begin();}
  catch(err){alert('Cannot start the adventure right now: '+err.message);return;}
  state.nodeId='start'; state.decisions=0; state.startedAt=Date.now(); state.completedAt=0; state.outcome=null; state.history=[]; state.restoredCompletion=false;
  state.shadowRouteAvailable = window.adventureQuest.shadowEnabled;
  showNode();
}
function showNode(){
  ensureTravelerSprite();
  const node=EDITION.nodes[state.nodeId];
  if(!node){finish('perished');return;}
  $('question-kicker').textContent=`DECISION ${String(state.decisions+1).padStart(2,'0')}`;
  $('question-title').textContent=node.title; $('question-description').textContent=node.description;
  $('scene-location').textContent=node.location;
  // Scenes are chosen by story node, not by fixed question number.
  const sceneThemes = {
    start:'fork', shaded_path:'shaded', tree_gnoll:'shaded', riddle_success:'shaded',
    bright_path:'bright', bathing:'bright', river:'river',
    empty_cave:'cave', puppy_cave:'cave', after_puppies:'bright', castle:'castle'
  };
  const theme = sceneThemes[state.nodeId] || 'fork';
  $('scene-backdrop').className = 'scene-backdrop theme-' + theme;
  const forest = ['fork','shaded','bright'].includes(theme);
  const squirrel = $('scene-squirrel');
  state.squirrelVisible = forest && Math.random() < 0.55;
  state.squirrelSide = Math.random() < 0.5 ? 'left' : 'right';
  squirrel.classList.toggle('hidden', !state.squirrelVisible);
  squirrel.classList.toggle('from-right', state.squirrelVisible && state.squirrelSide === 'right');
  squirrel.classList.toggle('from-left', state.squirrelVisible && state.squirrelSide !== 'right');
  $('scene-gnoll').classList.toggle('hidden',!['shaded_path','tree_gnoll','riddle_success','empty_cave'].includes(state.nodeId));
  $('scene-gnoll').classList.toggle('is-roaring', ['tree_gnoll','empty_cave'].includes(state.nodeId));
  $('scene-puppies').classList.toggle('hidden',state.nodeId !== 'puppy_cave');
  const pacingNodes = ['start','bright_path','bathing','after_puppies','riddle_success'];
  $('traveler').classList.toggle('is-pacing', pacingNodes.includes(state.nodeId));
  $('traveler').classList.toggle('is-thinking', !pacingNodes.includes(state.nodeId));
  $('progress-label').textContent=`${state.decisions} DECISIONS`;
  $('progress-fill').style.width=`${Math.min(100, state.decisions*12)}%`;
  // Traveler remains visible in each scene; movement is handled by CSS.
  $('traveler').classList.remove('is-walking');
  const answers=$('answers'); answers.innerHTML='';
  const choices=[...node.answers];
  if(node.shadowAnswer && state.shadowRouteAvailable) choices.push(node.shadowAnswer);
  choices.forEach((answer,i)=>{
    const button=document.createElement('button');
    button.className='answer-button answer-enter';
    button.style.animationDelay=`${i*140}ms`;
    button.textContent=`${String.fromCharCode(65+i)}. ${answer.label}`;
    button.addEventListener('click',()=>chooseAnswer(answer));
    answers.appendChild(button);
  });
  if(node.ending){finish(node.ending);return;}
  showScreen('question');
  spawnRouteAmbience();
}
function spawnRouteAmbience(){
  const layer=$('ambient-layer');
  if(!layer) return;
  // A leaf drifts through most scenes; a squirrel is a less frequent surprise.
  const leafDelay=450+Math.random()*900;
  setTimeout(()=>{
    if(!$('screen-question').classList.contains('active')) return;
    const leaf=document.createElement('span');
    leaf.className='ambient-leaf';
    leaf.textContent=Math.random()>.5?'◆':'✦';
    leaf.style.left=(8+Math.random()*76)+'%';
    leaf.style.animationDuration=(4+Math.random()*2)+'s';
    layer.appendChild(leaf);
    setTimeout(()=>leaf.remove(),6500);
  },leafDelay);
  if(false){ // replaced with a dedicated pixel-art squirrel in forest scenes
    setTimeout(()=>{
      if(!$('screen-question').classList.contains('active')) return;
      const squirrel=document.createElement('span');
      squirrel.className='ambient-squirrel';
      squirrel.textContent='🐿️';
      layer.appendChild(squirrel);
      setTimeout(()=>squirrel.remove(),4700);
    },1800+Math.random()*2400);
  }
}
function chooseAnswer(answer){
  state.history.push({node:state.nodeId,choice:answer.label}); state.decisions++;
  if(answer.ending){finish(answer.ending);return;}
  if(!answer.next || !EDITION.nodes[answer.next]){finish('perished');return;}
  $('traveler').classList.add('is-walking');
  transition(()=>{state.nodeId=answer.next;showNode();});
}
async function finish(outcome){
  try {
    const verified=await window.adventureQuest.finish(state.history);
    if(verified!==outcome) throw new Error('Server-verified outcome did not match the story.');
  }catch(err){alert('Your result could not be verified and saved yet: '+err.message);return;}
  state.outcome=outcome; state.restoredCompletion=false; state.completedAt=Date.now();
  // A short interlude BEFORE the 5-second prize reveal.
  showScreen('hub');
  $('hub-main').classList.add('hidden');
  $('hub-modal').classList.add('hidden');
  $('fate-cutscene').classList.remove('hidden');
  clearTimeout(state.fateTimer); clearTimeout(state.accountPromptTimer);
  state.fateTimer=setTimeout(()=>{
    $('fate-cutscene').classList.add('hidden');
    showRewardPreview();
    state.accountPromptTimer=setTimeout(showAccount,5000);
  },2700);
}
function showRewardPreview(){
  const out=EDITION.outcomes[state.outcome];
  $('preview-art').src=`assets/reward-${state.outcome}.png`;
  $('preview-art').alt=out.item;
  $('preview-tier').textContent=out.tier;
  $('preview-title').textContent=out.title;
  $('preview-card').classList.remove('hidden');
}
function showAccount(){
  $('preview-card').classList.add('hidden');
  state.user=window.adventureAuth?.profileUser || state.user;
  if(window.adventureAuth?.anonymous && window.adventureAuth?.openAccount){
    window.adventureAuth.openAccount('upgrade','hub');return;
  }
  if(window.adventureAuth?.authenticated){openHub();return;}
  if(window.adventureAuth?.openAccount){window.adventureAuth.openAccount('login','hub');return;}
  showScreen('account');
}
// Authentication form handling is implemented in auth.js.
function openHub(){
  const out=EDITION.outcomes[state.outcome];
  $('hub-main').classList.remove('hidden');
  $('hub-modal').classList.remove('hidden');
  $('preview-card').classList.add('hidden');
  $('fate-cutscene').classList.add('hidden');
  $('hub-name').textContent=state.user?.username||'Traveler';
  $('hub-reward-name').textContent=out.item;
  $('hub-tier').textContent=out.tier;
  const held=$('hub-held-item');
  held.src=`assets/reward-${state.outcome}.png`;
  held.alt=state.outcome==='perished'?'No collectible earned':`Carrying ${out.item}`;
  held.classList.toggle('hidden',state.outcome==='perished');
  $('hub-modal-heading').textContent=out.title;
  $('hub-modal-body').innerHTML='';
  showHubPanel('reward');
  showScreen('hub');
  window.adventureQuest?.refreshRetryUI();
}
function showHubPanel(panel){
  const body=$('hub-modal-body');
  const out=EDITION.outcomes[state.outcome];
  $('hub-modal').classList.remove('hidden');
  $('hub-modal').dataset.panel=panel;
  const heading={reward:'QUEST COMPLETE',share:'SHARE YOUR STORY',inventory:'YOUR INVENTORY',guild:'THE GUILD HALL',map:'WORLD MAP'};
  $('hub-modal-heading').textContent=heading[panel]||'QUEST COMPLETE';
  if(panel==='reward'){
    body.innerHTML=`<div class="hub-reward-display"><img src="assets/reward-${state.outcome}.png" alt="${escapeHtml(out.item)}"><p class="result-tier">${escapeHtml(out.tier)}</p><h3>${escapeHtml(out.title)}</h3><p>${escapeHtml(out.description)}</p><p class="mini-meta">${state.restoredCompletion?'Autumn edition completed · Your reward is saved.':`${state.decisions} decisions · ${formatDuration(state.completedAt-state.startedAt)}`}</p></div>`;
  } else if(panel==='share'){
    const failed=state.outcome==='perished';
    body.innerHTML=`<p>Share your adventure and invite a friend to explore the forest.</p><button class="pixel-button" id="copy-share-link">COPY ADVENTURE LINK</button><p id="copy-share-status" class="mini-meta" aria-live="polite"></p>${failed?'<div id="retry-panel" class="retry-panel" aria-live="polite"><p>Copy the link to begin your five-minute retry cooldown.</p><strong id="retry-clock">05:00</strong><button id="retry-button" class="secondary-button" disabled>TRY AGAIN</button></div>':''}`;
    $('copy-share-link').addEventListener('click',async()=>{
      const url=location.origin+location.pathname;
      let copied=false;
      try{
        await navigator.clipboard.writeText(`I explored The Autumn Castle! ${url}`);
        copied=true;
      }catch(err){
        // Do not mark the link as copied when the clipboard write failed.
        $('copy-share-status').textContent=`Copy this link manually: ${url}. Use the button again after granting clipboard access.`;
      }
      if(!copied)return;
      $('copy-share-status').textContent='Adventure link copied!';
      if(failed){
        try{await window.adventureQuest.copyFailedLink();}
        catch(err){$('copy-share-status').textContent='Copied, but retry timer could not start: '+err.message;}
      }
    });
    if(failed){
      $('retry-button').addEventListener('click',async()=>{
        if(window.adventureQuest.retryRemaining()>0 || !window.adventureQuest.hasCopied())return;
        $('hub-modal').classList.add('hidden');
        showScreen('home');
        // The Supabase RPC authorizes a new attempt; the countdown display is not the authority.
        transition(startGame);
      });
      window.adventureQuest.refreshRetryUI();
    }
  } else if(panel==='inventory'){
    body.innerHTML='<p>Loading your saved collectibles…</p>';
    window.adventureQuest.renderInventory(body);
  } else if(panel==='guild'){
    body.innerHTML=`<p class="mini-meta">Loading live Guild members…</p>`;
    loadPublicGuild(body);
  } else if(panel==='map'){
    body.innerHTML=`<p>One adventure completed. More lands wait beyond the mist…</p><div class="world-map"><div class="map-region autumn"><span>🍂</span><strong>THE AUTUMN CASTLE</strong><small>DISCOVERED · EDITION 01</small></div><div class="map-region locked"><span>🔒</span><strong>THE FROSTBOUND NORTH</strong><small>COMING SOON</small></div><div class="map-region locked"><span>🔒</span><strong>THE UNKNOWN WILDS</strong><small>FUTURE QUEST</small></div><div class="map-region locked"><span>🔒</span><strong>UNMARKED TERRITORY</strong><small>FUTURE QUEST</small></div></div><p class="mini-meta">Future newsletter lands will unlock here; names and themes are placeholders.</p>`;
  }
}
// Guild data comes from an authenticated, read-only, moderated Supabase function.
// Fetch the top five first; each Load More action requests five additional records.
// The player rank is the rank for THEIR saved guild, regardless of the selected tab.
let guildRequestCounter=0;
const GUILD_PAGE_SIZE=5;
const GUILD_MAX_RESULTS=100; // The existing quest_public_guild RPC caps p_limit at 100.
async function loadPublicGuild(container, tier, limit=GUILD_PAGE_SIZE){
  const request=++guildRequestCounter;
  const knownTiers=['LEGENDARY','RARE','GOOD','MEDIUM','BASIC'];
  const selected=knownTiers.includes(tier)?tier:(knownTiers.includes(EDITION.outcomes[state.outcome]?.tier)?EDITION.outcomes[state.outcome].tier:'BASIC');
  const requestedLimit=Math.min(GUILD_MAX_RESULTS,Math.max(GUILD_PAGE_SIZE,limit));
  try{
    const client=window.getAdventureClient?.();
    if(!client)throw new Error('Supabase is not connected');
    const {data,error}=await client.rpc('quest_public_guild', {
      p_edition_id:'autumn-01',p_tier:selected,p_limit:requestedLimit
    });
    if(error)throw error;
    if(request!==guildRequestCounter || $('hub-modal').dataset.panel!=='guild')return;
    const guilds=Array.isArray(data?.guilds)?data.guilds:[];
    const members=Array.isArray(data?.members)?data.members:[];
    const ownTier=knownTiers.includes(data?.your_guild)?data.your_guild:null;
    const ownRank=Number(data?.your_rank)||null;
    const ownName=String(state.user?.username||'Traveler');
    const ownGuildMeta=guilds.find(g=>g.tier===ownTier);
    const selectedGuildMeta=guilds.find(g=>g.tier===selected);
    const selectedCount=Math.max(0,Number(selectedGuildMeta?.members)||0);
    const hasMore=members.length<selectedCount && members.length<GUILD_MAX_RESULTS;
    const guildButtons=guilds.map(g=>`<button type="button" class="guild-tier-button ${g.tier===selected?'selected':''}" data-guild-tier="${escapeHtml(g.tier)}" aria-pressed="${g.tier===selected}">${escapeHtml(g.tier)} <span>${Number(g.members)||0}</span></button>`).join('');
    const displayRows=members.map(m=>`<div class="guild-member-row ${m.is_you?'your-guild':''}" role="row">
      <span class="guild-rank">#${Number(m.rank)||'—'}</span>
      <span class="guild-name">${escapeHtml(m.username||'Adventurer')}${m.is_you?' <small>(you)</small>':''}</span>
      <span>${m.duration_ms==null?'—':formatDuration(m.duration_ms)}</span>
      <span>${Number(m.attempts)||0}</span>
    </div>`).join('');
    const rankText=ownTier&&ownRank?`You're #${ownRank} in the ${ownTier} Guild`:'Complete an adventure to earn a Guild rank.';
    container.innerHTML=`<div class="guild-your-standing"><div><strong>Your standing</strong><p>${escapeHtml(rankText)}</p></div>${ownTier&&ownRank?'<button type="button" id="guild-share-rank" class="secondary-button">SHARE MY RANK</button>':''}</div>
      <p id="guild-share-feedback" class="mini-meta" role="status" aria-live="polite"></p>
      <p class="mini-meta">Choose a Guild to view its fastest adventurers.</p>
      <div class="guild-tier-options">${guildButtons}</div>
      <div class="guild-member-grid" role="table" aria-label="${escapeHtml(selected)} Guild rankings">
        <div class="guild-member-row guild-member-header" role="row"><span>Rank</span><span>Adventurer</span><span>Time</span><span>Attempts</span></div>
        ${displayRows || '<p class="guild-empty">No visible members in this guild yet.</p>'}
      </div>
      <div class="guild-pagination"><p class="mini-meta">Showing ${members.length} of ${selectedCount} ${escapeHtml(selected)} Guild members.${selectedCount>GUILD_MAX_RESULTS?' First 100 ranks available.':''}</p>
        ${hasMore?'<button type="button" class="secondary-button" id="guild-load-more">LOAD MORE</button>':''}
      </div>`;
    container.querySelectorAll('[data-guild-tier]').forEach(button=>button.addEventListener('click',()=>{
      container.innerHTML='<p class="mini-meta">Loading Guild members…</p>';
      loadPublicGuild(container,button.dataset.guildTier,GUILD_PAGE_SIZE);
    }));
    container.querySelector('#guild-load-more')?.addEventListener('click',()=>{
      const button=container.querySelector('#guild-load-more');
      button.disabled=true;
      button.textContent='LOADING…';
      loadPublicGuild(container,selected,requestedLimit+GUILD_PAGE_SIZE);
    });
    container.querySelector('#guild-share-rank')?.addEventListener('click',async()=>{
      const feedback=container.querySelector('#guild-share-feedback');
      const url=location.origin+location.pathname;
      // Only share public information, never email addresses or account IDs.
      const shareText=`I'm #${ownRank} in the ${ownTier} Guild in The Autumn Castle! Join The Quest: ${url}`;
      try{
        await navigator.clipboard.writeText(shareText);
        feedback.textContent='Your Guild rank and adventure link were copied!';
      }catch(err){
        // A text field fallback lets the player copy manually when clipboard APIs are blocked.
        feedback.textContent='Copy your rank message below:';
        const field=document.createElement('textarea');
        field.className='guild-share-fallback';
        field.readOnly=true;
        field.value=shareText;
        field.setAttribute('aria-label','Guild rank message to copy');
        feedback.appendChild(field);
        field.focus();field.select();
      }
    });
  }catch(err){
    if(request!==guildRequestCounter || $('hub-modal').dataset.panel!=='guild')return;
    const message=String(err?.message||err);
    container.innerHTML=`<p>Could not load the Guild Hall.</p><p class="mini-meta">${escapeHtml(message)}</p><button type="button" class="secondary-button" id="guild-retry">RETRY</button>`;
    container.querySelector('#guild-retry')?.addEventListener('click',()=>loadPublicGuild(container,selected,requestedLimit));
  }
}

// v1.1.1: restore missing start button event registration.
$('start-btn').addEventListener('click', async () => {
  const button=$('start-btn');
  if(button.disabled)return;
  button.disabled=true;
  try {
    await window.adventureAuth.ensureAdventurer();
    const status=await window.adventureQuest.loadStatus();
    if(status?.completed){window.adventureQuest.restoreCompletedRun(status);return;}
    if(status?.blocked){window.adventureQuest.restoreFailedRun(status);return;}
    transition(startGame);
  }catch(err){alert('Cannot enter the forest: '+err.message);}
  finally{button.disabled=false;}
});
$('hub-close').addEventListener('click',()=> $('hub-modal').classList.add('hidden'));
$('hub-open-menu').addEventListener('click',()=>showHubPanel('reward'));
document.querySelectorAll('[data-hub-panel]').forEach(btn=>btn.addEventListener('click',()=>showHubPanel(btn.dataset.hubPanel)));
function formatDuration(ms){
  const s=Math.max(0,Math.floor(ms/1000));
  return `${Math.floor(s/60)}m ${String(s%60).padStart(2,'0')}s`;
}
function escapeHtml(str){return String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
