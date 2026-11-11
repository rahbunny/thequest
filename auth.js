/* v1.4: anonymous player first; verified email, then password, upgrades same user ID. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const client=window.getAdventureClient();
 const pendingConsent='thequest_consent_v14';
 let user=null, profile=null, view='upgrade', returnScreen='home', busy=false;
 const auth={authenticated:false,anonymous:false,profileUser:null,openAccount,ensureAdventurer,signOut};
 window.adventureAuth=auth;
 function feedback(s,kind=''){$('auth-feedback').textContent=s;$('auth-feedback').className='auth-feedback '+kind;}
 function status(s){$('home-auth-status').textContent=s;}
 function nameErrorNode(){
  let node=$('username-error');
  if(node)return node;
  const input=$('adventurer-name');
  if(!input)return null;
  node=document.createElement('p');
  node.id='username-error';
  node.setAttribute('role','alert');
  node.setAttribute('aria-live','polite');
  node.style.cssText='color:#ffd0a8;font-size:12px;line-height:1.6;margin:8px 0 0;';
  input.insertAdjacentElement('afterend',node);
  return node;
 }
 function usernameMessage(message,isError=false){
  const input=$('adventurer-name');
  const error=nameErrorNode();
  if(error)error.textContent=isError?message:'';
  if(input){
   input.setAttribute('aria-invalid',String(isError));
   if(isError)input.setAttribute('aria-describedby','username-error');
   else input.removeAttribute('aria-describedby');
  }
  if(!isError){const label=$('home-auth-status');if(label)label.textContent=message;}
 }
 async function checkUsernameAvailable(name){
  const {data,error}=await client.rpc('quest_username_available',{p_username:name});
  if(error)throw new Error('Could not check username availability: '+error.message);
  if(data!==true)throw inlineNameError('That username is already taken. Please choose another.');
 }
 function isUsernameTaken(error){
  const message=String(error?.message||'');
  return error?.code==='23505' || /duplicate key.*username|username.*(already exists|already taken|unique)|profiles_username_lower_unique/i.test(message);
 }
 function inlineNameError(message){
  usernameMessage(message,true);
  $('adventurer-name')?.focus();
  const error=new Error(message);
  error.inlineHandled=true;
  return error;
 }
 function setView(next){
  view=next;
  const upgrading=(next==='upgrade'),password=(next==='password'),login=(next==='login'),manage=(next==='manage');
  $('auth-mode-signup').classList.toggle('active',upgrading||password);
  $('auth-mode-login').classList.toggle('active',login);
  $('auth-mode-signup').textContent=password?'SET PASSWORD':'SAVE ADVENTURE';
  $('auth-title').textContent=upgrading?'Keep your adventurer forever':password?'Secure your adventure':login?'Welcome back, Traveler':'Newsletter preferences';
  $('auth-description').textContent=upgrading?'Verify your email to keep this username and inventory across devices. You’ll set your password after confirming.':
   password?'Email verified! Choose a password for this same adventurer account.':
   login?'Sign in to an existing adventurer account.':'You can opt in or unsubscribe at any time.';
  $('username-label').classList.add('hidden');
  $('email-label').classList.toggle('hidden',password||manage);
  $('password-label').classList.toggle('hidden',upgrading||manage);
  $('newsletter-label').classList.toggle('hidden',login||password);
  $('email').required=upgrading||login;
  $('password').required=password||login;
  $('auth-submit').textContent=upgrading?'SEND VERIFICATION EMAIL':password?'SET PASSWORD':login?'SIGN IN':'SAVE PREFERENCE';
  $('auth-forgot').classList.toggle('hidden',!login);
  $('auth-guest').classList.toggle('hidden',returnScreen!=='hub');
  feedback('');
 }
 function openAccount(which='upgrade',from='home'){
  returnScreen=from;
  if(which==='signup')which='upgrade';
  if(which==='upgrade' && user && !user.is_anonymous)which='manage';
  setView(which);showScreen('account');
  if(which==='manage')loadConsent();
 }
 async function ensureProfile(current,preferred){
  const {data:found,error:e}=await client.from('profiles').select('id,username').eq('id',current.id).maybeSingle();
  if(e)throw e;
  if(found)return found;
  // Returning email accounts must recover their SAME Supabase user ID, not create
  // a new anonymous account or inherit a name left in another browser session.
  if(!current.is_anonymous){
   const {data:recovered,error:recoverError}=await client.rpc('quest_restore_my_profile');
   if(recoverError)throw new Error('Could not restore the returning account profile: '+recoverError.message);
   if(!recovered?.id||recovered.id!==current.id)throw new Error('Account profile recovery did not match the signed-in player.');
   return {id:recovered.id,username:recovered.username};
  }
  const name=(preferred||current.user_metadata?.username||`Traveler_${current.id.slice(0,6)}`).trim();
  const {data,error}=await client.from('profiles').insert({id:current.id,username:name}).select('id,username').single();
  if(error)throw error;
  return data;
 }
 async function syncSession(){
  const {data:{user:u},error}=await client.auth.getUser();
  if(error && !/session missing/i.test(error.message))console.error('Session:',error);
  user=u||null;profile=null;
  if(user){
   try{profile=await ensureProfile(user,localStorage.getItem('thequest_name_v14'))}
   catch(e){console.error('Profile:',e);status('Profile issue: '+e.message);}
  }
  auth.authenticated=!!user;auth.anonymous=!!user?.is_anonymous;
  auth.profileUser=user?{id:user.id,username:profile?.username||user.user_metadata?.username||'Traveler',email:user.email||null}:null;
  $('auth-header').textContent=user?'· '+auth.profileUser.username:'';
  $('home-sign-in').classList.toggle('hidden',!!user && !user.is_anonymous);
  $('home-sign-out').classList.toggle('hidden',!user || !!user.is_anonymous);
  if(user){
   status(user.is_anonymous?`Welcome back, ${auth.profileUser.username}. Your adventure is remembered in this browser.`:`Welcome back, ${auth.profileUser.username}. Your account is saved.`);
   $('username-prompt').classList.add('hidden');
  }else{
   $('username-prompt').classList.remove('hidden');
   status('Choose a username to start—no email required.');
  }
  if(typeof state!=='undefined' && auth.profileUser)state.user=auth.profileUser;
  await window.adventureQuest.claimPending();
  const playerStatus=await window.adventureQuest.loadStatus().catch(e=>{console.error(e);return null;});
  if(playerStatus?.completed && typeof state!=='undefined' && !state.outcome){
    window.adventureQuest.restoreCompletedRun(playerStatus);
  }else if(playerStatus?.blocked && typeof state!=='undefined' && !state.outcome){
    window.adventureQuest.restoreFailedRun(playerStatus);
  }
  return user;
 }
 async function ensureAdventurer(){
  if(busy)throw new Error('Account setup is already in progress.');
  const name=$('adventurer-name').value.trim();
  const {data:{user:existing},error:sessionError}=await client.auth.getUser();
  if(sessionError && !/session missing|auth session missing/i.test(sessionError.message||''))throw sessionError;
  // Registered players or healthy anonymous profiles can continue as before.
  if(existing){
   if(!auth.profileUser)await syncSession();
   if(profile)return existing;
   // Recover an anonymous identity created by an older, interrupted attempt.
   if(!existing.is_anonymous)throw new Error('Your account profile could not be restored. Please sign out and sign in again, or contact the administrator.');
   if(!/^[A-Za-z0-9_ -]{2,20}$/.test(name))throw inlineNameError('Choose a name of 2–20 letters, numbers, spaces, underscores or hyphens.');
   try{
    await checkUsernameAvailable(name);
    profile=await ensureProfile(existing,name);
    await syncSession();
    return existing;
   }catch(err){
    if(isUsernameTaken(err))throw inlineNameError('That username is already taken. Please choose another.');
    throw err;
   }
  }
  if(!/^[A-Za-z0-9_ -]{2,20}$/.test(name))throw inlineNameError('Choose a name of 2–20 letters, numbers, spaces, underscores or hyphens.');
  busy=true;
  usernameMessage('Checking adventurer name…');
  let createdNewUser=false;
  try{
   // Check before creating a session: avoids the duplicate-name reset/glitch.
   await checkUsernameAvailable(name);
   const {data,error}=await client.auth.signInAnonymously({options:{data:{username:name}}});
   if(error)throw error;
   createdNewUser=true;
   // A unique constraint still protects against races between simultaneous players.
   profile=await ensureProfile(data.user,name);
   localStorage.setItem('thequest_name_v14',name);
   await syncSession();
   if(!profile)throw new Error('Could not finish creating your adventurer. Please try again.');
   usernameMessage(`Welcome, ${profile.username}!`);
   return data.user;
  }catch(err){
   if(createdNewUser){
    try{await client.auth.signOut()}catch(e){console.warn('Could not end unsuccessful anonymous signup:',e)}
    localStorage.removeItem('thequest_name_v14');
    user=null;profile=null;
    await syncSession().catch(console.error);
   }
   if(err?.inlineHandled)throw err;
   if(isUsernameTaken(err))throw inlineNameError('That username is already taken. Please choose another.');
   usernameMessage('Could not create your adventurer. '+(err?.message||'Please try again.'),true);
   const handled=new Error(err?.message||'Could not create your adventurer.');
   handled.inlineHandled=true;
   throw handled;
  }finally{busy=false;}
 }
 async function applyConsent(value){
  const {error}=await client.rpc('set_newsletter_preference',{p_subscribed:value});
  if(error)throw error;
  localStorage.removeItem(pendingConsent);
 }
 async function loadConsent(){
  if(!user||user.is_anonymous)return;
  const {data,error}=await client.from('newsletter_subscriptions').select('subscribed').eq('user_id',user.id).maybeSingle();
  if(!error)$('newsletter-optin').checked=!!data?.subscribed;
 }
 async function handleSubmit(e){
  e.preventDefault();const btn=$('auth-submit');btn.disabled=true;
  try{
   if(view==='upgrade'){
     if(!user||!user.is_anonymous)throw new Error('Finish an anonymous adventure first, or sign in to your account.');
     const email=$('email').value.trim();
     localStorage.setItem(pendingConsent,JSON.stringify({uid:user.id,value:$('newsletter-optin').checked}));
     const {error}=await client.auth.updateUser({email},{emailRedirectTo:location.origin+location.pathname});
     if(error)throw error;
     feedback('Verification email sent! Open it in this same browser. After confirming, come back to set your password.','success');
   }else if(view==='password'){
     if(!user||user.is_anonymous)throw new Error('Verify your email first.');
     const {error}=await client.auth.updateUser({password:$('password').value});
     if(error)throw error;
     $('password').value='';
     const pending=JSON.parse(localStorage.getItem(pendingConsent)||'null');
     if(pending?.uid===user.id)await applyConsent(!!pending.value);
     feedback('Your account and collectibles are now secured!','success');
     await syncSession();
     setTimeout(()=>finishLogin(),650);
   }else if(view==='login'){
     if(user?.is_anonymous && !confirm('Signing into a different account will NOT automatically transfer rewards from this anonymous account. Continue?'))return;
     const {error}=await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
     if(error)throw error;
     $('password').value='';await syncSession();
     feedback('Signed in successfully.','success');
     setTimeout(()=>finishLogin(),450);
   }else if(view==='manage'){
     await applyConsent($('newsletter-optin').checked);
     feedback('Newsletter preference saved.','success');
   }
  }catch(err){feedback(err.message||'Account request failed.','error');}
  finally{btn.disabled=false;}
 }
 function finishLogin(){
  if(returnScreen==='hub'&&state.outcome)openHub();else showScreen('home');
 }
 async function signOut(){
  if(user?.is_anonymous){alert('Anonymous progress may be lost if you sign out. Add email and password first.');return;}
  const {error}=await client.auth.signOut();
  if(error){status('Sign out failed: '+error.message);return;}
  await syncSession();showScreen('home');
 }
 async function resetPassword(){
  const email=$('email').value.trim();
  if(!email){feedback('Enter your email first.','error');return;}
  const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
  feedback(error?error.message:'Password reset email requested.','success');
 }
 async function init(){
  client.auth.onAuthStateChange(()=>setTimeout(()=>{
    if(busy)return;
    syncSession().then(()=>{
     if(user&&!user.is_anonymous&&localStorage.getItem(pendingConsent))openAccount('password','hub');
    }).catch(console.error);
  },0));
  await window.adventureQuest.loadActiveEdition();
  await syncSession();
  // On return from verified email change, preserve the anonymous user's ID.
  if(user && !user.is_anonymous){
   let pending=null;try{pending=JSON.parse(localStorage.getItem(pendingConsent)||'null')}catch{}
   if(pending?.uid===user.id){openAccount('password',state.outcome?'hub':'home');}
  }
  $('adventurer-name')?.addEventListener('input',()=>{
   usernameMessage('Choose a username to start—no email required.');
  });
  $('home-sign-in').addEventListener('click',()=>openAccount('login','home'));
  $('home-sign-out').addEventListener('click',signOut);
  $('auth-back').addEventListener('click',finishLogin);
  $('auth-guest').addEventListener('click',()=>{if(state.outcome)openHub();else showScreen('home')});
  $('hub-account-action').addEventListener('click',()=>openAccount(user?.is_anonymous?'upgrade':'manage','hub'));
  $('auth-mode-signup').addEventListener('click',()=>openAccount(user?.is_anonymous?'upgrade':'manage',returnScreen));
  $('auth-mode-login').addEventListener('click',()=>openAccount('login',returnScreen));
  $('auth-forgot').addEventListener('click',resetPassword);
  $('account-form').addEventListener('submit',handleSubmit);
 }
 init().catch(err=>status('Supabase account setup error: '+err.message));
})();
