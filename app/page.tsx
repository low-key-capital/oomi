"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Choice = { label: string; icon?: string };
type Step = { kicker:string; title:string; body:string; cta:string; multi?:boolean; choices?:Choice[]; mode:string; permission?:boolean; finish?:boolean; stat?:string };

// The opening question promises "begin anywhere", so the script has to actually
// follow wherever you point it. Each topic carries its own vocabulary; the rest
// of the sequence is shared.
// `skip` drops the context option that just restates the topic -- offering
// "Poor sleep" as context for a restless night is a question about itself.
type Topic = { noun:string; thread:string; when:string; qualities:Choice[]; keep:Choice[]; skip?:string };

const TOPICS: Record<string, Topic> = {
  "Migraines": { noun:"migraine", thread:"Migraines", when:"When did it last show up?",
    qualities:[{label:"Throbbing"},{label:"One-sided"},{label:"Light-sensitive"},{label:"Nausea"},{label:"Aura"},{label:"Neck tension"}],
    keep:[{label:"How I slept"},{label:"What I ate"},{label:"Stress level"},{label:"What helped"},{label:"Where it hurt"},{label:"Cycle timing"}] },
  "Sleep": { noun:"restless night", thread:"Sleep", when:"When was the last rough night?",
    qualities:[{label:"Slow to drop off"},{label:"Woke up often"},{label:"Awake too early"},{label:"Racing mind"},{label:"Vivid dreams"},{label:"Groggy after"}],
    keep:[{label:"When I went to bed"},{label:"What I ate"},{label:"Stress level"},{label:"What helped"},{label:"Caffeine"},{label:"Screen time"}], skip:"Poor sleep" },
  "Energy": { noun:"flat stretch", thread:"Energy", when:"When did you last feel it?",
    qualities:[{label:"Afternoon crash"},{label:"Foggy"},{label:"Heavy limbs"},{label:"Wired but tired"},{label:"Better after eating"},{label:"Better outdoors"}],
    keep:[{label:"How I slept"},{label:"What I ate"},{label:"Stress level"},{label:"What helped"},{label:"Movement"},{label:"Cycle timing"}] },
  "Stomach": { noun:"flare", thread:"Stomach", when:"When did it last flare up?",
    qualities:[{label:"Bloating"},{label:"Cramping"},{label:"Nausea"},{label:"Reflux"},{label:"Urgency"},{label:"Eased after eating"}],
    keep:[{label:"What I ate"},{label:"When I ate"},{label:"Stress level"},{label:"What helped"},{label:"How I slept"},{label:"Cycle timing"}] },
  "Stress": { noun:"heavy day", thread:"Stress", when:"When was the last heavy day?",
    qualities:[{label:"Tight chest"},{label:"Racing thoughts"},{label:"Jaw tension"},{label:"Short fuse"},{label:"Couldn’t switch off"},{label:"Eased after moving"}],
    keep:[{label:"How I slept"},{label:"What I ate"},{label:"What helped"},{label:"Who I was with"},{label:"Movement"},{label:"Workload"}], skip:"Busy / stressful" },
};

const CONTEXT: Choice[] = [
  {label:"Poor sleep",icon:"☾"},{label:"Skipped a meal",icon:"○"},{label:"Busy / stressful",icon:"⌁"},
  {label:"Different caffeine",icon:"◐"},{label:"Long screen time",icon:"▣"},{label:"Nothing unusual",icon:"·"},
];

// The first noticing is built from what you actually picked, so it reads as
// Oomi having listened rather than a canned reveal.
const NOTICED: Record<string,{lead:string;watch:string}> = {
  "Poor sleep":{lead:"Sleep",watch:"sleep"},
  "Skipped a meal":{lead:"Meals",watch:"meals"},
  "Busy / stressful":{lead:"Stress",watch:"stress"},
  "Different caffeine":{lead:"Caffeine",watch:"caffeine"},
  "Long screen time":{lead:"Screen time",watch:"screens"},
  "Nothing unusual":{lead:"",watch:"baseline"},
};

const OPENING: Step = { mode:"signal", kicker:"Begin anywhere", title:"What’s been on your mind?",
  body:"No forms. No diagnosis. Just a thread worth following.",
  choices:[{label:"Migraines",icon:"◒"},{label:"Sleep",icon:"☾"},{label:"Energy",icon:"✦"},{label:"Stomach",icon:"≈"},{label:"Stress",icon:"⌁"},{label:"Just curious",icon:"·"}],
  cta:"Follow this thread" };

// "Just curious" used to funnel into the migraine script, which quietly broke the
// promise above. It gets its own shorter path: nothing to report, just a baseline.
const CURIOUS: Step[] = [
  OPENING,
  { mode:"circle", kicker:"Nothing has to be wrong", title:"What would you like to keep an eye on?", body:"Pick anything you’re mildly wondering about.", multi:true,
    choices:[{label:"Sleep",icon:"☾"},{label:"Energy",icon:"✦"},{label:"Mood",icon:"◑"},{label:"Movement",icon:"⌁"},{label:"Meals",icon:"○"},{label:"Cycle",icon:"◒"}], cta:"Continue" },
  { mode:"aura", kicker:"Your rhythm", title:"How often feels right?", body:"You can change this whenever you like.",
    choices:[{label:"Most days"},{label:"A few times a week"},{label:"Weekly"},{label:"Only when something changes"}], cta:"That fits" },
  { mode:"hourglass", kicker:"A first noticing", title:"Your baseline starts today.", body:"There’s nothing to compare yet—and that’s the point. Everything from here is a before-and-after you’ll actually have.", stat:"day 1 of your record", cta:"Keep following it" },
  { mode:"weave", kicker:"For future you", title:"What would you want to remember?", body:"Choose the details that might matter later.", multi:true,
    choices:[{label:"How I slept"},{label:"What I ate"},{label:"Stress level"},{label:"What helped"},{label:"Movement"},{label:"Cycle timing"}], cta:"Create my Thread" },
  { mode:"heart", kicker:"One helpful connection", title:"Want Oomi to notice sleep patterns?", body:"Oomi can privately compare Apple Health sleep duration with what you’re watching.", permission:true,
    choices:[{label:"Connect Apple Health",icon:"♥"},{label:"Not now"}], cta:"Continue" },
  { mode:"profile", kicker:"You’re already underway", title:"This is your health story.", body:"A private, portable profile has begun—made from what matters to you.", finish:true, stat:"You choose what leaves your phone", cta:"See your first two years" },
];

function buildSteps(topicLabel:string, context:string[]):Step[]{
  if(topicLabel==="Just curious"||!TOPICS[topicLabel]) return CURIOUS;
  const t=TOPICS[topicLabel];
  const first=context.find(c=>NOTICED[c]&&NOTICED[c].lead)||context[0]||"";
  const n=NOTICED[first];
  const noticed:Step = n&&n.lead
    ? { mode:"hourglass", kicker:"A first noticing", title:`${n.lead} may be part of your story.`,
        body:`“${first}” appeared beside your last ${t.noun}. Not a conclusion—just a thread worth watching.`,
        stat:`${n.watch} ↔ ${t.noun}`, cta:"Keep following it" }
    : { mode:"hourglass", kicker:"A first noticing", title:"No obvious trigger—also useful.", body:`A ${t.noun} with nothing unusual around it is a data point too. Oomi will keep watching for what repeats.`, stat:`baseline ↔ ${t.noun}`, cta:"Keep following it" };
  return [
    OPENING,
    { mode:"circle", kicker:"One remembered moment", title:t.when, body:"A rough answer is perfect.",
      choices:[{label:"Today"},{label:"A few days ago"},{label:"Last week"},{label:"It’s been a while"}], cta:"Continue" },
    { mode:"aura", kicker:"The feeling of it", title:"What did it feel like?", body:"Choose as many as fit.", multi:true, choices:t.qualities, cta:"That’s about right" },
    { mode:"knot", kicker:"The edges of the day", title:"What was happening around it?", body:"Sometimes context reveals the shape.", multi:true, choices:CONTEXT.filter(c=>c.label!==t.skip), cta:"See what Oomi noticed" },
    noticed,
    { mode:"weave", kicker:"For future you", title:"What would you want to remember?", body:"Choose the details that might matter later.", multi:true, choices:t.keep, cta:"Create my Thread" },
    { mode:"heart", kicker:"One helpful connection", title:`Want Oomi to notice ${n?n.watch:"sleep"} patterns?`, body:`Oomi can privately compare Apple Health with your ${t.thread} Thread.`, permission:true,
      choices:[{label:"Connect Apple Health",icon:"♥"},{label:"Not now"}], cta:"Continue" },
    { mode:"profile", kicker:"You’re already underway", title:"This is your health story.", body:"A private, portable profile has begun—made from what matters to you.", finish:true, stat:"You choose what leaves your phone", cta:"See your first two years" },
  ];
}

function ThreadCanvas({mode}:{mode:string}){
  const ref=useRef<HTMLCanvasElement>(null); const modeRef=useRef(mode);
  useEffect(()=>{modeRef.current=mode},[mode]);
  useEffect(()=>{const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext("2d");if(!ctx)return;let frame=0,raf=0;
    const resize=()=>{const d=Math.min(devicePixelRatio,2);const r=canvas.getBoundingClientRect();canvas.width=Math.max(1,r.width*d);canvas.height=Math.max(1,r.height*d);ctx.setTransform(d,0,0,d,0,0)};resize();
    const draw=()=>{const w=canvas.clientWidth,h=canvas.clientHeight,cx=w/2,cy=h/2,t=frame++*.012;ctx.clearRect(0,0,w,h);ctx.lineWidth=.8;ctx.lineCap="round";
      for(let j=0;j<11;j++){ctx.beginPath();ctx.strokeStyle=`rgba(255,255,238,${.22+j*.035})`;const spread=(j-5)*4;
        for(let i=0;i<=180;i++){const u=i/180*Math.PI*2;let x=cx,y=cy;const m=modeRef.current;
          if(m==="signal"){x=i/180*w;y=cy+Math.sin(u*1.45+t+j*.1)*(14+j*3)+Math.sin(u*4+t)*4}
          else if(m==="circle"){const r=65+j*7;x=cx+Math.cos(u+t*.08)*r;y=cy+Math.sin(u)*r*.78}
          else if(m==="aura"){const r=45+j*10;x=cx+Math.cos(u+t*.1)*r;y=cy+Math.sin(u)*r*.62+Math.sin(u*3+t)*5}
          else if(m==="knot"){x=cx+Math.sin(u*2+t*.12)*(95+j*5);y=cy+Math.sin(u*3)*(48+j*3)}
          else if(m==="hourglass"){x=cx+Math.sin(u)*(82+j*6);y=cy+Math.sin(u*2)*(70+j*3)}
          else if(m==="weave"){x=cx+Math.sin(u*3+t*.1)*(62+j*5);y=cy+Math.cos(u*2)*(64+j*3)}
          else if(m==="timeline"){x=i/180*w;y=cy+Math.sin(u+t+j*.12)*(22+j*2)+(i/180-.5)*spread}
          else if(m==="pulse"){x=i/180*w;const q=Math.exp(-Math.pow((i/180-.5)*9,2));y=cy+Math.sin(u*2+j*.08)*5-q*Math.sin(u*5)*52-spread*.15}
          else if(m==="heart"){const s=4.5+j*.18;x=cx+s*16*Math.pow(Math.sin(u),3);y=cy-s*(13*Math.cos(u)-5*Math.cos(2*u)-2*Math.cos(3*u)-Math.cos(4*u))*.72}
          else {const r=55+j*7+Math.sin(u*4+t)*9;x=cx+Math.cos(u+t*.05)*r;y=cy+Math.sin(u)*r}
          if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke()}
      ctx.beginPath();ctx.arc(cx,cy,4.5+Math.sin(t)*1.2,0,Math.PI*2);ctx.fillStyle="#eeff37";ctx.fill();raf=requestAnimationFrame(draw)};
    draw();window.addEventListener("resize",resize);return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize)}},[]);
  return <canvas ref={ref} className="thread-canvas" aria-hidden="true"/>;
}

// The status bar previously ended in U+1006E8, a private-use SF Symbols codepoint.
// It only draws on Apple platforms with SF Pro loaded; everywhere else it is a tofu box.
// Drawn in markup instead so the device frame reads correctly on any platform.
function StatusBar(){return <header className="status"><span>9:41</span><span className="island"/><span className="status-right"><b>5G</b><span className="battery" role="img" aria-label="Battery 78 percent"><i/></span></span></header>}

function Icon({name}:{name:string}){return <span className="material-symbols-rounded" aria-hidden="true">{name}</span>}
function OomiMark({compact=false}:{compact?:boolean}){return <div className={`mark ${compact?"compact":""}`} aria-label="Oomi"><img src={compact?"/oomi-logo.svg":"/oomi-logotype.svg"} alt=""/></div>}

// Every answer visibly lands somewhere. Without this the first four steps are
// pure interrogation -- you give and give and Oomi says nothing back until the
// noticing. Here the thread is literally assembled in front of you.
function Strand({picks}:{picks:string[]}){
  if(!picks.length) return null;
  return <div className="strand"><span className="strand-label">YOUR THREAD</span>
    <div className="strand-chips">{picks.map((p,i)=><span key={p+i} style={{animationDelay:`${Math.max(0,picks.length-1-i)*-0.06}s`}}>{p}</span>)}</div>
  </div>;
}

function BrandGuide({onClose}:{onClose:()=>void}){
  return <main className="brand-guide">
    <header className="brand-nav"><OomiMark/><button onClick={onClose}><span>Return to prototype</span><Icon name="close"/></button></header>
    <section className="brand-hero"><div className="brand-orbit"><ThreadCanvas mode="hourglass"/></div><p className="brand-eyebrow">OOMI · LIVING BRAND GUIDE</p><h1>Follow what<br/>makes you, you.</h1><p className="brand-lede">A quiet visual language for a health story that belongs to one person—and stays with them.</p><span className="scroll-cue">SCROLL TO EXPLORE <Icon name="south"/></span></section>
    <section className="brand-section brand-belief"><div className="section-number">01</div><div><p className="brand-eyebrow">THE IDEA</p><h2>Not a medical record.<br/>A living memory.</h2></div><div className="belief-copy"><p>Oomi turns scattered moments into a continuous thread—without reducing a person to a score, diagnosis, or dashboard.</p><p className="sovereignty-line"><i/> You choose what leaves your phone.</p></div></section>
    <section className="brand-section logo-showcase"><div className="section-number">02</div><div className="logo-field"><img src="/oomi-logotype.svg" alt="Oomi"/><p>The linked forms suggest continuity, reciprocity, and two points becoming a relationship.</p></div><div className="symbol-field"><img src="/oomi-logo.svg" alt="Oomi symbol"/><span>THE THREADMARK</span></div></section>
    <section className="brand-section type-section"><div className="section-number">03</div><p className="brand-eyebrow">TYPOGRAPHY · INSTRUMENT SANS</p><div className="type-sample"><span>Aa</span><h2>Warm precision,<br/>without the clinic.</h2></div><div className="type-scale"><div><b>56</b><span>Display / 1.0</span></div><div><b>30</b><span>Title / 1.05</span></div><div><b>16</b><span>Body / 1.5</span></div><p>Use one generous, open family. Let scale and space create hierarchy—never compression.</p></div></section>
    <section className="brand-section color-section"><div className="section-number">04</div><div><p className="brand-eyebrow">COLOR AS ATMOSPHERE</p><h2>Alive, never loud.</h2><p>Deep teal is home. Moss, mineral blue, soft violet, and amber drift through it as the story changes. Signal yellow marks moments worth noticing.</p></div><div className="gradient-gallery"><div className="gradient-card g-one"><i/></div><div className="gradient-card g-two"><i/></div><div className="gradient-card g-three"><i/></div><div className="swatch-row"><span>#071B16</span><span>#376A50</span><span>#EDFF3F</span></div></div></section>
    <section className="brand-section line-section"><div className="section-number">05</div><div className="line-stage"><ThreadCanvas mode="weave"/><span>ONE LINE · MANY STATES</span></div><div><p className="brand-eyebrow">THE LIVING THREAD</p><h2>Illustration that remembers.</h2><p>The line stretches, knots, pulses, overlaps, and resolves. It behaves like information becoming understanding—thin, full-bleed, and always in motion.</p></div></section>
    <section className="brand-section icon-section"><div className="section-number">06</div><div><p className="brand-eyebrow">ICONOGRAPHY</p><h2>Open, rounded,<br/>immediately legible.</h2><p>Material Symbols Rounded at a light weight. Icons support the action; they never become decoration.</p></div><div className="icon-grid">{["timeline","shield_lock","bedtime","favorite","medication","ios_share","fingerprint","clinical_notes"].map(x=><div key={x}><Icon name={x}/></div>)}</div></section>
    <section className="brand-section motion-section"><div className="section-number">07</div><div className="motion-dot"/><div><p className="brand-eyebrow">MOTION</p><h2>Gentle evidence<br/>of life.</h2><p>Elements arrive with calm deceleration. Gradients breathe. The yellow point responds. Nothing bounces, nags, or demands attention.</p><div className="motion-spec"><span>420ms</span><code>cubic-bezier(.22, 1, .36, 1)</code></div></div></section>
    <footer className="brand-footer"><img src="/oomi-logotype.svg" alt="Oomi"/><h2>Your story is already taking shape.</h2><button onClick={onClose}>Experience the prototype <Icon name="arrow_outward"/></button><small>Private by default · Portable by design</small></footer>
  </main>
}

const journalMilestones = [
  { day:0, mode:"signal", date:"Today", title:"Your story starts here.", note:"One remembered moment. One thread to follow.", moments:1, threads:1, insight:"Nothing to prove. Just notice." },
  { day:30, mode:"circle", date:"Month 1", title:"A rhythm is forming.", note:"Poor sleep appeared before 4 of 6 {noun}s.", moments:14, threads:2, insight:"Sleep may be part of your {thread} story." },
  { day:90, mode:"aura", date:"Month 3", title:"The edges are clearer.", note:"{thread} shows up less on weeks with steady wake times.", moments:38, threads:3, insight:"Consistency—not total sleep—may matter more." },
  { day:180, mode:"knot", date:"Month 6", title:"Another thread joins.", note:"Low-energy afternoons often follow skipped lunches.", moments:67, threads:4, insight:"Energy and meals seem to move together." },
  { day:365, mode:"hourglass", date:"Year 1", title:"A year, remembered.", note:"You found three things that reliably help—and shared one clear page with your doctor.", moments:128, threads:5, insight:"Early hydration shortened 7 rough stretches." },
  { day:540, mode:"weave", date:"Month 18", title:"Your patterns overlap.", note:"Cycle timing, sleep, and tension now tell a more complete story together.", moments:176, threads:6, insight:"Three signals tend to converge 24–48 hours before." },
  { day:730, mode:"profile", date:"Year 2", title:"Two years of you.", note:"Not a medical record. A living memory you understand and control.", moments:241, threads:6, insight:"Your profile travels with you—not the other way around." },
];

const fill=(s:string,t:Topic)=>s.replace(/\{noun\}/g,t.noun).replace(/\{thread\}/g,t.thread);

// The demo's best idea is time passing, and it used to happen in a cut: one tap
// from "Enter Oomi" to Day 730 with 241 moments already banked. Now you watch it
// accumulate, and you can drag back through it.
function Passage({topic,onDone}:{topic:Topic;onDone:()=>void}){
  // `run` carries the day the playhead starts from, so the effect never has to
  // read `day` back out mid-flight -- no ref written during render.
  const [day,setDay]=useState(0); const [run,setRun]=useState<{from:number}|null>({from:0});
  const playing=run!==null;
  useEffect(()=>{
    if(!run||run.from>=730) return; const {from}=run, dur=6400*(1-from/730);
    let raf=0,start=0;
    const tick=(ts:number)=>{ if(!start) start=ts;
      const p=Math.min(1,(ts-start)/dur); const eased=1-Math.pow(1-p,2.2);
      setDay(Math.round(from+(730-from)*eased));
      if(p<1) raf=requestAnimationFrame(tick); else setRun(null) };
    raf=requestAnimationFrame(tick); return ()=>cancelAnimationFrame(raf);
  },[run]);

  const ms=journalMilestones;
  let i=0; while(i<ms.length-1 && ms[i+1].day<=day) i++;
  const a=ms[i], b=ms[Math.min(i+1,ms.length-1)];
  const k=b.day===a.day?1:Math.min(1,Math.max(0,(day-a.day)/(b.day-a.day)));
  const moments=Math.round(a.moments+(b.moments-a.moments)*k);
  const threads=Math.round(a.threads+(b.threads-a.threads)*k);

  return <main className="stage passage-stage">
    <section className="phone" aria-label="Two years of your thread">
      <div className="wash"/><div className="grain"/>
      <StatusBar/>
      <nav className="topbar"><span/><OomiMark/><button className="quiet" onClick={onDone}>Skip</button></nav>
      <div className="progress"><span style={{width:`${(day/730)*100}%`}}/></div>
      <div className="visual"><ThreadCanvas mode={a.mode}/><span className="visual-label">DAY {day}</span></div>
      <div className="screen passage-screen">
        <p className="kicker">{a.date}</p>
        <h1>{fill(a.title,topic)}</h1>
        <p className="bodycopy">{fill(a.note,topic)}</p>
        <div className="passage-stats">
          <div><b>{moments}</b><span>Moments</span></div>
          <div><b>{threads}</b><span>Threads</span></div>
          <div><b>{Math.max(1,Math.round(day/7))}</b><span>Weeks</span></div>
        </div>
        <div className="noticed"><i/><div><small>OOMI NOTICED</small><strong>{fill(a.insight,topic)}</strong></div></div>
      </div>
      <div className="passage-scrub">
        <input type="range" min={0} max={730} value={day} aria-label="Move through time"
          onPointerDown={()=>setRun(null)} onChange={e=>{setRun(null);setDay(Number(e.target.value))}}/>
        <div className="time-labels"><span>DAY 0</span><b>{playing?"Two years, unfolding":"Drag to move through time"}</b><span>YEAR 2</span></div>
      </div>
      <footer><button className="primary" onClick={onDone}><span>Enter your journal</span><b>↗</b></button><small>Nothing here has left your phone</small></footer>
    </section>
    <aside><OomiMark/><p>Time, made visible</p><h2>Two years,<br/>a few seconds.</h2><small>Let it run, or drag the scrubber<br/>to move through your own history.</small></aside>
  </main>;
}

const NOTE_SCALE=[{label:"Clear",icon:"○"},{label:"Faint",icon:"◔"},{label:"Building",icon:"◑"},{label:"Strong",icon:"●"}];

function Journal({topic,onRestart}:{topic:Topic;onRestart:()=>void}){
  const [tab,setTab]=useState<"timeline"|"vault"|"settings">("timeline"); const [open,setOpen]=useState<number|null>(730); const [tone,setTone]=useState(0); const [clinicStep,setClinicStep]=useState(0);
  const [note,setNote]=useState<string|null>(null);
  useEffect(()=>{if(clinicStep!==2)return;const timer=setTimeout(()=>setClinicStep(3),2800);return()=>clearTimeout(timer)},[clinicStep]);
  const events=[...journalMilestones].reverse();
  const scroll=(e:React.UIEvent<HTMLDivElement>)=>{const el=e.currentTarget;const ratio=el.scrollTop/Math.max(1,el.scrollHeight-el.clientHeight);setTone(Math.min(5,Math.floor(ratio*6)));const focus=el.scrollTop+el.clientHeight*.38;const nodes=Array.from(el.querySelectorAll<HTMLElement>("[data-day]"));const nearest=nodes.sort((a,b)=>Math.abs(a.offsetTop-focus)-Math.abs(b.offsetTop-focus))[0];if(nearest)setOpen(Number(nearest.dataset.day))};
  return <main className={`stage mature-stage timeline-tone-${tone}`}>
    <section className="phone mature-phone" aria-label="Oomi private health journal">
      <div className="wash"/><div className="grain"/><StatusBar/>
      <nav className="appbar"><button onClick={onRestart} aria-label="Back to onboarding"><Icon name="arrow_back"/></button><img className="nav-avatar" src="/pixavatar.png" alt="Jack"/><div><small>YOUR JOURNAL</small><b>{tab==="timeline"?"Two years":tab==="vault"?"Data vault":"Jack"}</b></div><button aria-label="More options"><Icon name="more_horiz"/></button></nav>
      {tab==="timeline"&&<div className="timeline-scroll" onScroll={scroll}>
        <header className="timeline-intro"><p className="kicker">Day 730 · Today</p><h1>Your story,<br/>held together.</h1><p>{241+(note?1:0)} moments across six Threads. Tap any layer to open it.</p></header>
        {/* Logging a moment belongs here, in the thing you actually keep -- not
            wedged into first-run onboarding after the Thread already exists. */}
        <div className={`today-note ${note?"saved":""}`}>
          {!note ? <>
            <p className="kicker">Today · {topic.thread}</p><b>How are you feeling now?</b>
            <div className="note-scale">{NOTE_SCALE.map(o=><button key={o.label} onClick={()=>setNote(o.label)}><span>{o.icon}</span><em>{o.label}</em></button>)}</div>
          </> : <>
            <p className="kicker">Saved · just now</p><b>{note} — added to {topic.thread}</b>
            <button className="note-undo" onClick={()=>setNote(null)}>Change <Icon name="undo"/></button>
          </>}
        </div>
        <div className="timeline-line" aria-hidden="true"/>
        {events.map((item,index)=><article data-day={item.day} className={`timeline-event ${open===item.day?"expanded":""}`} key={item.day}>
          <button className="event-summary" onClick={()=>setOpen(open===item.day?null:item.day)} aria-expanded={open===item.day}>
            <span className="yellow-node"/><div><small>{item.date} · DAY {item.day}</small><h2>{fill(item.title,topic)}</h2></div><em><Icon name={open===item.day?"remove":"add"}/></em>
          </button>
          <div className="event-detail"><div className="event-art"><ThreadCanvas mode={item.mode}/></div><p>{fill(item.note,topic)}</p><div className="noticed"><i/><div><small>OOMI NOTICED</small><strong>{fill(item.insight,topic)}</strong></div></div><div className="detail-tags"><span>{topic.thread}</span>{item.day>0&&<span>Sleep</span>}{item.day>160&&<span>Energy</span>}</div></div>
          {index<events.length-1&&<span className="between-label">{events[index].day-events[index+1].day} days</span>}
        </article>)}
        <div className="timeline-origin"><span className="yellow-node"/><small>DAY 0</small><b>Your first thread began.</b></div>
      </div>}
      {tab==="vault"&&<div className="vault-scroll">
        <header className="section-intro"><p className="kicker">Private by design</p><h1>All of your data.<br/>Still yours.</h1><p>Stored on this phone. Nothing leaves unless you choose it.</p></header>
        <div className="privacy-seal"><OomiMark compact/><div><small>LOCAL PROFILE</small><b>Private &amp; encrypted</b></div><span>✓</span></div>
        <div className="vault-stats"><div><b>{241+(note?1:0)}</b><span>Moments</span></div><div><b>6</b><span>Threads</span></div><div><b>2</b><span>Sources</span></div></div>
        <h3>What your profile holds</h3>
        {["Journal entries · 114 KB","Apple Health sleep · 82 KB","Medication history · 18 KB","Shared visit summaries · 3 files"].map((x,i)=><button className="data-row" key={x}><i><Icon name={["edit_note","bedtime","medication","ios_share"][i]}/></i><span>{x}</span><em><Icon name="chevron_right"/></em></button>)}
        <div className="control-card"><small>YOUR CONTROL</small><p>Export a portable copy, review every permission, or erase everything—at any time.</p><button className="glass-cta">Manage my data <Icon name="arrow_outward"/></button></div>
      </div>}
      {tab==="settings"&&<div className="settings-scroll">
        <header className="profile-head"><img src="/pixavatar.png" alt="Jack"/><div><p className="kicker">Your account</p><h1>Jack</h1><span>jack@icloud.com</span></div></header>
        <section className="settings-group"><h3>Connected to Oomi</h3>{[["cloud","iCloud","Profile & encrypted backup","Connected"],["favorite","Apple Health","Sleep & activity","Connected"],["clinical_notes","Health Records","Riverside Neurology","Connected"],["ring_volume","Oura","Sleep stages","Optional"]].map(x=><button className="connection-row" key={x[1]}><Icon name={x[0]}/><div><b>{x[1]}</b><span>{x[2]}</span></div><em>{x[3]}</em></button>)}</section>
        <section className="visit-card"><div className="visit-title"><Icon name="medical_services"/><div><small>UPCOMING VISIT</small><b>Riverside Neurology</b><span>Today · 2:30 PM</span></div></div>
          {clinicStep===0&&<><p>Prepare a temporary view with only the four layers relevant to this appointment.</p><button className="glass-cta" onClick={()=>setClinicStep(1)}>Prepare visit <Icon name="arrow_outward"/></button></>}
          {clinicStep===1&&<><div className="visit-ready"><Icon name="check_circle"/><div><b>Visit view ready</b><span>4 layers · expires in 24 hours</span></div></div><button className="glass-cta" onClick={()=>setClinicStep(2)}>Share &amp; check in <Icon name="arrow_outward"/></button></>}
          {clinicStep===2&&<div className="wallet-sim" aria-label="Authenticating with Face ID"><div className="wallet-stack"><i/><i/><div className="oomi-pass"><img src="/oomi-logotype.svg" alt="Oomi"/><small>RIVERSIDE NEUROLOGY</small><b>Visit access</b><span>4 layers · expires in 24 hours</span><em>PRIVATE</em></div></div><div className="face-id"><span/><span/><span/><span/><i/></div><p>Authenticating with Face ID…</p></div>}
          {clinicStep>=3&&<div className="visit-ready complete"><Icon name="verified_user"/><div><b>You’re checked in</b><span>You can stop sharing at any time.</span></div></div>}
        </section>
        <button className="plain-setting"><Icon name="notifications"/><span>Notifications</span><Icon name="chevron_right"/></button><button className="plain-setting"><Icon name="lock"/><span>Privacy &amp; permissions</span><Icon name="chevron_right"/></button>
      </div>}
      <nav className="bottom-nav"><button className={tab==="timeline"?"active":""} onClick={()=>setTab("timeline")}><Icon name="timeline"/><b>Timeline</b></button><button className={tab==="vault"?"active":""} onClick={()=>setTab("vault")}><Icon name="shield_lock"/><b>My data</b></button><button className={tab==="settings"?"active":""} onClick={()=>setTab("settings")}><Icon name="person"/><b>You</b></button></nav>
    </section>
    <aside><OomiMark/><p>Private continuity</p><h2>Your history,<br/>layer by layer.</h2><small>Scroll the timeline, inspect your data vault,<br/>then review your connected health world.</small></aside>
  </main>
}

export default function Home(){
  const [step,setStep]=useState(0); const [phase,setPhase]=useState<"onboard"|"passage"|"journal">("onboard"); const [brand,setBrand]=useState(false);
  const [selections,setSelections]=useState<Record<number,string[]>>({});
  const topicLabel=(selections[0]||[])[0]||"";
  const steps=useMemo(()=>buildSteps(topicLabel,selections[3]||[]),[topicLabel,selections]);
  const topic=TOPICS[topicLabel]||{noun:"moment",thread:"Your thread",when:"",qualities:[],keep:[]};
  const current=steps[Math.min(step,steps.length-1)]; const selected=selections[step]||[];
  const progress=((step+1)/steps.length)*100;
  const picks=useMemo(()=>Object.keys(selections).map(Number).sort((a,b)=>a-b).flatMap(i=>i<=step?selections[i]:[]),[selections,step]);
  const stageRef=useRef<HTMLElement>(null); const cursorTarget=useRef({x:50,y:40}); const cursorNow=useRef({x:50,y:40}); const cursorRaf=useRef(0);
  useEffect(()=>()=>cancelAnimationFrame(cursorRaf.current),[]);
  const choose=(choice:Choice)=>{const exists=selected.includes(choice.label);setSelections({...selections,[step]:current.multi?(exists?selected.filter(x=>x!==choice.label):[...selected,choice.label]):[choice.label]})};
  const advance=()=>step<steps.length-1?setStep(step+1):setPhase("passage");
  const react=(e:React.PointerEvent<HTMLElement>)=>{const r=e.currentTarget.getBoundingClientRect();cursorTarget.current={x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100};if(cursorRaf.current)return;const drift=()=>{const now=cursorNow.current,target=cursorTarget.current;now.x+=(target.x-now.x)*.018;now.y+=(target.y-now.y)*.018;stageRef.current?.style.setProperty("--x",`${now.x}%`);stageRef.current?.style.setProperty("--y",`${now.y}%`);if(Math.abs(target.x-now.x)+Math.abs(target.y-now.y)>.08)cursorRaf.current=requestAnimationFrame(drift);else cursorRaf.current=0};cursorRaf.current=requestAnimationFrame(drift)};
  const restart=()=>{setPhase("onboard");setStep(0);setSelections({})};
  if(brand)return <BrandGuide onClose={()=>setBrand(false)}/>;
  if(phase==="passage")return <Passage topic={topic} onDone={()=>setPhase("journal")}/>;
  if(phase==="journal")return <Journal topic={topic} onRestart={restart}/>;
  return <main ref={stageRef} className={`stage wash-${step}`} onPointerMove={react}>
    <section className="phone" aria-label="Oomi onboarding prototype">
      <div className="wash"/><div className="grain"/>
      <StatusBar/>
      <nav className="topbar">{step>0?<button className="back" onClick={()=>setStep(step-1)} aria-label="Go back">←</button>:<span/>}<OomiMark/><button className="quiet" onClick={restart}>Reset</button></nav>
      <div className="progress"><span style={{width:`${progress}%`}}/></div>
      <div className="visual" key={`v${step}`}><ThreadCanvas mode={current.mode}/><span className="visual-label">{String(step+1).padStart(2,"0")} / {String(steps.length).padStart(2,"0")}</span></div>
      <div className="screen" key={step}>
        <Strand picks={picks}/>
        <p className="kicker">{current.kicker}</p><h1>{current.title}</h1><p className="bodycopy">{current.body}</p>
        {current.stat&&<div className="stat"><i/><span>{current.stat}</span></div>}
        {current.choices&&<div className={`choices ${current.permission?"permission-choices":""}`}>{current.choices.map(choice=><button key={choice.label} className={selected.includes(choice.label)?"selected":""} onClick={()=>choose(choice)}>{choice.icon&&<span>{choice.icon}</span>}<b>{choice.label}</b><em>{selected.includes(choice.label)?"●":"○"}</em></button>)}</div>}
        {current.permission&&<p className="fineprint">Apple Health will ask you to confirm. Oomi never writes without asking.</p>}
      </div>
      <footer><button className="primary" disabled={!!current.choices&&!selected.length} onClick={advance}><span>{current.cta}</span><b>↗</b></button><small>{current.finish?"Private by default":"Your answers stay on this device"}</small></footer>
    </section>
    <aside><OomiMark/><p>Follow what matters.</p><h2>One thread,<br/>taking shape.</h2><small>Move your cursor through the wash.<br/>Tap through to see the Thread transform.</small><button className="explore-brand" onClick={()=>setBrand(true)}>Explore the brand <Icon name="arrow_outward"/></button></aside>
  </main>
}
