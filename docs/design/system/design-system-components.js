// Local specimen interactions only. No messages leave this page.
(() => {
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 2 19 10L3 22l3-9 10-1-10-1Z"/></svg>';
  const heartIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21S2 15 2 8a5 5 0 0 1 10-1A5 5 0 0 1 22 8c0 7-10 13-10 13Z"/></svg>';
  const composer = (id, label, value = '', rows = 1, disabled = false) => `<div class="composer-demo"><label class="state-name" for="${id}">${label}</label><div class="composer"><textarea id="${id}" rows="${rows}" placeholder="Type a message…" readonly>${value}</textarea><button type="button" class="send" disabled aria-label="${disabled ? 'Send unavailable' : 'Static send example'}">${arrow}</button></div></div>`;
  document.getElementById('chat-library').innerHTML = ['light', 'dark'].map(mode => `<article class="theme library ${mode}" aria-label="${mode} chat component library">
    <div class="theme-label"><h3>${mode === 'light' ? 'Light' : 'Dark'} components</h3><span>Chat + composer</span></div>
    <section class="specimen"><h4>Messages, replies & reactions</h4>
      <div class="person">Luni <time>9:12 AM</time></div><div class="bubble">How did your day go?</div>
      <button class="reaction library-reaction" type="button" aria-label="Like Luni’s message" aria-pressed="false">${heartIcon}<span>Like</span></button>
      <div class="outgoing"><div class="person">You <time>9:14 AM</time></div><div class="bubble">A lot happened today.<br>I’m glad I have a moment to talk.</div><span class="message-meta">Sent · 9:14 AM</span></div>
      <div style="margin-top:24px"><div class="person">Luni <time>9:14 AM</time></div><div class="bubble"><div class="quote">You<br>A lot happened today.</div>What part is on your mind?</div></div>
      <p class="spec-note">Group messages from one speaker with an 8 px gap. Show the name once per group and the outgoing tail on its last bubble.</p>
    </section>
    <section class="specimen"><h4>Waiting & receiving</h4><div class="person">Luni</div><div class="bubble typing" role="img" aria-label="Luni is typing"><i></i><i></i><i></i></div><p class="spec-note">Typing: show before the first response text arrives.</p><div class="bubble" style="margin-top:16px">That sounds like a lot to carry.</div><span class="message-meta">Receiving response…</span><p class="spec-note">Streaming: append text inside the same bubble. Announce completion once; avoid reading each token aloud.</p></section>
    <section class="specimen"><h4>Composer states</h4>
      ${composer(mode+'-empty','Empty · send disabled','',1,true)}
      ${composer(mode+'-draft','Draft · ready to send','Can we talk for a bit?')}
      ${composer(mode+'-multiline','Multiline · grows to six lines','I finally finished that project.\nI’m relieved, but also exhausted.',2)}
      ${composer(mode+'-sending','Sending · preserve the message','Can we talk for a bit?',1,true)}
      <p class="spec-note">Static examples above. Try sending, failure, and retry below. Enter sends; Shift + Enter adds a line. On touch keyboards, use the send button.</p>
    </section>
    <section class="specimen"><h4>Try the composer</h4><p class="spec-note">Local interaction demo. No AI response or network request.</p>
      <div class="demo-controls"><label><input type="checkbox" class="fail-next"> Fail next send</label><button type="button" class="text-action reset-demo">Reset</button></div>
      <div class="live-messages" aria-label="Sent message examples"></div>
      <form class="live-form"><label class="state-name" for="${mode}-live">Message</label><div class="composer"><textarea id="${mode}-live" rows="1" maxlength="4000" placeholder="Type a message…" aria-describedby="${mode}-status"></textarea><button type="submit" class="send" disabled aria-label="Send message">${arrow}</button></div></form>
      <p class="live-status" id="${mode}-status" role="status" aria-live="polite">Write a message to try it.</p>
    </section>
  </article>`).join('');

  // Static enabled appearances remain real buttons: explain their purpose on activation.
  document.querySelectorAll('.composer-demo').forEach(sample => {
    const name = sample.querySelector('label').textContent;
    if (name.startsWith('Draft') || name.startsWith('Multiline')) {
      const button = sample.querySelector('button');
      button.disabled = false;
      button.setAttribute('aria-label', 'Preview send; use the interactive composer below');
      button.addEventListener('click', () => {
        const live = sample.closest('.library').querySelector('.live-form textarea');
        live.value = sample.querySelector('textarea').value;
        live.dispatchEvent(new Event('input'));
        live.focus();
      });
    }
    if (name.startsWith('Sending')) sample.querySelector('button').setAttribute('aria-label','Sending message');
  });
  document.querySelectorAll('.library-reaction').forEach(button => button.addEventListener('click', () => {
    const liked = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(liked));
    button.querySelector('span').textContent = liked ? 'Liked' : 'Like';
  }));
  document.querySelectorAll('.library').forEach(root => {
    const form = root.querySelector('form');
    const input = form.querySelector('textarea');
    const send = form.querySelector('button');
    const status = root.querySelector('.live-status');
    const list = root.querySelector('.live-messages');
    const fail = root.querySelector('.fail-next');
    let busy = false, timer;
    const resize = () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 132) + 'px';
      send.disabled = busy || !input.value.trim();
    };
    input.addEventListener('input', resize);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && matchMedia('(pointer:fine)').matches) {
        event.preventDefault();
        if (!send.disabled) form.requestSubmit();
      }
    });
    function deliver(row, shouldFail) {
      busy = true;
      input.readOnly = true;
      form.setAttribute('aria-busy','true');
      send.setAttribute('aria-label','Sending message');
      resize();
      const meta = row.querySelector('.message-meta');
      meta.textContent = 'Sending…';
      status.textContent = 'Sending message…';
      timer = setTimeout(() => {
        busy = false;
        input.readOnly = false;
        form.setAttribute('aria-busy','false');
        send.setAttribute('aria-label','Send message');
        if (shouldFail) {
          meta.textContent = 'Not sent';
          const recovery = document.createElement('div');
          recovery.className = 'delivery-line';
          const explanation = document.createElement('span');
          explanation.textContent = 'Couldn’t send. Try again.';
          const retry = document.createElement('button');
          retry.type = 'button'; retry.className = 'text-action'; retry.textContent = 'Retry';
          retry.addEventListener('click', () => {
            if (busy) return;
            recovery.remove();
            deliver(row, false);
            input.focus();
          });
          recovery.append(explanation, retry); row.append(recovery);
          status.textContent = 'Message not sent. Your text is saved above. Retry when ready.';
        } else {
          meta.textContent = 'Sent · ' + new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
          status.textContent = 'Message sent in this local demo.';
        }
        resize();
      }, 900);
    }
    form.addEventListener('submit', event => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text || busy) return;
      const row = document.createElement('div'); row.className = 'outgoing';
      const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.textContent = text;
      const meta = document.createElement('span'); meta.className = 'message-meta';
      row.append(bubble, meta); list.append(row);
      const shouldFail = fail.checked; fail.checked = false;
      input.value = ''; deliver(row, shouldFail); list.scrollTop = list.scrollHeight;
    });
    root.querySelector('.reset-demo').addEventListener('click', () => {
      clearTimeout(timer); busy = false; input.readOnly = false; input.value = ''; fail.checked = false;
      form.setAttribute('aria-busy','false');send.setAttribute('aria-label','Send message');list.replaceChildren();
      status.textContent = 'Write a message to try it.';resize();input.focus();
    });
  });
})();
