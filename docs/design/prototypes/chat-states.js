// Review controls simulate connectivity and authentication; no network is used.
const stateSelect=document.getElementById('chat-state');
const stateBanner=document.getElementById('state-banner');
const stateTitle=document.getElementById('state-title');
const stateCopy=document.getElementById('state-copy');
const stateAction=document.getElementById('state-action');
const loadingView=document.getElementById('loading-view');
const responseError=document.getElementById('response-error');
const sessionDialog=document.getElementById('session-dialog');
let recoveryTimer,authTimer;
const descriptions={
 loading:['Loading your conversation','Your messages will appear here in a moment.','Finish loading'],
 offline:['You’re offline','You can write a message. Reconnect to send it.','Reconnect'],
 reconnecting:['Reconnecting…','Your draft is still here.',''],
 expired:['Your session has expired','Sign in again to continue. Your draft will stay here.','Sign in']
};
function setChatState(next){
 if(busy)return;
 clearTimeout(recoveryTimer);
 appState=next;stateSelect.value=next;
 messages.hidden=next==='loading';loadingView.hidden=next!=='loading';
 scroll.querySelector('.date').hidden=next==='loading';
 scroll.setAttribute('aria-busy',String(next==='loading'));
 responseError.hidden=next!=='response-error';
 const description=descriptions[next];stateBanner.hidden=!description;
 if(description){stateTitle.textContent=description[0];stateCopy.textContent=description[1];stateAction.textContent=description[2];stateAction.hidden=!description[2];announcement.textContent=description[0]+'. '+description[1];}
 input.readOnly=next==='loading'||next==='expired';
 input.placeholder=next==='offline'?'Write a message…':next==='expired'?'Sign in to continue…':'Message Luni…';
 const starters=document.querySelector('.first-starters');if(starters)starters.hidden=next!=='ready'||Boolean(input.value.trim());
 resize();
 if(next==='reconnecting')recoveryTimer=setTimeout(()=>{setChatState('ready');announcement.textContent='Connected. You can send your message.';},1200);
 if(next==='response-error'){announcement.textContent='Luni couldn’t finish the reply. Retry the response.';bottom();}
}
stateSelect.onchange=()=>setChatState(stateSelect.value);
stateAction.onclick=()=>{
 if(appState==='offline')setChatState('reconnecting');
 else if(appState==='loading'){setChatState('ready');announcement.textContent='Conversation loaded.';}
 else if(appState==='expired'){document.getElementById('signin-feedback').textContent='';sessionDialog.showModal();}
};
document.getElementById('retry-response').onclick=()=>{
 if(busy)return;busy=true;responseError.hidden=true;typing.hidden=false;resize();announcement.textContent='Retrying Luni’s response.';
 recoveryTimer=setTimeout(()=>{typing.hidden=true;const response=createMessage('We can keep it quiet. What would feel good to talk about?',false);actions(response);busy=false;setChatState('ready');announcement.textContent='Luni’s response received.';input.focus();bottom();},1000);
};
document.getElementById('close-session').onclick=()=>sessionDialog.close();
function restoreSession(){
 const controls=sessionDialog.querySelectorAll('button,input');controls.forEach(control=>control.disabled=true);
 document.getElementById('signin-feedback').textContent='Signing in…';
 authTimer=setTimeout(()=>{controls.forEach(control=>control.disabled=false);sessionDialog.close();setChatState('ready');announcement.textContent='Signed in for this preview. Your draft is ready.';input.focus();},850);
}
document.getElementById('session-google').onclick=restoreSession;
document.getElementById('session-email-form').onsubmit=event=>{event.preventDefault();restoreSession();};
sessionDialog.addEventListener('close',()=>{clearTimeout(authTimer);sessionDialog.querySelectorAll('button,input').forEach(control=>control.disabled=false);});
setChatState('ready');
