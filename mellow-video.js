(function(root,factory){
  const MellowVideo=factory();
  if(typeof module==='object'&&module.exports)module.exports=MellowVideo;
  root.MellowVideo=MellowVideo;
  root.MELLOW_VIDEO_MANIFEST=MellowVideo.describe();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  class MellowFrameTimeline{
    constructor(host,options={}){
      if(!host)throw new Error('MellowVideo.FrameTimeline: a host element is required.');
      this.host=host;
      this.options={selector:'.mellow-frame',autoplay:true,loop:false,...options};
      this.elements=[...host.querySelectorAll(this.options.selector)];
      let cursor=0;
      this.frames=this.elements.map((element,index)=>{
        const source=(this.options.frames||[])[index]||{};
        const duration=Math.max(1,Number(source.duration||1000));
        const frame={...source,index,duration,start:cursor/1000,element};
        cursor+=duration;
        return frame;
      });
      this.totalDuration=cursor;
      this.index=0;
      this.playing=Boolean(this.options.autoplay);
      this.timer=0;
      this.frameStartedAt=0;
      this.frozenElapsed=0;
      host.classList.add('is-mellow-frame-timeline');
      this.goTo(0,{play:this.playing,seek:true});
    }

    goTo(index,{play=this.playing,seek=true}={}){
      clearTimeout(this.timer);
      if(!this.frames.length)return this;
      if(index<0)index=this.options.loop?this.frames.length-1:0;
      if(index>=this.frames.length){
        if(this.options.loop)index=0;
        else{this.playing=false;if(this.options.onComplete)this.options.onComplete(this);return this}
      }
      this.index=index;
      this.playing=Boolean(play);
      this.frameStartedAt=performance.now();
      this.frozenElapsed=0;
      this.elements.forEach(element=>element.classList.remove('is-mellow-frame-active'));
      const frame=this.frames[index];
      const freshElement=frame.element.cloneNode(true);
      freshElement.classList.remove('is-mellow-frame-active');
      frame.element.replaceWith(freshElement);
      frame.element=freshElement;
      this.elements[index]=freshElement;
      void frame.element.offsetWidth;
      frame.element.classList.add('is-mellow-frame-active');
      void frame.element.offsetWidth;
      if(frame.element.getAnimations){
        frame.element.getAnimations({subtree:true}).forEach(animation=>{
          try{animation.cancel();animation.play()}catch(error){}
        });
      }
      this.host.dataset.mellowFrame=String(index);
      if(seek&&this.options.audio){
        try{this.options.audio.currentTime=frame.start;if(this.playing)this.options.audio.play().catch(()=>{});else this.options.audio.pause()}catch(error){}
      }
      if(this.options.onChange)this.options.onChange(frame,this);
      if(this.playing)this.timer=setTimeout(()=>this.goTo(index+1,{play:true,seek:false}),frame.duration);
      return this;
    }

    next(){return this.goTo(this.index+1,{play:this.playing,seek:true})}
    previous(){return this.goTo(this.index-1,{play:this.playing,seek:true})}
    play(){this.playing=true;return this.goTo(this.index,{play:true,seek:false})}
    pause(){this.frozenElapsed=Math.min(this.frames[this.index]?.duration||0,performance.now()-this.frameStartedAt);this.playing=false;clearTimeout(this.timer);if(this.options.audio)this.options.audio.pause();return this}
    setPlaying(playing){return playing?this.play():this.pause()}
    getState(){
      const frame=this.frames[this.index];
      if(!frame)return null;
      const elapsed=Math.min(frame.duration,this.playing?performance.now()-this.frameStartedAt:this.frozenElapsed);
      return {index:this.index,count:this.frames.length,duration:frame.duration,start:frame.start,end:frame.start+frame.duration/1000,elapsed,remaining:Math.max(0,frame.duration-elapsed),playing:this.playing,totalDuration:this.totalDuration,totalElapsed:frame.start*1000+elapsed};
    }
    recalculate(){let cursor=0;this.frames.forEach(frame=>{frame.start=cursor/1000;cursor+=frame.duration});this.totalDuration=cursor;return this}
    setFrameDuration(index,duration){const frame=this.frames[index];if(!frame)return this;frame.duration=Math.max(100,Number(duration)||100);this.recalculate();if(index===this.index)this.goTo(index,{play:this.playing,seek:false});return this}
    destroy(){clearTimeout(this.timer);this.host.classList.remove('is-mellow-frame-timeline');delete this.host.dataset.mellowFrame;this.elements.forEach(element=>element.classList.remove('is-mellow-frame-active'))}
  }

  class MellowDebugOverlay{
    constructor(host,options={}){
      this.host=host;
      this.options={chapter:'01',label:'MELLOW VIDEO',storageKey:'mellow-video-debug',enabled:true,placement:'fixed',...options};
      this.timeline=this.options.timeline;
      const saved=typeof localStorage!=='undefined'?localStorage.getItem(this.options.storageKey):null;
      this.enabled=saved===null?Boolean(this.options.enabled):saved!=='off';
      this.mount();
      this.tick();
    }
    mount(){
      const panel=document.createElement('aside');
      panel.className='mellow-debug-panel';
      panel.dataset.mellowDebug='';
      panel.dataset.mellowDebugPlacement=this.options.placement;
      panel.innerHTML='<button type="button" class="mellow-debug-toggle" aria-label="Toggle Mellow Video debug mode">DEBUG</button><div class="mellow-debug-body"><b></b><span data-debug-frame></span><span data-debug-time></span><span data-debug-range></span><span data-debug-total></span><i><em></em></i><details><summary>EDIT OPTIONS</summary><div class="mellow-debug-controls"></div></details></div>';
      if(this.options.placement==='after-host')this.host.insertAdjacentElement('afterend',panel);
      else if(this.options.placement==='frame-footer')this.host.append(panel);
      else document.body.append(panel);
      panel.querySelector('button').addEventListener('click',()=>this.setEnabled(!this.enabled));
      this.panel=panel;
      this.renderControls(this.options.controls||[]);
      this.renderPromptExport(this.options.promptExport||false);
      this.setEnabled(this.enabled,false);
    }
    format(milliseconds){
      const value=Math.max(0,Number(milliseconds)||0);
      const minutes=Math.floor(value/60000);
      const seconds=Math.floor((value%60000)/1000);
      const hundredths=Math.floor((value%1000)/10);
      return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${String(hundredths).padStart(2,'0')}`;
    }
    setTimeline(timeline){this.timeline=timeline;return this}
    renderControls(controls=[]){
      this.controls=controls;
      const root=this.panel.querySelector('.mellow-debug-controls');
      root.replaceChildren();
      controls.forEach(control=>{
        const row=document.createElement('label');
        row.dataset.control=control.key;
        const text=document.createElement('span');text.textContent=control.label||control.key;
        let input;
        if(control.type==='select'){
          input=document.createElement('select');
          (control.options||[]).forEach(option=>{const item=document.createElement('option');const value=typeof option==='object'?option.value:option;item.value=value;item.textContent=typeof option==='object'?option.label:option;input.append(item)});
          input.value=control.value;
        }else{
          input=document.createElement('input');input.type=control.type==='toggle'?'checkbox':'number';
          if(control.type==='toggle')input.checked=Boolean(control.value);else{input.value=control.value;if(control.min!==undefined)input.min=control.min;if(control.max!==undefined)input.max=control.max;if(control.step!==undefined)input.step=control.step}
        }
        const commit=()=>{const value=control.type==='toggle'?input.checked:control.type==='number'?Number(input.value):input.value;control.value=value;if(control.onChange)control.onChange(value,control,this)};
        input.addEventListener('change',commit);
        if(control.type==='number')input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();commit();input.blur()}});
        row.append(text,input);root.append(row);
      });
      return this;
    }
    setControlValue(key,value){const control=this.controls?.find(item=>item.key===key);const input=this.panel.querySelector(`[data-control="${key}"] input,[data-control="${key}"] select`);if(control)control.value=value;if(input){if(input.type==='checkbox')input.checked=Boolean(value);else input.value=value}return this}
    getControlValues(){return Object.fromEntries((this.controls||[]).map(control=>[control.key,control.value]))}
    renderPromptExport(config=false){
      this.promptExport=config===true?{}:config||null;
      if(!this.promptExport)return this;
      const root=document.createElement('section');
      root.className='mellow-debug-prompt';
      const title=document.createElement('b');title.textContent=this.promptExport.label||'PROMPT EXPORT';
      const scope=document.createElement('select');scope.setAttribute('aria-label','Prompt scope');scope.dataset.debugPromptScope='';
      const scopes=this.promptExport.scopes||[{value:'frame',label:'CURRENT FRAME'},{value:'chapter',label:'WHOLE CHAPTER'},{value:'moment',label:'EXACT MOMENT'}];
      scopes.forEach(option=>{const item=document.createElement('option');item.value=typeof option==='object'?option.value:option;item.textContent=typeof option==='object'?option.label:option;scope.append(item)});
      scope.value=this.promptExport.defaultScope||scopes[0]?.value||scopes[0]||'frame';
      const actions=document.createElement('div');
      const generate=document.createElement('button');generate.type='button';generate.textContent=this.promptExport.generateLabel||'GENERATE PROMPT';generate.dataset.debugGeneratePrompt='';
      const copy=document.createElement('button');copy.type='button';copy.textContent=this.promptExport.copyLabel||'COPY';copy.dataset.debugCopyPrompt='';copy.disabled=true;
      actions.append(generate,copy);
      const output=document.createElement('textarea');output.readOnly=true;output.rows=7;output.placeholder=this.promptExport.placeholder||'Your reusable scene prompt will appear here.';output.dataset.debugPromptOutput='';
      const status=document.createElement('small');status.dataset.debugPromptStatus='';
      generate.addEventListener('click',()=>this.generatePrompt(scope.value));
      copy.addEventListener('click',()=>this.copyPrompt());
      root.append(title,scope,actions,output,status);
      this.panel.querySelector('.mellow-debug-body details').append(root);
      this.promptRoot=root;
      return this;
    }
    defaultPrompt({scope,state,values}){
      const scopeText=scope==='chapter'?'the complete chapter':scope==='moment'?`the exact timeline moment at ${(state.totalElapsed/1000).toFixed(2)} seconds`:`only frame ${String(state.index).padStart(2,'0')} of ${String(state.count-1).padStart(2,'0')}`;
      const settings=(this.controls||[]).map(control=>`- ${control.label||control.key}: ${values[control.key]}`).join('\n');
      return `Create or update a Mellow Video scene for ${scopeText}.\nChapter: ${this.options.chapter}\nFrame duration: ${(state.duration/1000).toFixed(3)} seconds\nFrame range: ${(state.start).toFixed(2)}s to ${(state.end).toFixed(2)}s\nApply these live editor settings:\n${settings}\nKeep the sequence responsive on desktop and iPhone, preserve unrelated frames, and use MellowVideo FrameTimeline, themes and effects so the result remains reusable.`;
    }
    generatePrompt(scope){
      if(!this.promptRoot||!this.timeline)return '';
      const state=this.timeline.getState();
      const context={scope,state,values:this.getControlValues(),controls:this.controls||[],chapter:this.options.chapter,overlay:this};
      const prompt=this.promptExport.build?this.promptExport.build(context):this.defaultPrompt(context);
      const output=this.promptRoot.querySelector('[data-debug-prompt-output]');output.value=String(prompt||'');
      this.promptRoot.querySelector('[data-debug-copy-prompt]').disabled=!output.value;
      this.promptRoot.querySelector('[data-debug-prompt-status]').textContent=output.value?'PROMPT READY':'';
      return output.value;
    }
    async copyPrompt(){
      if(!this.promptRoot)return false;
      const output=this.promptRoot.querySelector('[data-debug-prompt-output]');if(!output.value)return false;
      let copied=false;
      try{await navigator.clipboard.writeText(output.value);copied=true}catch(error){output.select();copied=document.execCommand('copy')}
      this.promptRoot.querySelector('[data-debug-prompt-status]').textContent=copied?'COPIED':'SELECT AND COPY';
      return copied;
    }
    setTimingVisible(visible){this.panel.classList.toggle('is-timing-hidden',!visible);return this}
    setEnabled(enabled,persist=true){
      this.enabled=Boolean(enabled);
      this.panel.classList.toggle('is-collapsed',!this.enabled);
      this.panel.querySelector('button').textContent=this.enabled?'DEBUG ×':'DEBUG';
      if(persist&&typeof localStorage!=='undefined')localStorage.setItem(this.options.storageKey,this.enabled?'on':'off');
      return this;
    }
    update(){
      if(!this.enabled||!this.timeline)return;
      const state=this.timeline.getState();
      if(!state)return;
      this.panel.querySelector('.mellow-debug-body>b').textContent=`${this.options.label} · ${state.playing?'PLAYING':'PAUSED'}`;
      this.panel.querySelector('[data-debug-frame]').textContent=`CH ${this.options.chapter} · FRAME ${String(state.index).padStart(2,'0')} / ${String(state.count-1).padStart(2,'0')}`;
      this.panel.querySelector('[data-debug-time]').textContent=`FRAME ${this.format(state.elapsed)} / ${this.format(state.duration)} · LEFT ${this.format(state.remaining)}`;
      this.panel.querySelector('[data-debug-range]').textContent=`RANGE ${this.format(state.start*1000)} → ${this.format(state.end*1000)}`;
      this.panel.querySelector('[data-debug-total]').textContent=`TOTAL ${this.format(state.totalElapsed)} / ${this.format(state.totalDuration)}`;
      this.panel.querySelector('i em').style.width=`${Math.min(100,state.elapsed/state.duration*100)}%`;
    }
    tick(){this.update();this.raf=requestAnimationFrame(()=>this.tick())}
    destroy(){cancelAnimationFrame(this.raf);if(this.panel)this.panel.remove()}
  }

  class MellowVideo{
    static VERSION='0.7.1';
    static AGENT_THEMES=['claude-code','vscode'];
    static AGENT_EFFECTS=['none','prompt-zoom','prompt-pan'];
    static CHAPTER_CARD_THEMES=['comic-cyber','cinematic-dark'];
    static CHAPTER_CARD_EFFECTS=['none','panel-slam'];
    static FrameTimeline=MellowFrameTimeline;
    static DebugOverlay=MellowDebugOverlay;
    static CAPABILITIES=Object.freeze({
      presentation:{method:'show',modes:['story','cinematic-subtitles','cyberpunk-title']},
      agentWindow:{method:'agentWindowMarkup',themes:['claude-code','vscode'],effects:['none','prompt-zoom','prompt-pan'],options:['theme','effect','duration','agent','files','earlier','earlierLabel','previousReply','prompt','accepted','working','footer']},
      chapterCard:{method:'chapterCardMarkup',optional:true,themes:['comic-cyber','cinematic-dark'],effects:['none','panel-slam'],options:['theme','effect','duration','eyebrow','title','subtitle','badge','accent','contrast']},
      frameTimeline:{method:'createFrameTimeline',options:['selector','frames','audio','autoplay','loop','onChange','onComplete'],controls:['goTo','next','previous','play','pause','setPlaying','recalculate','setFrameDuration','destroy'],audioSeek:true}
      ,debugMode:{method:'enableDebug',options:['timeline','chapter','label','storageKey','enabled','placement','controls','promptExport'],placements:['fixed','after-host','frame-footer'],controlTypes:['select','toggle','number'],promptScopes:['frame','chapter','moment'],methods:['setTimeline','setEnabled','setTimingVisible','setControlValue','getControlValues','renderControls','generatePrompt','copyPrompt','destroy'],readouts:['chapter','frame','frameDuration','elapsed','remaining','range','total','playState'],toggle:true}
    });

    static describe(feature){
      const manifest={name:'mellow-video',version:MellowVideo.VERSION,capabilities:MellowVideo.CAPABILITIES};
      const value=feature?manifest.capabilities[feature]:manifest;
      return value?JSON.parse(JSON.stringify(value)):null;
    }

    static createFrameTimeline(host,options={}){
      return new MellowFrameTimeline(host,options);
    }

    static enableDebug(host,options={}){
      return new MellowDebugOverlay(host,options);
    }

    static escape(value=''){
      return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    }

    static agentWindowMarkup(options={}){
      const esc=MellowVideo.escape;
      const theme=options.theme||'claude-code';
      const effect=options.effect||'none';
      const duration=Math.max(1,Number(options.duration||5));
      const prompt=String(options.prompt||'');
      let charIndex=0;
      const typed=prompt.split(/(\s+)/).map(part=>/^\s+$/.test(part)?' ':`<span class="mv-agent-word">${[...part].map(char=>`<span class="mv-agent-typed-char" style="--char:${charIndex++}">${esc(char)}</span>`).join('')}</span>`).join('');
      return `<div class="mellow-agent-window" data-agent-theme="${esc(theme)}" data-agent-effect="${esc(effect)}" style="--mellow-agent-duration:${duration}s"><header><b>${esc(options.agent||'AI CODING AGENT')}</b><span>${esc((options.files||[]).join('   '))}</span></header><div class="mellow-agent-thread">${options.earlier?`<div class="mellow-agent-message is-earlier"><small>${esc(options.earlierLabel||'EARLIER')}</small>${esc(options.earlier)}</div>`:''}${options.previousReply?`<div class="mellow-agent-message is-reply">✓ ${esc(options.previousReply)}</div>`:''}<div class="mellow-agent-message is-prompt"><small>PROMPT</small><i>&gt;</i> <strong aria-label="${esc(prompt)}">${typed}</strong><em></em></div><div class="mellow-agent-enter"><kbd>ENTER ↵</kbd><span>${esc(options.accepted||'PROMPT ACCEPTED')}</span></div><div class="mellow-agent-message is-working"><span></span>${esc(options.working||'Reading project files…')}</div></div><footer>${esc(options.footer||'Prompt sent')} <b>↗</b></footer></div>`;
    }

    static chapterCardMarkup(options={}){
      const esc=MellowVideo.escape;
      const theme=options.theme||'comic-cyber';
      const effect=options.effect||'panel-slam';
      const duration=Math.max(1,Number(options.duration||3));
      const accent=options.accent||'#50ead7';
      const contrast=options.contrast||'#ff4ea1';
      return `<div class="mellow-chapter-card" data-chapter-theme="${esc(theme)}" data-chapter-effect="${esc(effect)}" style="--mellow-card-duration:${duration}s;--mellow-card-accent:${esc(accent)};--mellow-card-contrast:${esc(contrast)}"><div class="mellow-card-dots" aria-hidden="true"></div><div class="mellow-card-panel"><small>${esc(options.eyebrow||'CHAPTER')}</small><strong>${esc(options.title||'')}</strong>${options.subtitle?`<p>${esc(options.subtitle)}</p>`:''}<span>${esc(options.badge||'00')}</span></div></div>`;
    }

    constructor(host,options={}){
      if(!host)throw new Error('MellowVideo: a host element is required.');
      this.host=host;
      this.options={defaultMode:'story',...options};
      this.mount();
    }

    mount(){
      let layer=this.host.querySelector('[data-mellow-video-layer]');
      if(!layer){
        layer=document.createElement('div');
        layer.className='mellow-video-layer';
        layer.dataset.mellowVideoLayer='';
        layer.innerHTML='<div class="mellow-video-letterbox" aria-hidden="true"></div><div class="mellow-video-caption" role="status" aria-live="polite"><span></span><strong></strong><p></p></div>';
        this.host.append(layer);
      }
      this.layer=layer;
      this.kicker=layer.querySelector('span');
      this.title=layer.querySelector('strong');
      this.body=layer.querySelector('p');
      return this;
    }

    show(scene={},context={}){
      const mode=context.mode||this.options.defaultMode;
      if(mode==='story'){this.clear();return this}
      this.host.dataset.mellowVideo=mode;
      this.layer.dataset.sceneKey=String(context.key||Date.now());
      this.kicker.textContent=context.label||'';
      this.title.textContent=scene.title||'';
      this.body.textContent=scene.body||'';
      this.layer.hidden=false;
      this.layer.classList.remove('is-entering');
      void this.layer.offsetWidth;
      this.layer.classList.add('is-entering');
      this.setOriginalCopyHidden(true);
      return this;
    }

    clear(){
      delete this.host.dataset.mellowVideo;
      if(this.layer)this.layer.hidden=true;
      this.setOriginalCopyHidden(false);
      return this;
    }

    setOriginalCopyHidden(hidden){
      this.host.querySelectorAll('.story-copy,.comic-bubble').forEach(element=>{
        if(hidden)element.setAttribute('aria-hidden','true');
        else element.removeAttribute('aria-hidden');
      });
    }
  }

  return MellowVideo;
});
