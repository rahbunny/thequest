/* Quest Studio editorial dashboard v0.1. The PUBLIC game does not load this file.
   No service-role key is ever present in the browser. All writes require admin RLS. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const cfg=window.ADVENTURE_SUPABASE_CONFIG;
if(!window.supabase?.createClient || !cfg){$('login-feedback').textContent='Supabase configuration missing. Copy the admin folder beside supabase-config.js.';return;}
const db=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const tiers=['basic','medium','good','rare','legendary'];
const bad='perished';
const DEFAULT_COPY={"opening":{"brand":"MONTHLY ADVENTURE","eyebrow":"A BRANCHING ADVENTURE","subtitle":"A quiet forest. A distant castle. Every choice changes the path ahead.","username_question":"What shall we call you, Traveler?","username_placeholder":"Your adventurer name","start_button":"ENTER THE FOREST","return_login":"EXISTING ACCOUNT? SIGN IN","opening_footer":"BEST EXPERIENCED WITH SOUND OFF AND CURIOSITY ON"},"questions":{"decision_label":"DECISION","decisions_label":"DECISIONS","choice_hint":"Choose carefully. The forest remembers.","lantern_transition":"THE LANTERN GUIDES THE WAY"},"ending":{"cutscene_line_one":"Interesting choices, Traveler…","cutscene_line_two":"Let's see what you got.","reward_eyebrow":"YOUR REWARD","account_prompt":"Save your adventure","account_help":"Keep this reward across future quests by securing your account with email and password."},"hub":{"welcome_eyebrow":"YOUR JOURNEY CONTINUES","welcome_prefix":"Well traveled,","reward_prefix":"You return from the forest with","result_button":"OPEN RESULT","share_button":"SHARE","inventory_button":"INVENTORY","guild_button":"GUILD","map_button":"MAP","result_heading":"QUEST COMPLETE"},"sharing":{"share_heading":"SHARE YOUR STORY","share_description":"Share your adventure and invite a friend to explore the forest.","copy_button":"COPY ADVENTURE LINK","copy_success":"Adventure link copied!","retry_instructions":"Copy the link to begin your five-minute retry cooldown.","retry_button":"TRY AGAIN"},"inventory":{"heading":"YOUR INVENTORY","empty_state":"Your adventure has only just begun. Earn a reward to fill your inventory."},"guild":{"heading":"THE GUILD HALL","your_standing":"Your standing","share_rank":"SHARE MY RANK","load_more":"LOAD MORE","empty_guild":"No visible members in this guild yet."},"map":{"heading":"WORLD MAP","intro":"One adventure completed. More lands wait beyond the mist…","unlocked_label":"DISCOVERED · EDITION 01","locked_label":"COMING SOON","future_one":"THE FROSTBOUND NORTH","future_two":"THE UNKNOWN WILDS","future_three":"UNMARKED TERRITORY"}};
const AUTUMN_SCENES={start:'scene-forest-fork.png',shaded_path:'scene-forest-shaded.png',tree_gnoll:'scene-forest-shaded.png',riddle_success:'scene-forest-shaded.png',bright_path:'scene-forest-bright.png',bathing:'scene-forest-bright.png',after_puppies:'scene-forest-bright.png',empty_cave:'scene-cave.png',puppy_cave:'scene-cave.png',river:'scene-river.png',castle:'scene-castle.png'};
const AUTUMN_PALETTE={ink:'#f5e9cf',muted:'#b8aa91',panel:'#222832',gold:'#e8b86c',moss:'#687c55',line:'#56606a',night:'#171b22',rust:'#c46b3c'};
const DEFAULT_APPEARANCE={squirrel_chance:0.55,shadow_fight_chance:0.10,squirrel_behavior:'peek',shadow_roll:'once_per_run'};
const DEFAULT_CAST={
 traveler:{name:'The Traveler',image:'assets/traveler-idle.png',action_image:'assets/traveler-walk1.png',chance:1,behavior:'pacing'},
 gnoll:{name:'Forest Gnoll',image:'assets/gnoll-idle.png',action_image:'assets/gnoll-roar.png',chance:1,behavior:'idle'},
 squirrel:{name:'Forest Squirrel',image:'assets/squirrel-peek.png',action_image:'assets/squirrel-hop.png',chance:.55,behavior:'peek'},
 puppies:{name:'Puppies',image:'assets/reward-legendary.png',action_image:'',chance:1,behavior:'bounce'}
};
function ensureCast(){
 config.cast ||= {};
 if(edition==='autumn-01')enrichMissing(config.cast,DEFAULT_CAST);
 for(const [id,ch] of Object.entries(config.cast)){
  ch.name ||= id; ch.image ||= config.theme?.characters?.[id]||'';
  ch.chance = Number.isFinite(Number(ch.chance))?Math.max(0,Math.min(1,Number(ch.chance))):1;
  ch.behavior ||= 'idle';
 }
 for(const node of Object.values(config.nodes||{})){
  node.presentation ||= {};
  const pr=node.presentation;
  if(!Array.isArray(pr.characters))pr.characters=[
   ...(pr.show_gnoll?['gnoll']:[]),
   ...(pr.squirrel_eligible?['squirrel']:[]),
   ...(pr.show_puppies?['puppies']:[])
  ];
 }
}
const PALETTE_LABELS={ink:'Main text',muted:'Muted text',panel:'Question panel',gold:'Gold highlight',moss:'Moss green',line:'Borders',night:'Night backdrop',rust:'Rust / buttons'};
function assetSrc(path){if(!path)return '';const value=String(path);return value.startsWith('assets/')?'../'+value:value;}
function enrichMissing(target,defaults){let changed=false;if(!target||typeof target!=='object')return false;for(const [key,value] of Object.entries(defaults)){if(target[key]===undefined||target[key]===null){target[key]=clone(value);changed=true;}else if(value&&typeof value==='object'&&!Array.isArray(value)&&typeof target[key]==='object'&&!Array.isArray(target[key]))changed=enrichMissing(target[key],value)||changed;}return changed;}
async function autumnDefaults(){const response=await fetch('autumn-template.json',{cache:'no-store'});if(!response.ok)throw Error('Autumn template could not be loaded');return response.json();}
async function hydrateAutumnDraft(existing){const defaults=await autumnDefaults();if(!existing||!Object.keys(existing).length)return {config:defaults,filled:true};const copy=clone(existing);const filled=enrichMissing(copy,defaults);return {config:copy,filled};}
const COPY_SECTIONS={opening:'Entrance screen',questions:'Questions & transitions',ending:'Prize reveal & registration',hub:'End-of-quest hub',sharing:'Sharing & retry',inventory:'Inventory',guild:'Guild Hall',map:'World map'};
const copyText=(section,key)=>config?.ui_text?.[section]?.[key] ?? DEFAULT_COPY[section]?.[key] ?? '';
function ensureCopy(){config.ui_text ||= clone(DEFAULT_COPY); for(const [section,fields] of Object.entries(DEFAULT_COPY)){config.ui_text[section] ||= {};for(const [key,value] of Object.entries(fields)){if(typeof config.ui_text[section][key]!=='string')config.ui_text[section][key]=value;}}}

const endings=[bad,...tiers];
const clone=obj=>JSON.parse(JSON.stringify(obj));
const blank=(title='The Winter Quest',season='winter')=>({title,season,start_node:'start',theme:{accent:'#7fa6bd',background:'#192a39',map_label:title,description:'A new adventure begins…',scenes:{},characters:{},palette:clone(AUTUMN_PALETTE)},appearance:clone(DEFAULT_APPEARANCE),nodes:{start:{location:'THE CROSSROADS',title:'A new road ahead',description:'The world opens before you. What will you do?',choices:[{label:'Continue onward',target:'!basic',shadow:false}]}},outcomes:Object.fromEntries(endings.map(k=>[k,{tier:k.toUpperCase(),title:k==='perished'?'You have perished':`Your ${k} reward`,description:'Write this ending here.',item:k==='perished'?'No item collected':k}])),rewards:Object.fromEntries(tiers.map(k=>[k,{name:k[0].toUpperCase()+k.slice(1)+' prize',tier:k.toUpperCase(),image:''}])),map:{label:title,description:'A mysterious region waits to be explored.',locked:true},ui_text:clone(DEFAULT_COPY),cast:{traveler:clone(DEFAULT_CAST.traveler)}});
let config=null,edition='',entries=[],tab='overview',nodeKey='',dirty=false,user=null;
const say=(message,error=false)=>{const el=$('save-state');el.textContent=message;el.style.color=error?'#ffaaa0':'#d3c7ad';};
const cleanId=s=>s.toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mark(){dirty=true;say('● Unsaved changes');}
function on(id,evt,fn){$(id).addEventListener(evt,fn);}
const dataField=(id,fn,event='input')=>on(id,event,()=>{if(!config)return;fn($(id).value);mark();});
async function requireAdmin(){const {data:{user:u}}=await db.auth.getUser();if(!u)return false;const {data,error}=await db.rpc('is_quest_admin');if(error)throw error;if(data!==true)return false;user=u;return true;}
function authView(ok,message=''){$('signin').classList.toggle('hidden',ok);$('workspace').classList.toggle('hidden',!ok);$('logout').classList.toggle('hidden',!ok);$('identity').textContent=ok?user.email:'Not signed in';$('login-feedback').textContent=message;}
async function login(e){e.preventDefault();$('login-feedback').textContent='Signing in…';const {error}=await db.auth.signInWithPassword({email:$('login-email').value.trim(),password:$('login-password').value});if(error){$('login-feedback').textContent=error.message;return;}if(!await requireAdmin()){await db.auth.signOut();authView(false,'This account is not authorized. Add its verified user ID using the SQL instructions.');return;}authView(true);await loadEditions();}
async function init(){on('login-form','submit',e=>login(e).catch(err=>$('login-feedback').textContent=err.message));on('logout','click',async()=>{await db.auth.signOut();authView(false,'Signed out');});try{if(await requireAdmin()){authView(true);await loadEditions();}else authView(false);}catch(err){authView(false,'Studio setup error: '+err.message);}}
async function loadEditions(preferred){const {data,error}=await db.from('editions').select('id,title,season,status').order('id');if(error)throw error;entries=data||[];const el=$('edition-picker');el.innerHTML='';for(const e of entries){const o=document.createElement('option');o.value=e.id;o.textContent=`${e.title} (${e.status})`;el.append(o);}edition=preferred&&entries.some(e=>e.id===preferred)?preferred:el.value;if(edition)await loadEdition(edition);else{config=null;say('Create an edition to begin.');}}
async function loadEdition(id){if(dirty&&!confirm('Discard unsaved edits?')){$('edition-picker').value=edition;return;}edition=id;const {data,error}=await db.from('quest_studio_editions').select('*').eq('edition_id',edition).maybeSingle();if(error)throw error;const current=data?.draft_config&&Object.keys(data.draft_config).length?clone(data.draft_config):null;
let filled=false;
if(edition==='autumn-01'){const result=await hydrateAutumnDraft(current);config=result.config;filled=result.filled;}
else config=current||blank(entries.find(x=>x.id===edition)?.title||edition,entries.find(x=>x.id===edition)?.season||'winter');
config.theme ||= {};config.theme.scenes ||= {};config.theme.characters ||= {};config.theme.palette ||= clone(AUTUMN_PALETTE);
config.appearance ||= clone(DEFAULT_APPEARANCE);
ensureCopy();ensureCast();dirty=filled;nodeKey=Object.keys(config.nodes)[0]||'';
say(filled?'● Missing Autumn defaults loaded — click Save Draft to keep them':data?.approved_at?'✓ Draft loaded (reviewed snapshot available). Checking live publication…':'Draft loaded — not yet approved');render();
 // The draft status is NOT the publishing status. Check live publication separately.
 try {
  const {data:live,error:liveError}=await db.rpc('quest_get_live_edition');
  if(liveError)throw liveError;
  if(!live || live.edition_id!==edition){
    say(`● ${config.title} is NOT published. ${data?.approved_at?'Approved draft is ready. Click Publish Edition, then check the result here.':'Approve content before publishing.'}`);
  } else {
    say(`✓ LIVE: ${config.title} — release ${live.release_version} published ${new Date(live.published_at).toLocaleString()}`);
  }
 } catch(e) {
  say(`Draft loaded. Live publication check failed: ${e.message}`,true);
 }
}
function render(){if(!config)return;const t=config.theme||={};$('edition-title').value=config.title||'';$('edition-season').value=config.season||'other';$('accent-color').value=/^#[0-9a-fA-F]{6}$/.test(t.accent)?t.accent:'#c46b3c';$('background-color').value=/^#[0-9a-fA-F]{6}$/.test(t.background)?t.background:'#171b22';$('edition-description').value=t.description||'';renderNodePickers();renderNode();renderCopy();renderRewards();renderArt();renderMap();renderPalette();renderAppearance();renderCast();if(tab==='guild'){loadGuild();loadRunHistory();}if(tab==='preview')renderPreviewOpening();}
function renderNodePickers(){for(const id of ['node-picker','start-node','art-scene']){const select=$(id),previous=id==='node-picker'?nodeKey:id==='start-node'?config.start_node:select.value;select.innerHTML='';for(const [key,node] of Object.entries(config.nodes)){const o=document.createElement('option');o.value=key;o.textContent=`${node.title||key} (${key})`;select.append(o);}select.value=previous;if(!select.value&&select.options.length)select.selectedIndex=0;}nodeKey=$('node-picker').value;}
function renderNode(){const node=config.nodes[nodeKey];if(!node)return;$('node-location').value=node.location||'';$('node-title').value=node.title||'';$('node-description').value=node.description||'';$('node-ending').value=node.ending||'';const p=node.presentation||={};$('node-background').value=p.background||config.theme.scenes?.[nodeKey]||'';
$('node-motion').value=p.traveler_motion||'thinking';
$('node-gnoll').checked=!!p.show_gnoll;$('node-roar').checked=!!p.gnoll_roar;
$('node-squirrel').checked=!!p.squirrel_eligible;$('node-puppies').checked=!!p.show_puppies;renderSceneCast(p);
const list=$('choice-editor');list.innerHTML='';(node.choices||[]).forEach((choice,i)=>{const wrap=document.createElement('div');wrap.className='choice';const dests=[...Object.keys(config.nodes).map(key=>[key,config.nodes[key].title||key]),...endings.map(k=>['!'+k,k==='perished'?'BAD — Perished':k.toUpperCase()+' reward'])];wrap.innerHTML=`<div class="choice-head"><strong>Choice ${i+1}</strong><button class="danger small" data-remove="${i}">Remove</button></div><label>Answer text<input class="choice-text" value="${safe(choice.label)}" maxlength="240"></label><label>Next destination<select class="choice-target">${dests.map(([key,label])=>`<option value="${safe(key)}" ${choice.target===key?'selected':''}>${safe(label)} (${safe(key)})</option>`).join('')}</select></label><label class="inline"><input type="checkbox" class="choice-shadow" ${choice.shadow?'checked':''}> Hidden / shadow choice</label>`;wrap.querySelector('.choice-text').addEventListener('input',e=>{choice.label=e.target.value;mark();});wrap.querySelector('.choice-target').addEventListener('change',e=>{choice.target=e.target.value;mark();});wrap.querySelector('.choice-shadow').addEventListener('change',e=>{choice.shadow=e.target.checked;mark();});wrap.querySelector('[data-remove]').addEventListener('click',()=>{node.choices.splice(i,1);mark();renderNode();});list.append(wrap);});}
function renderCopy(){
 ensureCopy();const root=$('copy-editor');root.innerHTML='';
 for(const [section,fields] of Object.entries(DEFAULT_COPY)){
  const group=document.createElement('section');group.className='copy-group';
  const heading=document.createElement('h3');heading.textContent=COPY_SECTIONS[section];group.append(heading);
  const grid=document.createElement('div');grid.className='copy-field-grid';group.append(grid);
  for(const [key,defaultValue] of Object.entries(fields)){
   const field=document.createElement('label');
   const name=document.createElement('span');name.textContent=key.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());field.append(name);
   const value=config.ui_text[section][key];
   const input=document.createElement(value.length>90||defaultValue.length>90?'textarea':'input');
   if(input.tagName==='TEXTAREA')input.rows=3;
   input.value=value;input.dataset.copyKey=section+'.'+key;
   input.addEventListener('input',()=>{config.ui_text[section][key]=input.value;mark();});
   field.append(input);grid.append(field);
  }
  root.append(group);
 }
}
function renderRewards(){const container=$('reward-editor');container.innerHTML='';for(const k of endings){const out=config.outcomes[k] ||= {tier:k.toUpperCase(),title:'',description:'',item:''};const reward=k===bad?null:(config.rewards[k] ||= {tier:k.toUpperCase(),name:out.item,image:''});const el=document.createElement('article');el.className='reward';el.innerHTML=`<h3>${k===bad?'☠ BAD':safe(k.toUpperCase())}</h3>${reward&&reward.image?`<img src="${safe(assetSrc(reward.image))}" alt="">`:''}<label>Result heading<input class="result-title" value="${safe(out.title)}"></label><label>Ending description<textarea class="result-description" rows="3">${safe(out.description)}</textarea></label>${reward?`<label>Collectible name<input class="reward-name" value="${safe(reward.name)}"></label><label>Collectible image URL<input class="reward-image" value="${safe(reward.image||'')}"></label>`:'<p>No prize awarded for BAD.</p>'}`;el.querySelector('.result-title').addEventListener('input',e=>{out.title=e.target.value;mark();});el.querySelector('.result-description').addEventListener('input',e=>{out.description=e.target.value;mark();});if(reward){el.querySelector('.reward-name').addEventListener('input',e=>{reward.name=e.target.value;out.item=e.target.value;mark();});el.querySelector('.reward-image').addEventListener('input',e=>{reward.image=e.target.value;mark();});}container.append(el);}}
function artCard(name,url){const item=document.createElement('div');item.className='art-item';const h=document.createElement('strong');h.textContent=name;item.append(h);if(url){const img=document.createElement('img');img.src=url;img.alt=name;item.append(img);const c=document.createElement('code');c.textContent=url;item.append(c);}else{const p=document.createElement('p');p.textContent='No image assigned';item.append(p);}return item;}
function renderArt(){const scenes=$('art-gallery'),characters=$('character-gallery'),editor=$('character-editor');scenes.innerHTML='';characters.innerHTML='';editor.innerHTML='';
for(const key of Object.keys(config.nodes))scenes.append(artCard(key,assetSrc(config.nodes[key].presentation?.background||config.theme.scenes?.[key])));
for(const [key,url] of Object.entries(config.theme.characters||{})){
 characters.append(artCard(key,assetSrc(url)));
 const label=document.createElement('label');label.textContent=key.replace(/_/g,' ');const input=document.createElement('input');input.value=url||'';input.placeholder='assets/character.png or URL';input.addEventListener('input',()=>{config.theme.characters[key]=input.value;mark();});label.append(input);editor.append(label);
 }
}
function renderCast(){
 const root=$('cast-editor');if(!root)return;root.innerHTML='';
 for(const [id,ch] of Object.entries(config.cast||{})){
  const card=document.createElement('div');card.className='cast-card';
  card.innerHTML=`<div class="row"><strong>${safe(ch.name||id)}</strong><code>${safe(id)}</code></div>
    <label>Display name<input data-key="name" value="${safe(ch.name||id)}"></label>
    <label>Sprite image URL<input data-key="image" value="${safe(ch.image||'')}"></label>
    <label>Alternate / action image URL<input data-key="action_image" value="${safe(ch.action_image||'')}"></label>
    <div class="two"><label>Appearance chance (%)<input type="number" min="0" max="100" step="1" data-key="chance" value="${Math.round(100*(ch.chance??1))}"></label>
    <label>Behavior<select data-key="behavior">${['idle','pacing','peek','bounce','menace'].map(mode=>`<option value="${mode}" ${mode===ch.behavior?'selected':''}>${mode}</option>`).join('')}</select></label></div>
    <p class="hint">Chance applies when this character is assigned to a scene. Hidden choice probability is configured separately in Edition Details.</p>`;
  for(const e of card.querySelectorAll('[data-key]'))e.addEventListener(e.tagName==='SELECT'?'change':'input',()=>{
   const k=e.dataset.key;ch[k]=k==='chance'?Math.max(0,Math.min(1,Number(e.value)/100)):e.value;if(id==='squirrel'&&k==='chance'){config.appearance.squirrel_chance=ch.chance;$('squirrel-chance').value=Math.round(ch.chance*100);}mark();
  });
  root.append(card);
 }
 renderSceneCast(config.nodes[nodeKey]?.presentation||{});
}
function renderSceneCast(p){
 const root=$('node-cast');if(!root)return;root.innerHTML='';
 p.characters ||= [];
 for(const [id,ch] of Object.entries(config.cast||{})){
  if(id==='traveler')continue;
  const label=document.createElement('label');label.className='inline scene-check';
  const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=p.characters.includes(id);
  checkbox.addEventListener('change',()=>{p.characters=checkbox.checked?[...new Set([...p.characters,id])]:p.characters.filter(x=>x!==id);mark();});
  label.append(checkbox,document.createTextNode(' '+(ch.name||id)));root.append(label);
 }
}
function addCastCharacter(){
 const name=prompt('Name your creature (e.g. Winter Ogre):','Winter Ogre');if(!name)return;
 const id=cleanId(name);if(!id||config.cast[id])return alert('That creature already exists.');
 config.cast[id]={name:name.trim(),image:'',action_image:'',chance:1,behavior:'idle'};
 mark();renderCast();
}
function removeCastCharacter(){
 const keys=Object.keys(config.cast).filter(x=>x!=='traveler');
 const id=prompt('Enter the character ID to remove: '+keys.join(', '));if(!id)return;
 if(!keys.includes(id))return alert('Choose an existing non-Traveler character ID.');
 if(!confirm('Remove '+id+' from this edition and all its scenes?'))return;
 delete config.cast[id];for(const n of Object.values(config.nodes))n.presentation.characters=(n.presentation.characters||[]).filter(x=>x!==id);
 mark();renderCast();renderNode();
}
function renderPalette(){const container=$('palette-editor');container.innerHTML='';config.theme.palette ||= clone(AUTUMN_PALETTE);
for(const [key,label] of Object.entries(PALETTE_LABELS)){const field=document.createElement('label');field.textContent=label;const input=document.createElement('input');input.type='color';input.value=/^#[0-9a-fA-F]{6}$/.test(config.theme.palette[key])?config.theme.palette[key]:AUTUMN_PALETTE[key];input.addEventListener('input',()=>{config.theme.palette[key]=input.value;mark();});field.append(input);container.append(field);}}
function renderAppearance(){config.appearance ||= clone(DEFAULT_APPEARANCE);$('squirrel-chance').value=Math.round((config.appearance.squirrel_chance??0.55)*100);$('shadow-chance').value=Math.round((config.appearance.shadow_fight_chance??0.1)*100);}

function renderMap(){$('map-label').value=config.map?.label||'';$('map-description').value=config.map?.description||'';$('map-locked').value=String(config.map?.locked!==false);}
function switchTab(next){tab=next;document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===next));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('hidden',p.id!=='panel-'+next));if(next==='guild'){loadGuild();loadRunHistory();loadIncompleteUsers();}if(next==='preview')renderPreviewOpening();}
function verifyDraft(){if(!config.title?.trim())throw Error('An edition title is required.');if(!Object.keys(config.nodes).length||!config.nodes[config.start_node])throw Error('Select an existing opening scene.');for(const [key,node] of Object.entries(config.nodes)){if(!node.title?.trim())throw Error(`Scene ${key} needs a title.`);if(!node.ending && !(node.choices||[]).length)throw Error(`Scene ${key} has no choices or ending.`);for(const c of node.choices||[]){if(!c.label?.trim())throw Error(`A choice in ${key} has no text.`);if(!c.target.startsWith('!')&&!config.nodes[c.target])throw Error(`Broken link: ${key} → ${c.target}.`);if(c.target.startsWith('!')&&!endings.includes(c.target.slice(1)))throw Error(`Unknown ending: ${c.target}.`);}}}
async function saveDraft(approve=false){verifyDraft();say(approve?'Approving content…':'Saving draft…');const {error}=await db.rpc('quest_studio_save_draft',{p_edition_id:edition,p_draft_config:config,p_approve:approve});if(error)throw error;dirty=false;say(approve?'✓ Snapshot approved. You can now publish it.':'✓ Draft saved. Approve changes again before publishing.');}
async function deleteUnusedEdition(){
 if(!edition) return;
 if(dirty) throw Error('Save or discard your unsaved changes before deleting a month.');
 const target=edition;
 const meta=entries.find(x=>x.id===target);
 if(meta?.status==='active') throw Error('You cannot delete the live edition.');
 const typed=prompt(`PERMANENTLY DELETE the unused edition ${meta?.title||target} (${target})?\nOnly never-published months with no player activity can be removed.\nType the exact edition ID to confirm:`);
 if(typed!==target){say('Month deletion cancelled.');return;}
 const {data,error}=await db.rpc('quest_studio_delete_unused_edition',{p_edition_id:target});
 if(error)throw error;
 dirty=false;
 say(`Deleted unused month ${data?.edition_id||target}.`);
 await loadEditions();
}
async function loadIncompleteUsers(){
 const tbody=$('incomplete-user-list'), status=$('incomplete-user-status');
 if(!tbody||!status)return;
 status.textContent='Loading…';tbody.replaceChildren();
 const {data,error}=await db.rpc('quest_studio_list_incomplete_users',{p_limit:100});
 if(error){status.textContent='Unable to load: '+error.message;return;}
 const users=Array.isArray(data)?data:[];
 status.textContent=`${users.length} eligible anonymous username-only accounts (no completed runs).`;
 for(const u of users){
  const tr=document.createElement('tr');
  const name=document.createElement('td');name.textContent=u.username||'(no username)';
  const date=document.createElement('td');date.textContent=u.created_at?new Date(u.created_at).toLocaleString():'—';
  const type=document.createElement('td');type.textContent='Anonymous · no rewards';
  const actions=document.createElement('td');
  const del=document.createElement('button');del.type='button';del.className='danger small';del.textContent='Delete';
  del.addEventListener('click',async()=>{
   const confirmation=prompt(`Delete anonymous player ${u.username}?\nThis permanently deletes the account and frees this username.\nType DELETE to confirm:`);
   if(confirmation!=='DELETE')return;
   del.disabled=true;
   const {error}=await db.rpc('quest_studio_delete_incomplete_user',{p_user_id:u.user_id});
   if(error){alert('Could not delete this player: '+error.message);del.disabled=false;return;}
   await loadIncompleteUsers();
  });
  actions.append(del);tr.append(name,date,type,actions);tbody.append(tr);
 }
 if(!users.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=4;td.textContent='No eligible unused accounts.';tr.append(td);tbody.append(tr);}
}
async function createEdition(){const proposed=prompt('Edition slug, e.g. winter-02 (letters, numbers, dashes):','winter-02');if(!proposed)return;const id=cleanId(proposed);if(!/^[a-z][a-z0-9_-]{2,49}$/.test(id))return alert('Use 3–50 characters, starting with a letter.');const title=prompt('Title for this newsletter edition:','The Winter Keep')?.trim();if(!title)return;const season=prompt('Season (winter, spring, summer, autumn, other):','winter')?.trim().toLowerCase()||'other';const {error}=await db.from('editions').insert({id,title,season,status:'locked'});if(error)throw error;await loadEditions(id);config=blank(title,season);if(confirm('Start this new edition with a copy of Autumn’s story layout? Choose Cancel to start with a blank adventure.')){const seed=await autumnDefaults();config=seed;config.title=title;config.season=season;config.map={...seed.map,label:title,locked:true};}ensureCopy();ensureCast();mark();render();}
async function importAutumn(){if(!edition)return;if(!confirm('Replace the CURRENT STUDIO DRAFT with the original Autumn story template? This does not change the live game.'))return;const response=await fetch('autumn-template.json',{cache:'no-store'});if(!response.ok)throw Error('Autumn template not found');config=await response.json();ensureCopy();ensureCast();const meta=entries.find(x=>x.id===edition);if(edition!=='autumn-01'&&meta){config.title=meta.title;config.season=meta.season;config.map={...config.map,label:meta.title,locked:true};}nodeKey='start';mark();render();}
async function upload(character){if(!user)return;const file=$('art-file').files[0];if(!file)throw Error('Choose an image first.');if(file.size>5*1024*1024)throw Error('Maximum 5 MB.');if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw Error('Unsupported image format.');const safeFile=file.name.replace(/[^a-zA-Z0-9._-]/g,'-');const key=(character?'characters/':'scenes/')+edition+'/'+Date.now()+'-'+safeFile;const {error}=await db.storage.from('quest-art').upload(key,file,{contentType:file.type,upsert:false});if(error)throw error;const {data}=db.storage.from('quest-art').getPublicUrl(key);if(character){const label=prompt('Character key (e.g. traveler, troll, owl):',file.name.split('.')[0]);if(!label)return;const charKey=cleanId(label);config.theme.characters[charKey]=data.publicUrl;config.cast ||= {};config.cast[charKey] ||= {name:label,image:'',action_image:'',chance:1,behavior:'idle'};config.cast[charKey].image=data.publicUrl;renderCast();}else {const key=$('art-scene').value;config.theme.scenes[key]=data.publicUrl;config.nodes[key].presentation ||= {};config.nodes[key].presentation.background=data.publicUrl;}mark();renderArt();$('upload-feedback').textContent='Uploaded! Save the draft to preserve its assignment.';}
// Edition run history: admin-only RPCs; no direct client table deletes.
async function loadRunHistory(){
 const status=$('guild-history-status'), list=$('guild-history-list');
 if(!edition || !status || !list)return;
 status.textContent='Loading individual runs…';
 list.innerHTML='<tr><td colspan="6">Loading…</td></tr>';
 const selectedEdition=edition;
 const {data,error}=await db.rpc('quest_studio_list_runs',{p_edition_id:selectedEdition,p_limit:150});
 if(edition!==selectedEdition)return;
 if(error){status.textContent='Could not load run history: '+error.message;list.innerHTML='';return;}
 const runs=Array.isArray(data)?data:[];
 status.textContent=`${runs.length} most recent saved attempts · Failed attempts can be deleted. Winning runs are protected.`;
 list.innerHTML='';
 for(const run of runs){
  const row=document.createElement('tr');
  const success=run.outcome!=='perished';
  const finished=run.finished_at?new Date(run.finished_at).toLocaleString():'—';
  const time=run.duration_ms==null?'—':(Number(run.duration_ms)/1000).toFixed(1)+' s';
  row.innerHTML=`<td>${safe(run.username||'Unnamed player')}</td><td>${safe(String(run.outcome||'').toUpperCase())}</td><td>${safe(finished)}</td><td>${safe(time)}</td><td><code title="${safe(run.attempt_id)}">${safe(String(run.attempt_id).slice(0,8))}…</code></td><td>${success?'<span title="Winning records are protected to preserve inventory">Protected · Hide above</span>':'<button class="danger small" type="button">Delete run</button>'}</td>`;
  const button=row.querySelector('button');
  if(button)button.addEventListener('click',async()=>{
    const playerName=run.username||'this player';
    if(!confirm(`Permanently delete the FAILED run for ${playerName} (${finished}) from attempt history?\n\nThis will reduce recorded attempt counts. It will NOT remove retry/cooldown receipts or earned prizes.`))return;
    const response=prompt('To permanently delete this failed run, type DELETE:');
    if(response!=='DELETE')return;
    button.disabled=true;button.textContent='Deleting…';status.textContent='Deleting run…';
    const {error:deleteError}=await db.rpc('quest_studio_delete_failed_run',{p_attempt_id:run.attempt_id});
    if(deleteError){status.textContent='Delete failed: '+deleteError.message;button.disabled=false;button.textContent='Delete run';return;}
    await Promise.all([loadRunHistory(),loadGuild()]);
    status.textContent='Failed run deleted from attempt history. Cooldown records remain intact.';
  });
  list.append(row);
 }
 if(!runs.length)list.innerHTML='<tr><td colspan="6">No saved attempts found for this edition.</td></tr>';
}
async function loadGuild(){if(!edition)return;$('guild-list').innerHTML='<tr><td colspan="6">Loading…</td></tr>';const {data,error}=await db.rpc('quest_studio_guild',{p_edition_id:edition});if(error){$('guild-list').innerHTML='<tr><td colspan="6">'+safe(error.message)+'</td></tr>';return;}const counts={};for(const row of data)counts[row.outcome]=(counts[row.outcome]||0)+1;$('guild-summary').textContent=`${data.length} winning players · `+tiers.map(t=>`${t.toUpperCase()}: ${counts[t]||0}`).join(' · ');const list=$('guild-list');list.innerHTML='';for(const player of data){const tr=document.createElement('tr');tr.innerHTML=`<td>${safe(player.username)}</td><td>${safe(player.outcome.toUpperCase())}</td><td>${player.duration_ms==null?'—':(player.duration_ms/1000).toFixed(1)+' s'}</td><td>${player.attempts}</td><td>${player.hidden?'Hidden':'Visible'}</td><td><button class="small ${player.hidden?'secondary':'danger'}">${player.hidden?'Restore':'Hide'}</button></td>`;tr.querySelector('button').addEventListener('click',async()=>{const reason=player.hidden?'':prompt('Moderation note (internal only):','Inappropriate username or suspicious entry');if(reason===null)return;const {error:e}=await db.from('quest_guild_moderation').upsert({edition_id:edition,player_id:player.player_id,hidden:!player.hidden,note:reason,updated_at:new Date().toISOString()},{onConflict:'edition_id,player_id'});if(e)alert(e.message);else loadGuild();});list.append(tr);}if(!data.length)list.innerHTML='<tr><td colspan="6">No successful attempts recorded for this edition yet.</td></tr>';}
function previewImage(nodeKey){
 const node=config.nodes[nodeKey]||{},p=node.presentation||{};
 const backdrop=p.background||config.theme.scenes?.[nodeKey]||(edition==='autumn-01'&&AUTUMN_SCENES[nodeKey]?'assets/'+AUTUMN_SCENES[nodeKey]:'');
 const stage=$('preview-image');stage.style.backgroundImage=backdrop?`url("${assetSrc(backdrop).replace(/["\\]/g,'')}")`:'';
 stage.style.backgroundColor=config.theme.background||'#26383d';
 const traveler=config.cast?.traveler?.image||config.theme.characters?.traveler|| (edition==='autumn-01'?'assets/traveler-idle.png':null);
 const img=$('preview-character');img.hidden=!traveler;if(traveler)img.src=assetSrc(traveler);
 for(const id of ['preview-gnoll','preview-squirrel','preview-puppies'])$(id).hidden=true;
 const previous=$('preview-cast');if(previous)previous.remove();
 const layer=document.createElement('div');layer.id='preview-cast';layer.className='preview-cast';stage.append(layer);
 const castKeys=p.characters||[];
 castKeys.forEach((key,i)=>{
   const character=config.cast?.[key];if(!character?.image)return;
   const art=document.createElement('img');art.src=assetSrc(character.image);
   art.alt=character.name||key;art.title=`${character.name||key}: ${Math.round(100*(character.chance??1))}% appearance chance`;
   art.className='preview-cast-character'+(character.behavior==='peek'?' preview-cast-small':'');
   art.style.right=(12+i*19)+'%';layer.append(art);
 });
}
function previewClear(){
 $('preview-ending').innerHTML='';$('preview-choices').innerHTML='';
 $('preview-image').style.backgroundImage='';$('preview-cast')?.remove();$('preview-character').hidden=true;for(const id of ['preview-gnoll','preview-squirrel','preview-puppies'])$(id).hidden=true;
}
function renderPreviewOpening(){
 previewClear();$('preview-stage-label').textContent='OPENING · DRAFT';$('preview-location').textContent=copyText('opening','eyebrow');
 $('preview-title').textContent=config.title;
 $('preview-description').textContent=copyText('opening','subtitle')+'  '+copyText('opening','username_question');
 const b=document.createElement('button');b.textContent=copyText('opening','start_button');b.addEventListener('click',()=>renderPreview(config.start_node));$('preview-choices').append(b);
 previewImage(config.start_node);
}
function renderPreview(key){
 const node=config.nodes[key];if(!node){$('preview-title').textContent='No scene selected';return;}
 previewClear();$('preview-stage-label').textContent='QUESTION · DRAFT';
 $('preview-location').textContent=node.location||'';$('preview-title').textContent=node.title||key;$('preview-description').textContent=node.description||'';
 previewImage(key);
 let choices=(node.choices||[]).filter(c=>!c.shadow||$('preview-show-shadow').checked);
 if(node.ending){renderPreviewEnding(node.ending);return;}
 for(const c of choices){const b=document.createElement('button');b.textContent=c.label+(c.shadow?' ✦ Hidden route':'');b.addEventListener('click',()=>{if(c.target.startsWith('!'))renderPreviewEnding(c.target.slice(1));else renderPreview(c.target);});$('preview-choices').append(b);}
 const hint=document.createElement('p');hint.className='preview-hint';hint.textContent=copyText('questions','choice_hint')+((node.presentation?.squirrel_eligible)?` · Squirrel chance: ${Math.round((config.appearance?.squirrel_chance??.55)*100)}%`:'')+((node.choices||[]).some(c=>c.shadow)?` · Shadow fight chance: ${Math.round((config.appearance?.shadow_fight_chance??.1)*100)}% per run`:'');$('preview-ending').append(hint);
}
function renderPreviewEnding(tier){
 previewClear();$('preview-stage-label').textContent='RESULT · DRAFT';$('preview-location').textContent=copyText('ending','reward_eyebrow');
 const out=config.outcomes[tier]||{};const reward=config.rewards[tier];
 $('preview-title').textContent=out.title||tier.toUpperCase();
 $('preview-description').textContent=copyText('ending','cutscene_line_one')+' '+copyText('ending','cutscene_line_two')+' — '+(out.description||'');
 const img=reward?.image;
 if(img){const art=document.createElement('img');art.src=assetSrc(img);art.alt=reward.name||tier;art.className='preview-reward-art';$('preview-ending').append(art);}
 const p=document.createElement('p');p.textContent=reward?.name||out.item||'No reward';$('preview-ending').append(p);
 const account=document.createElement('p');account.className='preview-hint';account.textContent=copyText('ending','account_prompt')+' · '+copyText('ending','account_help');$('preview-ending').append(account);
 const button=document.createElement('button');button.textContent='View ending hub preview';button.addEventListener('click',()=>renderPreviewHub(tier));$('preview-choices').append(button);
}
function renderPreviewHub(tier='basic'){
 previewClear();$('preview-stage-label').textContent='HUB · DRAFT';$('preview-location').textContent=copyText('hub','welcome_eyebrow');
 $('preview-title').textContent=copyText('hub','welcome_prefix')+' Traveler';
 const reward=config.rewards[tier]?.name||config.outcomes[tier]?.item||'your reward';
 $('preview-description').textContent=copyText('hub','reward_prefix')+' '+reward;
 const buttons=[['share_button','sharing'],['inventory_button','inventory'],['guild_button','guild'],['map_button','map']];
 for(const [key,section] of buttons){const b=document.createElement('button');b.textContent=copyText('hub',key);b.addEventListener('click',()=>{
   const e=$('preview-ending');e.innerHTML='';const h=document.createElement('h4');h.textContent=copyText(section,'heading')||copyText(section,'share_heading');e.append(h);
   const p=document.createElement('p');p.textContent=section==='sharing'?copyText('sharing','share_description')+' '+copyText('sharing','retry_instructions'):section==='map'?copyText('map','intro'):section==='inventory'?copyText('inventory','empty_state'):copyText('guild','your_standing')+' · '+copyText('guild','load_more');e.append(p);
  });$('preview-choices').append(b);}
}
function inspectDraft(){
 const messages=[];
 try{verifyDraft();messages.push('✓ Scene references and basic fields are valid.');}catch(e){messages.push('✕ '+e.message);}
 const visited=new Set(), queue=[config.start_node], exits=new Set();
 while(queue.length){const key=queue.shift();if(visited.has(key)||!config.nodes[key])continue;visited.add(key);const node=config.nodes[key];
 if(node.ending)exits.add(node.ending);
 for(const c of node.choices||[]){if(typeof c.target!=='string'){messages.push('✕ Missing destination in '+key);continue;}if(c.target.startsWith('!'))exits.add(c.target.slice(1));else queue.push(c.target);}}
 const unreachable=Object.keys(config.nodes).filter(k=>!visited.has(k));
 if(unreachable.length)messages.push('⚠ Unreachable scenes: '+unreachable.join(', '));else messages.push('✓ All '+visited.size+' scenes are reachable (including hidden choices).');
 for(const tier of endings)if(!exits.has(tier))messages.push('⚠ No reachable '+tier.toUpperCase()+' ending.');
 for(const [key,node] of Object.entries(config.nodes))if(!node.ending&&!(node.choices||[]).length)messages.push('✕ '+key+' has no choices or ending.');
 messages.push('ℹ The server also checks each published choice against an immutable run snapshot. Confirm auth, rewards, and cooldown on the test site before public promotion.');
 const box=$('preview-review');box.innerHTML='';for(const m of messages){const el=document.createElement('p');el.textContent=m;box.append(el);}
}
async function publishEdition(){
 if(dirty)throw Error('Save and Approve Content before publishing.');
 const id=edition;
 const acknowledgement=prompt(`PUBLIC RELEASE: ${config.title} (${id}).\nThis will replace the active quest for new players and enable REAL prizes. Type PUBLISH to confirm:`);
 if(acknowledgement!=='PUBLISH'){
  say('Publication cancelled. No public changes were made.');
  return;
 }
 $('publish-edition').disabled=true;
 say('Publishing approved edition to Supabase…');
 try{
  const {data,error,status}=await db.rpc('quest_publish_edition',{p_edition_id:id});
  if(error)throw Error(`Publish failed (${error.code||status||'unknown'}): ${error.message}${error.details?' — '+error.details:''}${error.hint?' — '+error.hint:''}`);
  if(!data?.release_version)throw Error('Publishing returned no release number. Publication is not verified.');
  // Verify that the public read endpoint actually returns this edition and release.
  const {data:live,error:readError}=await db.rpc('quest_get_live_edition');
  if(readError)throw Error(`Publish response received, but verification failed: ${readError.message}`);
  if(live?.edition_id!==id || Number(live.release_version)!==Number(data.release_version)){
    throw Error(`Publish response received, but public endpoint does not show ${id} release ${data.release_version}. Do NOT consider it published.`);
  }
  dirty=false;
  say(`✓ VERIFIED LIVE: ${data.title} — release ${data.release_version}, ${new Date(live.published_at).toLocaleString()}.`);
  // Intentionally do not reload the draft, which previously erased this message.
 }catch(e){
  console.error('Quest Studio publish failed',e);
  say('✕ '+e.message,true);
  alert('Quest Studio could not verify publication.\n\n'+e.message+'\n\nYour approved draft is unchanged.');
 }finally{$('publish-edition').disabled=false;}
}
function bind(){on('delete-unused-edition','click',()=>deleteUnusedEdition().catch(err=>say('Cannot delete month: '+err.message,true)));on('reload-incomplete-users','click',()=>loadIncompleteUsers());on('edition-picker','change',()=>loadEdition($('edition-picker').value).catch(err=>alert(err.message)));on('new-edition','click',()=>createEdition().catch(err=>alert(err.message)));on('import-autumn','click',()=>importAutumn().catch(err=>alert(err.message)));on('save-draft','click',()=>saveDraft().catch(err=>say(err.message,true)));on('publish-edition','click',()=>publishEdition().catch(err=>say(err.message,true)));on('preview-full-game','click',()=>{if(dirty)return alert('Save Draft first, so the full-page preview can load your changes.');window.open('../?preview_edition='+encodeURIComponent(edition),'_blank','noopener');});on('add-cast','click',addCastCharacter);on('remove-cast','click',removeCastCharacter);on('approve-draft','click',()=>{if(confirm('Approve this editorial snapshot? Review before clicking Publish to make it live.'))saveDraft(true).catch(err=>say(err.message,true));});document.querySelectorAll('.tabs button').forEach(el=>el.addEventListener('click',()=>switchTab(el.dataset.tab)));dataField('edition-title',v=>config.title=v);dataField('edition-season',v=>config.season=v,'change');dataField('accent-color',v=>config.theme.accent=v);dataField('background-color',v=>config.theme.background=v);dataField('edition-description',v=>config.theme.description=v);dataField('squirrel-chance',v=>{if(v==='')return;const n=Number(v);if(n>=0&&n<=100){config.appearance.squirrel_chance=n/100;if(config.cast?.squirrel)config.cast.squirrel.chance=n/100;}});dataField('shadow-chance',v=>{if(v==='')return;const n=Number(v);if(n>=0&&n<=100)config.appearance.shadow_fight_chance=n/100;});dataField('start-node',v=>config.start_node=v,'change');on('node-picker','change',()=>{nodeKey=$('node-picker').value;renderNode();});dataField('node-location',v=>config.nodes[nodeKey].location=v);dataField('node-title',v=>config.nodes[nodeKey].title=v);dataField('node-description',v=>config.nodes[nodeKey].description=v);dataField('node-ending',v=>{if(v)config.nodes[nodeKey].ending=v;else delete config.nodes[nodeKey].ending;},'change');dataField('node-background',v=>{const node=config.nodes[nodeKey];node.presentation ||= {};node.presentation.background=v;config.theme.scenes[nodeKey]=v;});dataField('node-motion',v=>{config.nodes[nodeKey].presentation ||= {};config.nodes[nodeKey].presentation.traveler_motion=v;},'change');
for(const [id,key] of [['node-gnoll','show_gnoll'],['node-roar','gnoll_roar'],['node-squirrel','squirrel_eligible'],['node-puppies','show_puppies']])on(id,'change',()=>{config.nodes[nodeKey].presentation ||= {};const p=config.nodes[nodeKey].presentation;p[key]=$(id).checked;
 const creature={show_gnoll:'gnoll',squirrel_eligible:'squirrel',show_puppies:'puppies'}[key];
 if(creature){p.characters ||= [];p.characters=p[key]?[...new Set([...p.characters,creature])]:p.characters.filter(x=>x!==creature);}
 renderSceneCast(p);mark();});on('add-choice','click',()=>{config.nodes[nodeKey].choices ||= [];config.nodes[nodeKey].choices.push({label:'New choice',target:'!perished',shadow:false});mark();renderNode();});on('add-node','click',()=>{const name=prompt('New scene ID (e.g. frozen_bridge):','new_scene');if(!name)return;const id=cleanId(name);if(!id||config.nodes[id])return alert('Invalid or existing scene ID.');config.nodes[id]={location:id.toUpperCase(),title:'New scene',description:'Write the next part of your story.',presentation:{background:'',traveler_motion:'thinking',show_gnoll:false,gnoll_roar:false,squirrel_eligible:false,show_puppies:false,characters:[]},choices:[{label:'Continue',target:'!perished',shadow:false}]};nodeKey=id;mark();renderNodePickers();renderNode();});on('remove-node','click',()=>{if(Object.keys(config.nodes).length<2)return alert('Keep at least one scene.');if(!confirm('Delete this scene? Check other choices for links to it.'))return;delete config.nodes[nodeKey];nodeKey=Object.keys(config.nodes)[0];if(!config.nodes[config.start_node])config.start_node=nodeKey;mark();renderNodePickers();renderNode();});dataField('map-label',v=>{config.map ||= {};config.map.label=v;});dataField('map-description',v=>{config.map ||= {};config.map.description=v;});dataField('map-locked',v=>{config.map ||= {};config.map.locked=v==='true';},'change');on('upload-art','click',()=>upload(false).catch(err=>$('upload-feedback').textContent=err.message));on('upload-character','click',()=>upload(true).catch(err=>$('upload-feedback').textContent=err.message));on('reload-guild','click',()=>{loadGuild();loadRunHistory();});on('preview-restart','click',()=>renderPreview(config.start_node));on('preview-opening','click',renderPreviewOpening);on('preview-hub','click',()=>renderPreviewHub());on('review-draft','click',inspectDraft);on('preview-show-shadow','change',()=>renderPreview(config.start_node));window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});}
bind();init();
})();
