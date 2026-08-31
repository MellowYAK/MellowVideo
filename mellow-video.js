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
      this.audioTimeHandler=()=>this.enforceAudioRange();
      if(this.options.audio)this.options.audio.addEventListener('timeupdate',this.audioTimeHandler);
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
      if(this.options.audio&&(seek||frame.audioSrc!==undefined||frame.audio===false)){
        try{
          const audio=this.options.audio;
          if(frame.audio===false)audio.pause();
          else{
            if(frame.audioSrc&&audio.getAttribute('src')!==frame.audioSrc){audio.src=frame.audioSrc;audio.load()}
            if(frame.audioVolume!==undefined)audio.volume=Math.max(0,Math.min(1,Number(frame.audioVolume)));
            audio.loop=false;
            audio.currentTime=frame.audioStart!==undefined?Number(frame.audioStart):frame.audioSrc?0:frame.start;
            if(this.playing)audio.play().catch(()=>{});else audio.pause();
          }
        }catch(error){}
      }
      if(this.options.onChange)this.options.onChange(frame,this);
      if(this.playing)this.timer=setTimeout(()=>this.goTo(index+1,{play:true,seek:false}),frame.duration);
      return this;
    }

    enforceAudioRange(){
      const audio=this.options.audio;
      const frame=this.frames[this.index];
      if(!audio||!frame||frame.audio===false)return;
      const start=Math.max(0,Number(frame.audioStart||0));
      const naturalEnd=Number.isFinite(audio.duration)?audio.duration:Infinity;
      const configuredEnd=frame.audioEnd!==undefined?Number(frame.audioEnd):frame.audioDuration!==undefined?start+Number(frame.audioDuration):naturalEnd;
      const end=Math.max(start,Math.min(naturalEnd,configuredEnd));
      if(audio.currentTime+0.025<end)return;
      if(frame.audioLoop===true||frame.audioPlayback==='loop'){
        audio.currentTime=start;
        if(this.playing||frame.audioPreviewing)audio.play().catch(()=>{});
      }else audio.pause();
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
    destroy(){clearTimeout(this.timer);if(this.options.audio)this.options.audio.removeEventListener('timeupdate',this.audioTimeHandler);this.host.classList.remove('is-mellow-frame-timeline');delete this.host.dataset.mellowFrame;this.elements.forEach(element=>element.classList.remove('is-mellow-frame-active'))}
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
      panel.querySelector('button').addEventListener('click',()=>{
        const editor=panel.querySelector('details');
        if(editor?.open){editor.open=false;return}
        this.setEnabled(!this.enabled);
      });
      this.panel=panel;
      this.renderControls(this.withAudioControls(this.options.controls||[]));
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
    withAudioControls(controls=[]){
      const config=this.options.audioControls;
      if(!config)return controls;
      this.audioControls=config===true?{}:config;
      const audio=this.audioControls.audio||this.timeline?.options?.audio;
      if(!audio)return controls;
      const current=this.timeline?.frames?.[this.timeline.index];
      return [...controls,
        {key:'audioEnabled',label:this.audioControls.enabledLabel||'AUDIO ENABLED',type:'toggle',value:current?.audio!==false,onChange:value=>{const frame=this.timeline?.frames?.[this.timeline.index];if(frame)frame.audio=Boolean(value);if(!value)audio.pause();if(this.audioControls.onChange)this.audioControls.onChange('enabled',value,this)}},
        {key:'audioVolume',label:this.audioControls.volumeLabel||'AUDIO VOLUME',type:'number',value:audio.volume,min:0,max:1,step:.05,onChange:value=>{audio.volume=Math.max(0,Math.min(1,Number(value)));if(this.audioControls.onChange)this.audioControls.onChange('volume',audio.volume,this)}},
        {key:'audioMuted',label:this.audioControls.mutedLabel||'AUDIO MUTED',type:'toggle',value:audio.muted,onChange:value=>{audio.muted=Boolean(value);if(this.audioControls.onChange)this.audioControls.onChange('muted',audio.muted,this)}},
        {key:'audioPlayback',label:this.audioControls.playbackLabel||'AUDIO PLAYBACK',type:'select',value:current?.audioPlayback||'once',options:[{value:'once',label:'PLAY ONCE'},{value:'loop',label:'LOOP'}],onChange:value=>{const frame=this.timeline?.frames?.[this.timeline.index];if(frame){frame.audioPlayback=value;frame.audioLoop=value==='loop'}if(this.audioControls.onChange)this.audioControls.onChange('playback',value,this)}},
        {key:'audioStart',label:this.audioControls.startLabel||'AUDIO START (S)',type:'number',value:Number(current?.audioStart||0),min:0,step:.1,onChange:value=>{const frame=this.timeline?.frames?.[this.timeline.index];if(frame)frame.audioStart=Math.max(0,Number(value)||0);if(this.audioControls.onChange)this.audioControls.onChange('start',value,this)}},
        {key:'audioEnd',label:this.audioControls.endLabel||'AUDIO END (S)',type:'number',value:current?.audioEnd??'',min:0,step:.1,onChange:value=>{const frame=this.timeline?.frames?.[this.timeline.index];if(frame)frame.audioEnd=Math.max(Number(frame.audioStart||0),Number(value)||0);if(this.audioControls.onChange)this.audioControls.onChange('end',value,this)}},
        {key:'audioTiming',label:this.audioControls.timingLabel||'AUDIO TIME',type:'readout',value:'00:00.00 / --:--.--'},
        {key:'audioPreview',label:this.audioControls.previewLabel||'AUDIO PREVIEW',type:'action',actionLabel:this.audioControls.previewActionLabel||'PLAY / STOP',onChange:()=>this.previewAudio()}
      ];
    }
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
        }else if(control.type==='action'){
          input=document.createElement('button');input.type='button';input.textContent=control.actionLabel||'RUN';input.className='mellow-debug-action';
        }else if(control.type==='readout'){
          input=document.createElement('output');input.textContent=control.value||'—';input.className='mellow-debug-readout';
        }else{
          input=document.createElement('input');input.type=control.type==='toggle'?'checkbox':'number';
          if(control.type==='toggle')input.checked=Boolean(control.value);else{input.value=control.value;if(control.min!==undefined)input.min=control.min;if(control.max!==undefined)input.max=control.max;if(control.step!==undefined)input.step=control.step}
        }
        const commit=()=>{const value=control.type==='action'?true:control.type==='toggle'?input.checked:control.type==='number'?Number(input.value):input.value;control.value=value;if(control.onChange)control.onChange(value,control,this)};
        if(control.type!=='readout')input.addEventListener(control.type==='action'?'click':'change',commit);
        if(control.type==='number')input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();commit();input.blur()}});
        row.append(text,input);root.append(row);
      });
      return this;
    }
    setControlValue(key,value){const control=this.controls?.find(item=>item.key===key);const input=this.panel.querySelector(`[data-control="${key}"] input,[data-control="${key}"] select,[data-control="${key}"] output`);if(control)control.value=value;if(input){if(input.type==='checkbox')input.checked=Boolean(value);else if(input.tagName==='OUTPUT')input.textContent=value;else input.value=value}return this}
    getControlValues(){return Object.fromEntries((this.controls||[]).filter(control=>!['action','readout'].includes(control.type)).map(control=>[control.key,control.value]))}
    getAudioState(){
      const audio=this.audioControls?.audio||this.timeline?.options?.audio;
      const frame=this.timeline?.frames?.[this.timeline.index];
      if(!audio||!frame)return null;
      const source=frame.audioSrc||audio.getAttribute('src')||'';
      const start=Number(frame.audioStart||0);const end=frame.audioEnd!==undefined?Number(frame.audioEnd):frame.audioDuration!==undefined?start+Number(frame.audioDuration):Number.isFinite(audio.duration)?audio.duration:null;
      return {enabled:frame.audio!==false,source,file:source.split(/[\\/]/).pop()||'',scope:frame.audioScope||this.audioControls?.scope||'frame',start,end,duration:end===null?null:Math.max(0,end-start),playback:frame.audioPlayback||(frame.audioLoop?'loop':'once'),current:audio.currentTime,sourceDuration:Number.isFinite(audio.duration)?audio.duration:null,volume:audio.volume,muted:audio.muted};
    }
    getBackgroundTrackState(){return this.options.backgroundTrack?.getState?.()||null}
    async previewAudio(){
      const audio=this.audioControls?.audio||this.timeline?.options?.audio;
      const frame=this.timeline?.frames?.[this.timeline.index];
      if(!audio||!frame||frame.audio===false)return false;
      if(!audio.paused){audio.pause();frame.audioPreviewing=false;return false}
      try{
        if(frame.audioSrc&&audio.getAttribute('src')!==frame.audioSrc){audio.src=frame.audioSrc;audio.load()}
        audio.currentTime=Number(frame.audioStart||0);
        frame.audioPreviewing=true;await audio.play();
        return true;
      }catch(error){return false}
    }
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
      const settings=(this.controls||[]).filter(control=>!['action','readout'].includes(control.type)).map(control=>`- ${control.label||control.key}: ${values[control.key]}`).join('\n');
      const audio=this.getAudioState();
      const audioText=audio?`\nAudio source: ${audio.file||audio.source||'none'}\nAudio scope: ${audio.scope}\nAudio enabled: ${audio.enabled}\nAudio playback: ${audio.playback}\nAudio start: ${audio.start.toFixed(2)}s\nAudio end: ${audio.end===null?'source end':audio.end.toFixed(2)+'s'}\nAudio clip duration: ${audio.duration===null?'source duration':audio.duration.toFixed(2)+'s'}\nAudio source duration: ${audio.sourceDuration===null?'not loaded':audio.sourceDuration.toFixed(2)+'s'}\nAudio volume: ${audio.volume}\nAudio muted: ${audio.muted}`:'';
      const music=this.getBackgroundTrackState();const musicText=music?`\nBackground music source: ${music.file||music.source||'none'}\nBackground music enabled: ${music.enabled}\nBackground music volume: ${music.volume}\nBackground music loop: ${music.loop}\nBackground music continuous across frames: true`:'';
      return `Create or update a Mellow Video scene for ${scopeText}.\nChapter: ${this.options.chapter}\nFrame duration: ${(state.duration/1000).toFixed(3)} seconds\nFrame range: ${(state.start).toFixed(2)}s to ${(state.end).toFixed(2)}s${audioText}${musicText}\nApply these live editor settings:\n${settings}\nKeep the sequence responsive on desktop and iPhone, preserve unrelated frames, and use MellowVideo FrameTimeline, themes, effects and frame-scoped audio so the result remains reusable.`;
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
      if(this.audioControls&&this.audioControlFrame!==state.index){this.audioControlFrame=state.index;const frame=this.timeline.frames[state.index];this.setControlValue('audioEnabled',frame?.audio!==false);this.setControlValue('audioPlayback',frame?.audioPlayback||(frame?.audioLoop?'loop':'once'));this.setControlValue('audioStart',Number(frame?.audioStart||0));this.setControlValue('audioEnd',frame?.audioEnd??'')}
      if(this.audioControls){const audio=this.audioControls.audio||this.timeline?.options?.audio;if(audio){const frame=this.timeline.frames[state.index];const start=Number(frame?.audioStart||0);const end=frame?.audioEnd!==undefined?Number(frame.audioEnd):frame?.audioDuration!==undefined?start+Number(frame.audioDuration):audio.duration;const current=Math.max(0,audio.currentTime-start);const clip=Number.isFinite(end)?Math.max(0,end-start):0;const total=Number.isFinite(audio.duration)?audio.duration:0;this.setControlValue('audioTiming',`${this.format(current*1000)} / ${clip?this.format(clip*1000):'--:--.--'} · FILE ${total?this.format(total*1000):'--:--.--'}`)}}
    }
    tick(){this.update();this.raf=requestAnimationFrame(()=>this.tick())}
    destroy(){cancelAnimationFrame(this.raf);if(this.panel)this.panel.remove()}
  }

  class MellowAudioGate{
    constructor(options={}){
      this.options={language:'en',host:document.body,...options};
      this.language=this.options.language;
      this.whenChosen=new Promise(resolve=>{this.resolveChoice=resolve});
      this.mount();
    }
    copy(){
      const defaults={
        en:{kicker:'A SOUND-LED JOURNEY',title:'Turn on sound for the full experience?',body:'Music and frame audio bring the sequence to life.',enable:'♫  Enable audio',skip:'Continue without sound',note:'You can change this anytime in Debug Mode.'},
        ru:{kicker:'ЗВУКОВОЕ ПУТЕШЕСТВИЕ',title:'Включить звук для полного погружения?',body:'Музыка и звук кадров оживляют всю сцену.',enable:'♫  Включить звук',skip:'Продолжить без звука',note:'Вы сможете изменить выбор в Debug Mode.'}
      };
      return {...defaults[this.language]||defaults.en,...(this.options.copy?.[this.language]||{})};
    }
    mount(){
      const gate=document.createElement('section');gate.className='mellow-audio-gate';gate.setAttribute('role','dialog');gate.setAttribute('aria-modal','true');gate.setAttribute('aria-labelledby','mellow-audio-gate-title');
      gate.innerHTML='<div class="mellow-audio-card"><div class="mellow-audio-orbit" aria-hidden="true"><i></i><i></i><span>♫</span></div><p data-audio-kicker></p><h2 id="mellow-audio-gate-title"></h2><p data-audio-copy></p><div class="mellow-audio-actions"><button type="button" data-audio-enable></button><button type="button" data-audio-skip></button></div><small data-audio-note></small></div>';
      this.options.host.append(gate);this.element=gate;this.render();
      gate.querySelector('[data-audio-enable]').addEventListener('click',()=>this.choose(true));
      gate.querySelector('[data-audio-skip]').addEventListener('click',()=>this.choose(false));
      requestAnimationFrame(()=>gate.classList.add('is-visible'));
      gate.querySelector('[data-audio-enable]').focus();
    }
    render(){const copy=this.copy();this.element.querySelector('[data-audio-kicker]').textContent=copy.kicker;this.element.querySelector('h2').textContent=copy.title;this.element.querySelector('[data-audio-copy]').textContent=copy.body;this.element.querySelector('[data-audio-enable]').textContent=copy.enable;this.element.querySelector('[data-audio-skip]').textContent=copy.skip;this.element.querySelector('[data-audio-note]').textContent=copy.note;return this}
    setLanguage(language){this.language=language;return this.render()}
    choose(enabled){if(this.choice!==undefined)return this;this.choice=Boolean(enabled);if(this.options.onChoice)this.options.onChoice(this.choice,this);this.resolveChoice(this.choice);this.destroy();return this}
    destroy(){if(this.element)this.element.remove()}
  }

  class MellowSpeakerMotion{
    constructor(host,options={}){
      if(!host)throw new Error('MellowVideo.SpeakerMotion: a host element is required.');
      this.host=host;
      this.options={selector:'img',preset:'gentle-talk',intensity:1,speed:1,clipPath:'inset(0)',mask:'none',origin:'50% 50%',...options};
      this.mount();
    }
    mount(){
      this.destroy();
      if(this.options.preset==='none')return this;
      const source=this.host.querySelector(this.options.selector);
      if(!source)return this;
      const layer=source.cloneNode(true);
      layer.removeAttribute('id');layer.removeAttribute('aria-label');layer.setAttribute('aria-hidden','true');
      layer.className='mellow-speaker-layer';
      layer.dataset.speakerMotion=this.options.preset;
      layer.style.setProperty('--mellow-speaker-intensity',Math.max(0,Number(this.options.intensity)||0));
      layer.style.setProperty('--mellow-speaker-speed',Math.max(.1,Number(this.options.speed)||1));
      layer.style.setProperty('--mellow-speaker-clip',this.options.clipPath);
      layer.style.setProperty('--mellow-speaker-mask',this.options.mask);
      layer.style.setProperty('--mellow-speaker-origin',this.options.origin);
      source.insertAdjacentElement('afterend',layer);this.layer=layer;this.host.classList.add('has-mellow-speaker-motion');
      return this;
    }
    update(options={}){this.options={...this.options,...options};return this.mount()}
    destroy(){if(this.layer)this.layer.remove();this.layer=null;this.host.classList.remove('has-mellow-speaker-motion');return this}
  }

  class MellowCameraMotion{
    constructor(host,options={}){
      if(!host)throw new Error('MellowVideo.CameraMotion: a host element is required.');
      this.host=host;this.options={selector:'img',preset:'anime-thought-zoom',intensity:1,duration:2.5,origin:'42% 38%',...options};this.mount();
    }
    mount(){this.destroy();if(this.options.preset==='none')return this;const target=this.host.querySelector(this.options.selector);if(!target)return this;this.target=target;this.host.classList.add('has-mellow-camera-motion');this.host.dataset.cameraMotion=this.options.preset;target.classList.add('mellow-camera-target');target.style.setProperty('--mellow-camera-intensity',Math.max(0,Number(this.options.intensity)||0));target.style.setProperty('--mellow-camera-duration',`${Math.max(.2,Number(this.options.duration)||2.5)}s`);target.style.setProperty('--mellow-camera-origin',this.options.origin);return this}
    update(options={}){this.options={...this.options,...options};return this.mount()}
    destroy(){if(this.target){this.target.classList.remove('mellow-camera-target');this.target.style.removeProperty('--mellow-camera-intensity');this.target.style.removeProperty('--mellow-camera-duration');this.target.style.removeProperty('--mellow-camera-origin')}this.target=null;this.host.classList.remove('has-mellow-camera-motion');delete this.host.dataset.cameraMotion;return this}
  }

  class MellowBackgroundTrack{
    constructor(audio,options={}){
      if(!audio)throw new Error('MellowVideo.BackgroundTrack: an audio element is required.');
      this.audio=audio;this.options={src:'',volume:.15,loop:true,enabled:true,...options};this.configure(this.options);
    }
    configure(options={}){this.options={...this.options,...options};if(this.options.src&&this.audio.getAttribute('src')!==this.options.src){this.audio.src=this.options.src;this.audio.load()}this.audio.volume=Math.max(0,Math.min(1,Number(this.options.volume)));this.audio.loop=Boolean(this.options.loop);this.audio.muted=!this.options.enabled;return this}
    async play(){if(!this.options.enabled)return false;this.audio.muted=false;try{await this.audio.play();return true}catch(error){return false}}
    pause(){this.audio.pause();return this}
    setEnabled(enabled){this.options.enabled=Boolean(enabled);this.audio.muted=!this.options.enabled;if(!this.options.enabled)this.pause();return this}
    setVolume(volume){this.options.volume=Math.max(0,Math.min(1,Number(volume)));this.audio.volume=this.options.volume;return this}
    setLoop(loop){this.options.loop=Boolean(loop);this.audio.loop=this.options.loop;return this}
    restart(){this.audio.currentTime=0;return this.play()}
    getState(){return {enabled:this.options.enabled,source:this.options.src,file:(this.options.src||'').split(/[\\/]/).pop()||'',volume:this.audio.volume,loop:this.audio.loop,muted:this.audio.muted,paused:this.audio.paused,current:this.audio.currentTime,duration:Number.isFinite(this.audio.duration)?this.audio.duration:null}}
    destroy(){this.pause();this.audio.removeAttribute('src');this.audio.load()}
  }

  class MellowPreloadQueue{
    constructor(options={}){this.options={host:document.body,minimumMs:180,timeoutMs:1600,label:'LOADING NEXT SCENE',...options};this.cache=new Map()}
    normalize(asset){return typeof asset==='string'?{url:asset,type:/\.(mp3|wav|m4a|aac|ogg|opus)(\?|$)/i.test(asset)?'audio':'image'}:asset}
    load(asset){const item=this.normalize(asset);if(!item?.url)return Promise.resolve(false);if(this.cache.has(item.url))return this.cache.get(item.url).promise;let element;const promise=new Promise(resolve=>{const done=ok=>resolve(ok);if(item.type==='audio'){element=new Audio();element.preload='auto';element.addEventListener('canplaythrough',()=>done(true),{once:true});element.addEventListener('error',()=>done(false),{once:true});element.src=item.url;element.load()}else{element=new Image();element.decoding='async';element.onload=()=>done(true);element.onerror=()=>done(false);element.src=item.url}});this.cache.set(item.url,{promise,element,type:item.type});return promise}
    mountLoader(label){const element=document.createElement('div');element.className='mellow-preload-overlay';element.innerHTML=`<div><i></i><span>${MellowVideo.escape(label||this.options.label)}</span></div>`;this.options.host.append(element);requestAnimationFrame(()=>element.classList.add('is-visible'));return element}
    async preload(assets=[],options={}){const settings={showLoader:false,label:this.options.label,minimumMs:this.options.minimumMs,timeoutMs:this.options.timeoutMs,...options};const started=performance.now();const loader=settings.showLoader?this.mountLoader(settings.label):null;const work=Promise.allSettled(assets.map(asset=>this.load(asset)));await Promise.race([work,new Promise(resolve=>setTimeout(resolve,settings.timeoutMs))]);const remaining=settings.minimumMs-(performance.now()-started);if(loader&&remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));if(loader){loader.classList.remove('is-visible');setTimeout(()=>loader.remove(),180)}return this}
    release(assets=[]){assets.map(asset=>this.normalize(asset)?.url).filter(Boolean).forEach(url=>{const entry=this.cache.get(url);if(entry?.element){entry.element.removeAttribute?.('src');entry.element.load?.()}this.cache.delete(url)});return this}
    clear(){return this.release([...this.cache.keys()])}
    destroy(){this.clear();document.querySelectorAll('.mellow-preload-overlay').forEach(element=>element.remove())}
  }

  class MellowVideo{
    static VERSION='0.13.0';
    static AGENT_THEMES=['claude-code','vscode'];
    static AGENT_EFFECTS=['none','prompt-zoom','prompt-pan'];
    static CHAPTER_CARD_THEMES=['comic-cyber','cinematic-dark'];
    static CHAPTER_CARD_EFFECTS=['none','panel-slam'];
    static FrameTimeline=MellowFrameTimeline;
    static DebugOverlay=MellowDebugOverlay;
    static AudioGate=MellowAudioGate;
    static SpeakerMotion=MellowSpeakerMotion;
    static SPEAKER_MOTIONS=['none','gentle-talk','expressive-talk'];
    static CameraMotion=MellowCameraMotion;
    static CAMERA_MOTIONS=['none','anime-thought-zoom','slow-focus-push'];
    static BackgroundTrack=MellowBackgroundTrack;
    static PreloadQueue=MellowPreloadQueue;
    static CAPABILITIES=Object.freeze({
      presentation:{method:'show',modes:['story','cinematic-subtitles','cyberpunk-title']},
      agentWindow:{method:'agentWindowMarkup',themes:['claude-code','vscode'],effects:['none','prompt-zoom','prompt-pan'],options:['theme','effect','duration','agent','files','earlier','earlierLabel','previousReply','prompt','accepted','working','footer']},
      chapterCard:{method:'chapterCardMarkup',optional:true,themes:['comic-cyber','cinematic-dark'],effects:['none','panel-slam'],options:['theme','effect','duration','eyebrow','title','subtitle','badge','accent','contrast']},
      audioGate:{method:'requestAudioConsent',options:['language','host','copy','onChoice'],methods:['setLanguage','choose','destroy'],returnsChoicePromise:true},
      speakerMotion:{method:'applySpeakerMotion',presets:['none','gentle-talk','expressive-talk'],options:['selector','preset','intensity','speed','clipPath','mask','origin'],methods:['update','destroy'],isolatedLayer:true,featheredMask:true,reducedMotionSafe:true},
      cameraMotion:{method:'applyCameraMotion',presets:['none','anime-thought-zoom','slow-focus-push'],options:['selector','preset','intensity','duration','origin'],methods:['update','destroy'],reducedMotionSafe:true},
      thoughtBubble:{method:'styleThoughtBubble',className:'mellow-thought-bubble',keepsTextInHTML:true},
      backgroundTrack:{method:'createBackgroundTrack',options:['src','volume','loop','enabled'],methods:['configure','play','pause','setEnabled','setVolume','setLoop','restart','getState','destroy'],continuousAcrossFrames:true,separateFromFrameAudio:true,requiresUserGesture:true},
      preloadQueue:{method:'createPreloadQueue',options:['host','minimumMs','timeoutMs','label'],assetTypes:['image','audio'],methods:['load','preload','release','clear','destroy'],cacheAware:true,preloadAhead:true,releaseBehind:true},
      frameTimeline:{method:'createFrameTimeline',options:['selector','frames','audio','autoplay','loop','onChange','onComplete'],frameAudioOptions:['audio','audioSrc','audioStart','audioEnd','audioDuration','audioPlayback','audioLoop','audioVolume','audioScope'],controls:['goTo','next','previous','play','pause','setPlaying','recalculate','setFrameDuration','destroy'],audioSeek:true,audioTrim:true,audioLoop:true,frameScopedAudio:true}
      ,debugMode:{method:'enableDebug',options:['timeline','chapter','label','storageKey','enabled','placement','controls','audioControls','backgroundTrack','promptExport'],placements:['fixed','after-host','frame-footer'],controlTypes:['select','toggle','number','action','readout'],promptScopes:['frame','chapter','moment'],methods:['setTimeline','setEnabled','setTimingVisible','setControlValue','getControlValues','getAudioState','getBackgroundTrackState','previewAudio','renderControls','generatePrompt','copyPrompt','destroy'],readouts:['chapter','frame','frameDuration','elapsed','remaining','range','total','playState','audioCurrent','audioClipDuration','audioSourceDuration'],toggle:true}
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

    static requestAudioConsent(options={}){
      return new MellowAudioGate(options);
    }

    static applySpeakerMotion(host,options={}){
      return new MellowSpeakerMotion(host,options);
    }

    static applyCameraMotion(host,options={}){return new MellowCameraMotion(host,options)}
    static styleThoughtBubble(element){if(element)element.classList.add('mellow-thought-bubble');return element}
    static createBackgroundTrack(audio,options={}){return new MellowBackgroundTrack(audio,options)}
    static createPreloadQueue(options={}){return new MellowPreloadQueue(options)}

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
