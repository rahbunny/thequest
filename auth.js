/* Autumn Adventure v1.3: Supabase Auth plus verified pending reward recovery. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const config = window.ADVENTURE_SUPABASE_CONFIG;
  const api = window.supabase;
  let client = null;
  let mode = 'signup';
  let returnScreen = 'home';
  let user = null;
  let profile = null;
  let pendingSignupUsername = null;
  let checking = false;
  let ended = false;
  const auth = {
    authenticated: false,
    profileUser: null,
    openAccount,
  };
  window.adventureAuth = auth;

  function feedback(message, kind='') {
    const el=$('auth-feedback');
    el.textContent=message;
    el.className='auth-feedback '+kind;
  }
  function homeStatus(message){ $('home-auth-status').textContent=message; }
  function setMode(next) {
    mode=next;
    $('auth-mode-signup').classList.toggle('active',mode==='signup');
    $('auth-mode-login').classList.toggle('active',mode==='login');
    $('auth-title').textContent=mode==='signup'?'Create an account':'Welcome back, Traveler';
    $('auth-description').textContent=mode==='signup'
      ?'Sign up to keep your adventurer identity and claim the collectible from your completed quest.'
      :'Sign in with your registered email and password to use your adventurer identity.';
    $('username-label').classList.toggle('hidden',mode!=='signup');
    $('newsletter-label').classList.toggle('hidden',mode!=='signup');
    $('username').required=(mode==='signup');
    $('password').setAttribute('autocomplete',mode==='signup'?'new-password':'current-password');
    $('auth-submit').innerHTML=mode==='signup'?'CREATE ACCOUNT <span>→</span>':'SIGN IN <span>→</span>';
    feedback('');
  }
  function openAccount(next='signup',from='home') {
    returnScreen=from;
    setMode(next);
    $('auth-guest').classList.toggle('hidden',returnScreen!=='hub');
    showScreen('account');
  }
  function authReady(){
    if(!client) {feedback('Unable to load Supabase. Connect to the internet and refresh.','error'); return false;}
    return true;
  }
  async function ensureProfile(currentUser, preferredName) {
    // Profile inserts require an authenticated session. On signup with email
    // confirmation enabled, this will run on the player's first login.
    const {data: existing, error: readError} = await client.from('profiles')
      .select('id,username').eq('id',currentUser.id).maybeSingle();
    if(readError) throw readError;
    if(existing) return existing;
    const name=(preferredName || currentUser.user_metadata?.username ||
      `Traveler_${currentUser.id.slice(0,6)}`).trim();
    const {data: created, error: writeError} = await client.from('profiles')
      .insert({id:currentUser.id,username:name}).select('id,username').single();
    if(writeError) throw writeError;
    return created;
  }
  async function syncSession() {
    if(!client || checking) return;
    checking=true;
    try {
      const {data:{user:currentUser},error}=await client.auth.getUser();
      if(error && !/session missing/i.test(error.message)) throw error;
      user=currentUser || null;
      profile=null;
      if(user){
        try { profile=await ensureProfile(user,pendingSignupUsername); pendingSignupUsername=null; }
        catch(err){
          // A duplicate username or RLS issue should not prevent login.
          console.error('Profile setup:',err);
          homeStatus('Signed in, but profile setup needs attention: '+err.message);
        }
      }
      auth.authenticated=!!user;
      auth.profileUser=user ? {
        username:profile?.username || user.user_metadata?.username || 'Traveler',
        email:user.email,
        id:user.id
      } : null;
      if(user){
        const claimed=await window.adventureQuest?.claimPending();
        if(claimed){
          // Return players to their saved result after an email-confirmation redirect.
          if(!state.outcome){
            state.outcome=claimed.outcome;
            state.startedAt=Date.now();state.completedAt=Date.now();
            state.user=auth.profileUser;
            setTimeout(()=>{if($('screen-home').classList.contains('active'))openHub();},100);
          }
        }
        $('auth-header').textContent='· '+auth.profileUser.username;
        $('home-sign-in').classList.add('hidden');
        $('home-sign-out').classList.remove('hidden');
        if(profile && !claimed) homeStatus('Signed in as '+profile.username+'. Your completed quests can now be claimed and saved.');
      } else {
        $('auth-header').textContent='';
        $('home-sign-in').classList.remove('hidden');
        $('home-sign-out').classList.add('hidden');
        homeStatus('Already have an account? Sign in before your quest, or enter as a guest.');
      }
    } catch(err){ console.error(err);homeStatus('Account connection error: '+err.message); }
    finally{checking=false;}
  }
  async function submit(e){
    e.preventDefault();
    if(!authReady())return;
    const btn=$('auth-submit');
    const email=$('email').value.trim();
    const password=$('password').value;
    const username=$('username').value.trim();
    btn.disabled=true;
    feedback('Connecting to Supabase…');
    try {
      if(mode==='signup'){
        pendingSignupUsername=username;
        const options={data:{username}};
        if(location.protocol==='https:'){
          const base=location.origin+location.pathname;
          options.emailRedirectTo=base;
        }
        const {data,error}=await client.auth.signUp({email,password,options});
        if(error) throw error;
        $('password').value='';
        if(data.session){
          await syncSession();
          feedback('Account created and signed in. Your profile is now available.','success');
          setTimeout(()=>finishLogin(),550);
        }else{
          feedback('Check your email for the confirmation link. This browser has kept your completed quest receipt; after confirming, your reward will be claimed automatically.','success');
          $('auth-guest').classList.toggle('hidden',returnScreen!=='hub');
        }
      } else {
        const {error}=await client.auth.signInWithPassword({email,password});
        if(error) throw error;
        $('password').value='';
        await syncSession();
        feedback('Welcome back!','success');
        setTimeout(()=>finishLogin(),400);
      }
    } catch(error){
      console.error('Authentication error',error);
      feedback(error.message || 'Authentication failed. Try again.','error');
    } finally{btn.disabled=false;}
  }
  function finishLogin(){
    if(returnScreen==='hub' && state.outcome){
      if(auth.profileUser)state.user=auth.profileUser;
      openHub();
    } else showScreen('home');
  }
  async function resetPassword(){
    if(!authReady()) return;
    const email=$('email').value.trim();
    if(!email){ feedback('Enter your email address first.','error');return; }
    try{
      const redirectTo=location.protocol==='https:'?location.origin+location.pathname:undefined;
      const {error}=await client.auth.resetPasswordForEmail(email,redirectTo?{redirectTo}:{});
      if(error)throw error;
      feedback('If that account exists, a password-reset email has been sent. Check your inbox.','success');
    }catch(err){feedback(err.message,'error');}
  }
  async function signOut(){
    if(!authReady()) return;
    const {error}=await client.auth.signOut();
    if(error)homeStatus('Sign-out error: '+error.message);
    else{state.user=null;await syncSession();}
  }
  async function init(){
    if(!config?.url || !config?.publishableKey || typeof api?.createClient !== 'function'){
      homeStatus('Account service could not load. The story still works, but sign-in requires an internet connection.');
      return;
    }
    client=window.getAdventureClient();
    client.auth.onAuthStateChange(()=>{setTimeout(syncSession,0);});
    await syncSession();
    // Recovery emails lead back to the same page. User can sign in or reset.
    if(location.hash.includes('type=recovery'))openAccount('login','home');
  }
  $('account-form').addEventListener('submit',submit);
  $('auth-mode-signup').addEventListener('click',()=>setMode('signup'));
  $('auth-mode-login').addEventListener('click',()=>setMode('login'));
  $('home-sign-in').addEventListener('click',()=>openAccount('login','home'));
  $('home-sign-out').addEventListener('click',signOut);
  $('auth-back').addEventListener('click',()=>showScreen(returnScreen==='hub'&&state.outcome?'hub':'home'));
  $('auth-guest').addEventListener('click',()=>{
    state.user={username:'Guest'};
    openHub();
  });
  $('auth-forgot').addEventListener('click',resetPassword);
  init();
})();
