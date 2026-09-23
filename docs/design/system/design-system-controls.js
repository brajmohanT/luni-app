(() => {
 const icon = path => `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
 const chevron = icon('m9 5 7 7-7 7');
 document.getElementById('shared-controls').innerHTML = ['light','dark'].map(mode => `<article class="theme library controls ${mode}" aria-label="${mode} shared controls">
 <div class="theme-label"><h3>${mode==='light'?'Light':'Dark'} controls</h3><span>Shared library</span></div>
 <section class="specimen"><h4>Buttons</h4><div class="control-row"><button class="ui-button primary sample-save">Save changes</button><button class="ui-button sample-secondary">Secondary</button><button class="ui-button danger open-reset">Reset demo</button><button class="ui-button icon-only open-appearance" aria-label="Choose appearance">${icon('M12 3v18M3 12h18')}</button><button class="ui-button" disabled>Unavailable</button><button class="ui-button" disabled aria-busy="true">Saving…</button></div><p class="spec-note">Use one primary action per task. Keep destructive actions separate. Tab through controls to inspect focus.</p><p class="button-feedback live-status" role="status"></p></section>
 <section class="specimen"><h4>Inputs</h4><label class="field">Default<input placeholder="Your name" autocomplete="off"><span class="field-help">Tap or tab into this field to see focus.</span></label><label class="field">Filled<input value="Alex" autocomplete="off"></label><label class="field">Error<input aria-invalid="true" aria-describedby="${mode}-field-error" value="" placeholder="Your name"><span id="${mode}-field-error" class="field-help error">Enter a name to continue.</span></label><label class="field">Disabled<input value="Unavailable" disabled></label></section>
 <section class="specimen"><h4>Settings screen</h4><p class="spec-note">Proposed screen composition. Changes stay in this page and reset on reload.</p>
 <div class="settings-screen"><div class="settings-heading"><h4>Settings</h4><span class="spec-note">Preview</span></div>
 <h5>Profile</h5><button class="setting-row open-profile"><span>Your name</span><span class="setting-value"><span class="profile-value">Alex</span>${chevron}</span></button>
 <h5>Preferences</h5><button class="setting-row open-appearance"><span>Appearance</span><span class="setting-value"><span class="appearance-value">${mode==='light'?'Light':'Dark'}</span>${chevron}</span></button>
 <div class="setting-row"><span id="${mode}-reminders-label">Reminders<small>Allow a reminder to check in.</small></span><label class="switch"><input class="reminder-toggle" type="checkbox" role="switch" aria-labelledby="${mode}-reminders-label"><span class="switch-track"></span></label></div>
 <div class="setting-row"><span id="${mode}-haptics-label">Haptics<small>Feedback when you use controls.</small></span><label class="switch"><input class="haptics-toggle" type="checkbox" role="switch" checked aria-labelledby="${mode}-haptics-label"><span class="switch-track"></span></label></div>
 <h5>About this preview</h5><details><summary>What these settings do</summary><p>Try editing your name, choosing an appearance, and switching preferences. This preview does not schedule reminders or change your device settings.</p></details>
 <button class="setting-row open-reset" style="color:var(--danger)"><span>Reset preview settings</span>${chevron}</button><p class="settings-status" role="status">Your preferences apply only to this preview.</p></div></section>
 <section class="specimen"><h4>Sheets & confirmation</h4><div class="control-row"><button class="ui-button open-appearance">Open bottom sheet</button><button class="ui-button open-reset">Open confirmation</button></div><p class="spec-note">Use a sheet for short choices. Confirm destructive actions with their scope and consequence. Escape or Cancel dismisses without changes.</p></section>
 <dialog class="ui-dialog sheet" data-kind="appearance" aria-labelledby="${mode}-appearance-title"><h4 id="${mode}-appearance-title">Appearance</h4><p>Choose the theme for this settings preview.</p><form method="dialog"><label class="choice"><input type="radio" name="appearance" value="Light">Light</label><label class="choice"><input type="radio" name="appearance" value="Dark">Dark</label><div class="dialog-actions"><button class="ui-button" value="cancel" autofocus>Cancel</button><button class="ui-button primary" value="apply">Apply</button></div></form></dialog>
 <dialog class="ui-dialog" data-kind="profile" aria-labelledby="${mode}-profile-title"><h4 id="${mode}-profile-title">Your name</h4><form class="profile-form" novalidate><label class="field">Name<input class="profile-input" maxlength="40" autocomplete="off" aria-describedby="${mode}-profile-error"></label><p id="${mode}-profile-error" class="field-help error" role="alert"></p><div class="dialog-actions"><button class="ui-button cancel-profile" type="button">Cancel</button><button class="ui-button primary" type="submit">Save</button></div></form></dialog>
 <dialog class="ui-dialog" data-kind="reset" aria-labelledby="${mode}-reset-title" aria-describedby="${mode}-reset-description"><h4 id="${mode}-reset-title">Reset preview settings?</h4><p id="${mode}-reset-description">This resets the sample name, theme, and switches in this preview. It does not change your account or conversations.</p><form method="dialog"><div class="dialog-actions"><button class="ui-button" value="cancel" autofocus>Cancel</button><button class="ui-button danger" value="reset">Reset preview</button></div></form></dialog>
 </article>`).join('');
 document.querySelectorAll('.controls').forEach(root => {
  const screen = root.querySelector('.settings-screen');
  const status = root.querySelector('.settings-status');
  const initialTheme = root.classList.contains('dark') ? 'Dark' : 'Light';
  let appearance = initialTheme;
  const dialogs = Object.fromEntries([...root.querySelectorAll('dialog')].map(d=>[d.dataset.kind,d]));
  function open(kind) {
   const dialog = dialogs[kind]; dialog.returnValue = '';
   if(kind==='appearance') dialog.querySelectorAll('input').forEach(r=>r.checked=r.value===appearance);
   if(kind==='profile') {const input=dialog.querySelector('input');input.value=root.querySelector('.profile-value').textContent;input.removeAttribute('aria-invalid');dialog.querySelector('[role=alert]').textContent='';}
   dialog.showModal();
   if(kind==='profile') dialog.querySelector('input').focus();
  }
  for(const kind of ['appearance','profile','reset']) root.querySelectorAll('.open-'+kind).forEach(b=>b.addEventListener('click',()=>open(kind)));
  function theme(value) {
   appearance=value;screen.classList.toggle('dark',value==='Dark');
   // Theme variables are set on the screen so specimen themes stay side by side.
   for(const [key,token] of Object.entries({canvas:'canvas',surface:'bubble',composer:'composer',line:'border',text:'text',muted:'muted'}))screen.style.setProperty('--'+key,`var(--${token}-${value.toLowerCase()})`);
   screen.style.setProperty('--danger',value==='Dark'?'#ffb4ab':'#b42318');
   screen.style.setProperty('--focus',value==='Dark'?'#75aeea':'#0054fd');
   screen.style.colorScheme=value.toLowerCase();screen.style.color='var(--text)';root.querySelector('.appearance-value').textContent=value;
  }
  dialogs.appearance.addEventListener('close',()=>{if(dialogs.appearance.returnValue==='apply'){theme(dialogs.appearance.querySelector('input:checked').value);status.textContent=appearance+' appearance applied to this preview.';}});
  dialogs.profile.querySelector('.cancel-profile').addEventListener('click',()=>dialogs.profile.close());
  dialogs.profile.querySelector('form').addEventListener('submit',event=>{event.preventDefault();const input=dialogs.profile.querySelector('input');const value=input.value.trim();if(!value){input.setAttribute('aria-invalid','true');dialogs.profile.querySelector('[role=alert]').textContent='Enter a name to continue.';input.focus();return;}root.querySelector('.profile-value').textContent=value;dialogs.profile.close();status.textContent='Name updated in this preview.';});
  dialogs.reset.addEventListener('close',()=>{if(dialogs.reset.returnValue!=='reset')return;root.querySelector('.profile-value').textContent='Alex';root.querySelector('.reminder-toggle').checked=false;root.querySelector('.haptics-toggle').checked=true;theme(initialTheme);status.textContent='Preview settings reset.';});
  for(const name of ['reminder','haptics'])root.querySelector('.'+name+'-toggle').addEventListener('change',event=>{status.textContent=(name==='reminder'?'Reminders':'Haptics')+(event.target.checked?' enabled':' disabled')+' in this preview.';});
  root.querySelector('.sample-secondary').addEventListener('click',()=>root.querySelector('.button-feedback').textContent='Secondary button activated.');
  root.querySelector('.sample-save').addEventListener('click',event=>{const button=event.currentTarget;button.disabled=true;button.setAttribute('aria-busy','true');button.textContent='Saving…';setTimeout(()=>{button.disabled=false;button.removeAttribute('aria-busy');button.textContent='Save changes';root.querySelector('.button-feedback').textContent='Saved in this demo.';},700);});
 });
})();
