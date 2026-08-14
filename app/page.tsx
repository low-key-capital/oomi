"use client";

import { useMemo, useState } from "react";

type Choice = { label: string; icon?: string };
const steps = [
  { kicker:"A little space for you", title:"What’s been on your mind?", body:"Start anywhere. No forms, no diagnosis—just a thread worth following.", choices:[{label:"Migraines",icon:"◒"},{label:"Sleep",icon:"☾"},{label:"Energy",icon:"✦"},{label:"Stomach",icon:"≈"},{label:"Stress",icon:"⌁"},{label:"Just curious",icon:"·"}], cta:"Follow this thread" },
  { kicker:"Let’s notice, not judge", title:"When did it last show up?", body:"A rough answer is perfect.", choices:[{label:"Today"},{label:"In the last few days"},{label:"Last week"},{label:"It’s been a while"}], cta:"Continue" },
  { kicker:"Your memory, gently jogged", title:"What did it feel like?", body:"Choose as many as fit. You can always change this later.", multi:true, choices:[{label:"Throbbing"},{label:"One-sided"},{label:"Light-sensitive"},{label:"Nausea"},{label:"Aura"},{label:"Neck tension"}], cta:"That’s about right" },
  { kicker:"A tiny bit of context", title:"What was the day around it like?", body:"Sometimes the edges tell us more than the event.", multi:true, choices:[{label:"Poor sleep",icon:"☾"},{label:"Skipped a meal",icon:"○"},{label:"Busy / stressful",icon:"⌁"},{label:"Different caffeine",icon:"◐"},{label:"Long screen time",icon:"▣"},{label:"Nothing unusual",icon:"·"}], cta:"See what Oomi noticed" },
  { insight:true, kicker:"A first little noticing", title:"Sleep may be part of your story.", body:"You remembered poor sleep alongside your last migraine. That isn’t a conclusion—just a thread worth watching.", cta:"Keep following it" },
  { kicker:"Make it easy next time", title:"What would you want to remember?", body:"Pick the things Future You would thank you for.", multi:true, choices:[{label:"How I slept"},{label:"What I ate"},{label:"Stress level"},{label:"What helped"},{label:"Where it hurt"},{label:"Cycle timing"}], cta:"Create my Thread" },
  { thread:true, kicker:"Your first Thread", title:"Migraines", body:"A living timeline of symptoms, context, and what helps—built a few seconds at a time.", cta:"Add today’s note" },
  { note:true, kicker:"Quick note", title:"How are you feeling now?", body:"One tap is enough. Add words only if you want to.", choices:[{label:"Clear",icon:"○"},{label:"Faint",icon:"◔"},{label:"Building",icon:"◑"},{label:"Strong",icon:"●"}], cta:"Save to my Thread" },
  { permission:true, kicker:"One helpful connection", title:"Want Oomi to notice sleep patterns?", body:"With your permission, Oomi can read sleep duration from Apple Health and compare it privately with your migraine notes.", choices:[{label:"Connect Apple Health",icon:"♥"},{label:"Not now"}], cta:"Continue" },
  { finish:true, kicker:"You’re already underway", title:"This is your health story.", body:"You’ve begun a private, portable profile—made from what matters to you, not what a form demanded.", cta:"Enter Oomi" },
];
function Eyes({ mood="calm" }:{ mood?:string }){return <div className={`eyes ${mood}`} aria-hidden="true"><i/><i/></div>}
export default function Home(){
  const [step,setStep]=useState(0); const [selections,setSelections]=useState<Record<number,string[]>>({});
  const current=steps[step]; const selected=selections[step]||[]; const progress=useMemo(()=>((step+1)/steps.length)*100,[step]);
  const choose=(choice:Choice)=>{const exists=selected.includes(choice.label); const next=current.multi?(exists?selected.filter(x=>x!==choice.label):[...selected,choice.label]):[choice.label];setSelections({...selections,[step]:next})};
  const advance=()=>step<steps.length-1?setStep(step+1):setStep(0);
  return <main className="stage"><div className="ambient one"/><div className="ambient two"/><section className="phone" aria-label="Oomi onboarding prototype">
    <div className="status"><span>9:41</span><span className="island"/><span>⌁ 􀙇</span></div>
    <div className="topbar">{step>0?<button className="back" onClick={()=>setStep(step-1)} aria-label="Go back">‹</button>:<span className="back"/>}<div className="wordmark"><Eyes mood={current.insight||current.finish?"happy":"calm"}/>mi</div><button className="quiet" onClick={()=>setStep(0)}>Start over</button></div>
    <div className="progress"><span style={{width:`${progress}%`}}/></div>
    <div className={`screen ${current.insight?"insight":""} ${current.finish?"finish":""}`} key={step}>
      {current.insight&&<div className="orbit"><span/><span/><span/><Eyes mood="happy"/></div>}{current.thread&&<div className="thread-art"><div className="thread-line"/><span className="dot d1"/><span className="dot d2"/><span className="dot d3"/><b>3 moments</b></div>}{current.finish&&<div className="profile-art"><span/><span/><span/><span/><Eyes mood="happy"/></div>}
      <p className="kicker">{current.kicker}</p><h1>{current.title}</h1><p className="bodycopy">{current.body}</p>
      {current.thread&&<div className="thread-card"><div><small>LAST NOTICED</small><strong>Sleep ↔ migraine</strong></div><span>↗</span></div>}{current.note&&<textarea aria-label="Optional note" placeholder="Anything else you want to remember?"/>}
      {current.choices&&<div className={`choices ${current.multi?"multi":""}`}>{current.choices.map(choice=><button key={choice.label} className={selected.includes(choice.label)?"selected":""} onClick={()=>choose(choice)}>{choice.icon&&<span className="choice-icon">{choice.icon}</span>}<span>{choice.label}</span><em>{selected.includes(choice.label)?"✓":""}</em></button>)}</div>}
      {current.permission&&<p className="fineprint">Apple Health will ask you to confirm. Oomi never writes to Health without asking.</p>}{current.finish&&<div className="sovereignty"><span>⌾</span><div><strong>Private by default</strong><small>You choose what leaves your phone.</small></div></div>}
    </div><div className="footer"><button className="primary" disabled={!!current.choices&&selected.length===0} onClick={advance}>{step===steps.length-1?"Try again":current.cta}<span>→</span></button>{step<4&&<p>Your answers stay on this device.</p>}</div>
  </section><aside className="prototype-note"><div className="mini-logo"><Eyes/>mi</div><h2>Your story starts before the paperwork.</h2><p>A clickable cold-start prototype for a private health companion.</p><div className="hint"><span>↖</span> Try it on the phone</div></aside></main>;
}
