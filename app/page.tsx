"use client";

import { useEffect, useRef, useState } from "react";

type Choice = { label: string; icon?: string };

// ---------------------------------------------------------------------------
// A thread is a series of moments in time. Everything visual derives from this.
// ---------------------------------------------------------------------------
type Moment = { day:number; intensity:number; note?:string };
type Noticing = { day:number; text:string };
type Thread = { key:string; name:string; noun:string; span:number; moments:Moment[]; noticings:Noticing[] };

type Topic = { noun:string; thread:string; qualities:Choice[]; seed:number; shape:{count:number;lo:number;hi:number;clump?:number} };

const TOPICS: Record<string, Topic> = {
  "Migraines": { noun:"migraine", thread:"Migraines", seed:1207, shape:{count:7,lo:.72,hi:1,clump:4},
    qualities:[{label:"Throbbing"},{label:"One-sided"},{label:"Light-sensitive"},{label:"Nausea"},{label:"Aura"},{label:"Neck tension"}] },
  "Sleep": { noun:"restless night", thread:"Sleep", seed:8841, shape:{count:26,lo:.28,hi:.68},
    qualities:[{label:"Slow to drop off"},{label:"Woke up often"},{label:"Awake too early"},{label:"Racing mind"},{label:"Vivid dreams"},{label:"Groggy after"}] },
  "Energy": { noun:"flat stretch", thread:"Energy", seed:3319, shape:{count:14,lo:.4,hi:.8,clump:3},
    qualities:[{label:"Afternoon crash"},{label:"Foggy"},{label:"Heavy limbs"},{label:"Wired but tired"},{label:"Better after eating"},{label:"Better outdoors"}] },
  "Stomach": { noun:"flare", thread:"Stomach", seed:6502, shape:{count:11,lo:.5,hi:.92,clump:5},
    qualities:[{label:"Bloating"},{label:"Cramping"},{label:"Nausea"},{label:"Reflux"},{label:"Urgency"},{label:"Eased after eating"}] },
  "Stress": { noun:"heavy day", thread:"Stress", seed:4478, shape:{count:18,lo:.45,hi:.95,clump:2},
    qualities:[{label:"Tight chest"},{label:"Racing thoughts"},{label:"Jaw tension"},{label:"Short fuse"},{label:"Couldn’t switch off"},{label:"Eased after moving"}] },
};

const SPAN = 90; // the line always shows the last ~3 months

// Seeded so a thread's signature is stable across reloads -- the whole point is
// that your Sleep line is recognisably *your* Sleep line.
const prng=(seed:number)=>{let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}};

function makeThread(key:string, t:Topic):Thread{
  const r=prng(t.seed); const {count,lo,hi,clump}=t.shape;
  const centres = clump ? Array.from({length:clump},()=>r()*SPAN*.92) : null;
  const moments:Moment[]=[];
  for(let i=0;i<count;i++){
    const day = centres
      ? Math.min(SPAN, Math.max(0, centres[Math.floor(r()*centres.length)] + (r()-.5)*SPAN*.09))
      : r()*SPAN;
    moments.push({day, intensity: lo + r()*(hi-lo)});
  }
  moments.sort((a,b)=>a.day-b.day);
  return {key, name:t.thread, noun:t.noun, span:SPAN, moments, noticings:[]};
}

// ---------------------------------------------------------------------------
// STEP 1 -- the line renders the data.
// Previously ThreadCanvas took mode="knot" and drew an arbitrary shape: pretty,
// but "knot" was never a fact about you. Here x is time, height is how much was
// going on, and the strands braid tight where moments cluster and drift apart
// where nothing happened. Same brand texture, now load-bearing.
// ---------------------------------------------------------------------------
function ThreadLine({thread,strands=11,showNow=true}:{thread:Thread;strands?:number;showNow?:boolean}){
  const ref=useRef<HTMLCanvasElement>(null);
  const live=useRef({thread,showNow});
  useEffect(()=>{live.current={thread,showNow}},[thread,showNow]);
  useEffect(()=>{
    const canvas=ref.current; if(!canvas) return;
    const ctx=canvas.getContext("2d"); if(!ctx) return;
    let raf=0, frame=0;
    const resize=()=>{const d=Math.min(devicePixelRatio,2);const r=canvas.getBoundingClientRect();
      canvas.width=Math.max(1,r.width*d);canvas.height=Math.max(1,r.height*d);ctx.setTransform(d,0,0,d,0,0)};
    resize();
    const draw=()=>{
      const {thread:th,showNow:now}=live.current;
      const w=canvas.clientWidth,h=canvas.clientHeight,cy=h*.56,t=frame++*.012;
      ctx.clearRect(0,0,w,h);
      const span=Math.max(1,th.span), sigma=span/44, amp=h*.2, spread=h*.03;
      // how much was going on around day d
      const act=(d:number)=>{let s=0;for(const m of th.moments){const k=(d-m.day)/sigma;if(k>-5&&k<5)s+=m.intensity*Math.exp(-k*k)}return s};
      const N=220; ctx.lineWidth=.8; ctx.lineCap="round";
      for(let j=0;j<strands;j++){
        ctx.beginPath(); ctx.strokeStyle=`rgba(255,255,238,${.18+j*.034})`;
        for(let i=0;i<=N;i++){
          const p=i/N, d=p*span, a=act(d);
          const tight=Math.min(1,a*.85);
          const fan=(j-(strands-1)/2)*spread*(1-tight*.84);
          const breathe=Math.sin(p*6.5+t+j*.15)*(1.4+(1-tight)*2.4);
          const x=p*w, y=cy-a*amp+fan+breathe;
          if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
        }
        ctx.stroke();
      }
      // Yellow means exactly one thing now: Oomi noticed something here.
      for(const n of th.noticings){
        const p=Math.min(1,n.day/span), x=p*w, y=cy-act(n.day)*amp;
        ctx.beginPath();ctx.arc(x,y,8.5+Math.sin(t*1.8)*1.6,0,Math.PI*2);
        ctx.strokeStyle="rgba(237,255,63,.32)";ctx.lineWidth=1;ctx.stroke();
        ctx.beginPath();ctx.arc(x,y,3.4,0,Math.PI*2);ctx.fillStyle="#edff3f";ctx.fill();
      }
      // "now" is an ink ring, not a yellow dot -- it isn't a noticing.
      if(now){
        const x=w-7, y=cy-act(span)*amp;
        ctx.beginPath();ctx.arc(x,y,4.4+Math.sin(t)*.9,0,Math.PI*2);
        ctx.strokeStyle="rgba(248,250,237,.85)";ctx.lineWidth=1.2;ctx.stroke();
      }
      raf=requestAnimationFrame(draw);
    };
    draw(); window.addEventListener("resize",resize);
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize)};
  },[strands]);
  return <canvas ref={ref} className="thread-canvas" aria-hidden="true"/>;
}

// The mode-based renderer stays, but only for the brand guide, where the shapes
// are deliberately abstract illustration rather than someone's data.
function ThreadCanvas({mode}:{mode:string}){
  const ref=useRef<HTMLCanvasElement>(null); const modeRef=useRef(mode);
  useEffect(()=>{modeRef.current=mode},[mode]);
  useEffect(()=>{const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext("2d");if(!ctx)return;let frame=0,raf=0;
    const resize=()=>{const d=Math.min(devicePixelRatio,2);const r=canvas.getBoundingClientRect();canvas.width=Math.max(1,r.width*d);canvas.height=Math.max(1,r.height*d);ctx.setTransform(d,0,0,d,0,0)};resize();
    const draw=()=>{const w=canvas.clientWidth,h=canvas.clientHeight,cx=w/2,cy=h/2,t=frame++*.012;ctx.clearRect(0,0,w,h);ctx.lineWidth=.8;ctx.lineCap="round";
      for(let j=0;j<11;j++){ctx.beginPath();ctx.strokeStyle=`rgba(255,255,238,${.22+j*.035})`;
        for(let i=0;i<=180;i++){const u=i/180*Math.PI*2;let x=cx,y=cy;const m=modeRef.current;
          if(m==="hourglass"){x=cx+Math.sin(u)*(82+j*6);y=cy+Math.sin(u*2)*(70+j*3)}
          else if(m==="weave"){x=cx+Math.sin(u*3+t*.1)*(62+j*5);y=cy+Math.cos(u*2)*(64+j*3)}
          else {const r=55+j*7+Math.sin(u*4+t)*9;x=cx+Math.cos(u+t*.05)*r;y=cy+Math.sin(u)*r}
          if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke()}
      ctx.beginPath();ctx.arc(cx,cy,4.5+Math.sin(t)*1.2,0,Math.PI*2);ctx.fillStyle="#eeff37";ctx.fill();raf=requestAnimationFrame(draw)};
    draw();window.addEventListener("resize",resize);return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize)}},[]);
  return <canvas ref={ref} className="thread-canvas" aria-hidden="true"/>;
}

function Icon({name}:{name:string}){return <span className="material-symbols-rounded" aria-hidden="true">{name}</span>}
function OomiMark({compact=false}:{compact?:boolean}){return <div className={`mark ${compact?"compact":""}`} aria-label="Oomi"><img src={compact?"/oomi-logo.svg":"/oomi-logotype.svg"} alt=""/></div>}

// ---------------------------------------------------------------------------
// Choosing a concern is choosing a line. This is the one place the line art
// earns being the control itself, instead of six identical capsules.
// ---------------------------------------------------------------------------
function ThreadPicker({onPick}:{onPick:(k:string)=>void}){
  const keys=Object.keys(TOPICS);
  return <div className="picker">
    <p className="kicker">Begin anywhere</p>
    <h1>What’s been on your mind?</h1>
    <p className="bodycopy">Every thread looks different. Pick one and we’ll start following it.</p>
    <div className="picker-list">
      {keys.map(k=><button key={k} className="picker-row" onClick={()=>onPick(k)}>
        <span className="picker-line"><ThreadLine thread={makeThread(k,TOPICS[k])} strands={6} showNow={false}/></span>
        <b>{TOPICS[k].thread}</b><em><Icon name="arrow_forward"/></em>
      </button>)}
    </div>
  </div>;
}

// ---------------------------------------------------------------------------
// STEP 2 -- Today. One conversation replaces the eight-step machine.
// Oomi speaks in the display face with no bubble; your replies sit indented
// beneath. Suggestions are capped at three and live only above the composer,
// so a pill means one thing: "say this without typing."
// ---------------------------------------------------------------------------
type Turn = { who:"oomi"|"you"; text:string; noticing?:boolean };

const HINTS:{k:string[];lead:string;watch:string}[] = [
  {k:["sleep","slept","sleeping","asleep","tired","exhausted","bed","insomnia","awake","woke","night","nights","nap"],lead:"Sleep",watch:"sleep"},
  {k:["meal","meals","ate","eat","eating","food","lunch","breakfast","dinner","skipped","hungry"],lead:"Meals",watch:"meals"},
  {k:["stress","stressed","stressful","busy","work","deadline","deadlines","pressure","overwhelmed","anxious"],lead:"Stress",watch:"stress"},
  {k:["caffeine","coffee","tea","espresso","latte"],lead:"Caffeine",watch:"caffeine"},
  {k:["screen","screens","laptop","phone","monitor","scrolling"],lead:"Screen time",watch:"screens"},
];
// Whole words only ("late deadline" was matching "ate" and reporting Meals), and
// when several signals appear we take the one mentioned FIRST rather than the one
// highest in this list -- people tend to lead with what actually stood out.
const readContext=(txt:string)=>{const l=txt.toLowerCase();let best=null,at=Infinity;
  for(const h of HINTS)for(const w of h.k){const m=l.match(new RegExp("\\b"+w+"\\b"));
    if(m&&m.index!==undefined&&m.index<at){at=m.index;best=h}}
  return best};

function Today({thread,setThread,onOpenThreads}:{thread:Thread|null;setThread:(t:Thread)=>void;onOpenThreads:()=>void}){
  const [turns,setTurns]=useState<Turn[]>([]);
  const [suggest,setSuggest]=useState<string[]>([]);
  const [draft,setDraft]=useState("");
  const [asked,setAsked]=useState(0);
  const [day,setDay]=useState(1);
  const scroller=useRef<HTMLDivElement>(null);

  useEffect(()=>{const el=scroller.current;if(el)el.scrollTop=el.scrollHeight},[turns,suggest]);

  const pick=(k:string)=>{
    const t=TOPICS[k]; const th=makeThread(k,t);
    setThread(th);
    setTurns([
      {who:"oomi",text:`${t.thread}. I’ve opened a thread for it — here’s the shape of your last three months.`},
      {who:"oomi",text:"When did it last show up?"},
    ]);
    setSuggest(["Today","A few days ago","Last week"]);
    setAsked(1);
  };

  const answer=(text:string)=>{
    if(!text.trim()||!thread) return;
    const t=TOPICS[thread.key];
    const next:Turn[]=[{who:"you",text}];
    let sg:string[]=[];

    if(asked===1){
      next.push({who:"oomi",text:"What did it feel like?"});
      sg=t.qualities.slice(0,3).map(q=>q.label);
      // today's moment lands on the line straight away
      setThread({...thread,moments:[...thread.moments,{day:SPAN,intensity:.8,note:text}]});
    } else if(asked===2){
      next.push({who:"oomi",text:"Anything going on around it?"});
      sg=["Poor sleep","Skipped a meal","Nothing unusual"];
    } else if(asked===3){
      const h=readContext(text);
      next.push(h
        ? {who:"oomi",noticing:true,text:`${h.lead} may be part of this. “${text}” landed beside your last ${thread.noun} — not a conclusion, just a thread worth watching.`}
        : {who:"oomi",noticing:true,text:`Noted. Nothing obvious around it is a data point too — I’ll keep watching for what repeats.`});
      next.push({who:"oomi",text:h?`Want me to compare your Apple Health ${h.watch} with this thread?`:"Want me to watch your Apple Health sleep alongside this?"});
      sg=["Yes, connect it","Not now"];
      setThread({...thread,noticings:[...thread.noticings,{day:SPAN,text:h?h.lead:"Noted"}]});
    } else if(asked===4){
      next.push({who:"oomi",text:`Done. Your ${thread.name} thread is open — I’ll be here tomorrow, and I’ll start with what I notice rather than a blank page.`});
      sg=[];
    } else {
      next.push({who:"oomi",text:"Added to today."});
      sg=[];
    }
    setTurns(v=>[...v,...next]); setSuggest(sg); setAsked(a=>a+1); setDraft("");
  };

  // The daily open is the whole bargain: Oomi speaks first, always. An empty
  // composer every morning is how a health app becomes a chore.
  const nextDay=()=>{
    if(!thread) return;
    const d=day+1;
    setDay(d);
    setThread({...thread,moments:[...thread.moments,{day:SPAN,intensity:.35+((d*37)%50)/100}]});
    setTurns(v=>[...v,{who:"oomi",text:d===2
      ? `Morning. Two ${thread.noun}s this week both followed a short night — want to note today before it slips?`
      : `Quieter stretch. Nothing since ${d-1} days ago, which is worth recording too.`}]);
    setSuggest(["Nothing today","Mild","Rough one"]);
    setAsked(9);
  };

  if(!thread) return <div className="today"><ThreadPicker onPick={pick}/></div>;

  return <div className="today">
    <div className="thread-head">
      <div className="thread-line-wrap"><ThreadLine thread={thread}/></div>
      <div className="thread-meta">
        <span>{thread.name}</span>
        <b>{thread.moments.length} moments · 90 days</b>
      </div>
    </div>
    <div className="convo" ref={scroller}>
      {turns.map((t,i)=><p key={i} className={`turn ${t.who}${t.noticing?" noticing-turn":""}`}>
        {t.noticing&&<i className="noticing-dot" aria-hidden="true"/>}{t.text}
      </p>)}
    </div>
    <div className="composer">
      {suggest.length>0&&<div className="suggests">{suggest.slice(0,3).map(s=><button key={s} onClick={()=>answer(s)}>{s}</button>)}</div>}
      <form onSubmit={e=>{e.preventDefault();answer(draft)}}>
        <input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Say it in your own words…" aria-label="Your reply"/>
        <button type="submit" aria-label="Send" disabled={!draft.trim()}><Icon name="arrow_upward"/></button>
      </form>
      <div className="composer-foot">
        <small>Stays on this device</small>
        <button className="ghost" onClick={asked>=5?nextDay:onOpenThreads}>{asked>=5?"Next day":"Your threads"} <Icon name="arrow_forward"/></button>
      </div>
    </div>
  </div>;
}

function Threads({active,onBack}:{active:Thread|null;onBack:()=>void}){
  const others=Object.keys(TOPICS).filter(k=>k!==active?.key).slice(0,3);
  return <div className="threads-view">
    <header className="section-intro"><p className="kicker">Your threads</p><h1>Each one has<br/>its own shape.</h1><p>Three months at a glance. Yellow marks something Oomi noticed.</p></header>
    {active&&<button className="thread-card is-active" onClick={onBack}>
      <span className="card-line"><ThreadLine thread={active} strands={9}/></span>
      <div><small>FOLLOWING</small><b>{active.name}</b><span>{active.moments.length} moments · {active.noticings.length} noticing{active.noticings.length===1?"":"s"}</span></div>
    </button>}
    {others.map(k=><button key={k} className="thread-card" onClick={onBack}>
      <span className="card-line"><ThreadLine thread={makeThread(k,TOPICS[k])} strands={7} showNow={false}/></span>
      <div><small>NOT FOLLOWING</small><b>{TOPICS[k].thread}</b><span>Example shape</span></div>
    </button>)}
  </div>;
}

function BrandGuide({onClose}:{onClose:()=>void}){
  return <main className="brand-guide">
    <header className="brand-nav"><OomiMark/><button onClick={onClose}><span>Return to prototype</span><Icon name="close"/></button></header>
    <section className="brand-hero"><div className="brand-orbit"><ThreadCanvas mode="hourglass"/></div><p className="brand-eyebrow">OOMI · LIVING BRAND GUIDE</p><h1>Follow what<br/>makes you, you.</h1><p className="brand-lede">A quiet visual language for a health story that belongs to one person—and stays with them.</p><span className="scroll-cue">SCROLL TO EXPLORE <Icon name="south"/></span></section>
    <section className="brand-section brand-belief"><div className="section-number">01</div><div><p className="brand-eyebrow">THE IDEA</p><h2>Not a medical record.<br/>A living memory.</h2></div><div className="belief-copy"><p>Oomi turns scattered moments into a continuous thread—without reducing a person to a score, diagnosis, or dashboard.</p><p className="sovereignty-line"><i/> You choose what leaves your phone.</p></div></section>
    <section className="brand-section logo-showcase"><div className="section-number">02</div><div className="logo-field"><img src="/oomi-logotype.svg" alt="Oomi"/><p>The linked forms suggest continuity, reciprocity, and two points becoming a relationship.</p></div><div className="symbol-field"><img src="/oomi-logo.svg" alt="Oomi symbol"/><span>THE THREADMARK</span></div></section>
    <section className="brand-section type-section"><div className="section-number">03</div><p className="brand-eyebrow">TYPOGRAPHY · INSTRUMENT SANS</p><div className="type-sample"><span>Aa</span><h2>Warm precision,<br/>without the clinic.</h2></div><div className="type-scale"><div><b>56</b><span>Display / 1.0</span></div><div><b>30</b><span>Title / 1.05</span></div><div><b>16</b><span>Body / 1.5</span></div><p>Use one generous, open family. Let scale and space create hierarchy—never compression.</p></div></section>
    <section className="brand-section color-section"><div className="section-number">04</div><div><p className="brand-eyebrow">COLOR AS ATMOSPHERE</p><h2>Alive, never loud.</h2><p>Deep teal is home. Moss, mineral blue, soft violet, and amber drift through it as the story changes. Signal yellow marks one thing only: something Oomi noticed.</p></div><div className="gradient-gallery"><div className="gradient-card g-one"><i/></div><div className="gradient-card g-two"><i/></div><div className="gradient-card g-three"><i/></div><div className="swatch-row"><span>#071B16</span><span>#376A50</span><span>#EDFF3F</span></div></div></section>
    <section className="brand-section line-section"><div className="section-number">05</div><div className="line-stage"><ThreadCanvas mode="weave"/><span>ONE LINE · MANY STATES</span></div><div><p className="brand-eyebrow">THE LIVING THREAD</p><h2>Illustration that remembers.</h2><p>In the product the line is not decoration: time runs along it, height is how much was going on, and the strands braid tight where moments cluster.</p></div></section>
    <section className="brand-section icon-section"><div className="section-number">06</div><div><p className="brand-eyebrow">ICONOGRAPHY</p><h2>Open, rounded,<br/>immediately legible.</h2><p>Material Symbols Rounded at a light weight. Icons support the action; they never become decoration.</p></div><div className="icon-grid">{["timeline","shield_lock","bedtime","favorite","medication","ios_share","fingerprint","clinical_notes"].map(x=><div key={x}><Icon name={x}/></div>)}</div></section>
    <section className="brand-section motion-section"><div className="section-number">07</div><div className="motion-dot"/><div><p className="brand-eyebrow">MOTION</p><h2>Gentle evidence<br/>of life.</h2><p>Elements arrive with calm deceleration. Gradients breathe. The yellow point responds. Nothing bounces, nags, or demands attention.</p><div className="motion-spec"><span>420ms</span><code>cubic-bezier(.22, 1, .36, 1)</code></div></div></section>
    <footer className="brand-footer"><img src="/oomi-logotype.svg" alt="Oomi"/><h2>Your story is already taking shape.</h2><button onClick={onClose}>Experience the prototype <Icon name="arrow_outward"/></button><small>Private by default · Portable by design</small></footer>
  </main>
}

export default function Home(){
  const [view,setView]=useState<"today"|"threads">("today");
  const [thread,setThread]=useState<Thread|null>(null);
  const [brand,setBrand]=useState(false);
  const stageRef=useRef<HTMLElement>(null);
  const target=useRef({x:50,y:40}); const at=useRef({x:50,y:40}); const raf=useRef(0);
  useEffect(()=>()=>cancelAnimationFrame(raf.current),[]);
  const react=(e:React.PointerEvent<HTMLElement>)=>{const r=e.currentTarget.getBoundingClientRect();target.current={x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100};if(raf.current)return;
    const drift=()=>{const n=at.current,g=target.current;n.x+=(g.x-n.x)*.018;n.y+=(g.y-n.y)*.018;stageRef.current?.style.setProperty("--x",`${n.x}%`);stageRef.current?.style.setProperty("--y",`${n.y}%`);
      if(Math.abs(g.x-n.x)+Math.abs(g.y-n.y)>.08)raf.current=requestAnimationFrame(drift);else raf.current=0};raf.current=requestAnimationFrame(drift)};

  if(brand) return <BrandGuide onClose={()=>setBrand(false)}/>;

  return <main ref={stageRef} className="stage app-stage" onPointerMove={react}>
    <section className="phone" aria-label="Oomi">
      <div className="wash"/><div className="grain"/>
      <nav className="topbar">
        {view==="threads"?<button className="back" onClick={()=>setView("today")} aria-label="Back">←</button>:<span/>}
        <OomiMark/>
        <button className="quiet" onClick={()=>{setThread(null);setView("today")}}>Reset</button>
      </nav>
      {view==="today"
        ? <Today thread={thread} setThread={setThread} onOpenThreads={()=>setView("threads")}/>
        : <Threads active={thread} onBack={()=>setView("today")}/>}
    </section>
    <aside>
      <OomiMark/>
      <p>Follow what matters.</p>
      <h2>One line,<br/>many moments.</h2>
      <small>Time runs left to right. Height is how much<br/>was going on. Yellow is something noticed.</small>
      <button className="explore-brand" onClick={()=>setBrand(true)}>Explore the brand <Icon name="arrow_outward"/></button>
    </aside>
  </main>;
}
