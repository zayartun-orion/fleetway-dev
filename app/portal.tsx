"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Row = Record<string, string | number | null>;
type Data = {vehicles:Row[]; people:Row[]; routes:Row[]; schedules:Row[]};
const empty:Data={vehicles:[],people:[],routes:[],schedules:[]};

const Icon=({children}:{children:string})=><span className="icon">{children}</span>;

export default function FleetPortal({userName}:{userName:string}) {
  const [data,setData]=useState<Data>(empty); const [tab,setTab]=useState("Overview");
  const [modal,setModal]=useState(""); const [view,setView]=useState<"manager"|"viewer">("manager");
  const [loading,setLoading]=useState(true); const [toast,setToast]=useState("");
  const load=()=>fetch("/api/fleet").then(r=>r.json()).then(d=>{setData(d);setLoading(false)});
  useEffect(()=>{load()},[]);
  const today=new Date().toLocaleDateString("en-SG",{weekday:"long",day:"numeric",month:"long"});
  const drivers=data.people.filter(p=>p.role==="Driver"), assistants=data.people.filter(p=>p.role==="Assistant");
  const available=data.vehicles.filter(v=>v.status==="Available").length;
  const nav=[['Overview','⌂'],['Vehicles','▣'],['Drivers & Assistants','♙'],['Routes','⌁'],['Schedule','□']];
  const title=tab==="Overview"?"Good morning, dispatcher.":tab;
  const subtitle=tab==="Overview"?`${today} · Here’s what’s moving today.`:`Manage and review your ${tab.toLowerCase()} records.`;
  function saved(){setModal("");setToast("Record saved successfully");load();setTimeout(()=>setToast(""),2600)}
  return <main className="shell">
    <aside>
      <div className="brand"><span className="brandmark">F</span><div><b>Fleetway</b><small>Operations portal</small></div></div>
      <nav>{nav.map(([n,i])=><button key={n} className={tab===n?"active":""} onClick={()=>setTab(n)}><Icon>{i}</Icon>{n}</button>)}</nav>
      <div className="aside-foot"><div className="help"><b>Need help?</b><span>View operations guide</span></div><div className="profile"><span className="avatar">{userName.slice(0,2).toUpperCase()}</span><div><b>{userName}</b><small>{view==="manager"?"Fleet manager":"Authorized viewer"}</small></div><button>•••</button></div></div>
    </aside>
    <section className="content">
      <header><button className="mobile">☰</button><div className="search">⌕ <input placeholder="Search fleet, people, routes..."/></div><div className="role-switch"><button className={view==="manager"?"selected":""} onClick={()=>setView("manager")}>Manager</button><button className={view==="viewer"?"selected":""} onClick={()=>setView("viewer")}>Viewer</button></div><button className="bell">♢<i/></button></header>
      <div className="page-head"><div><h1>{title}</h1><p>{subtitle}</p></div>{view==="manager"&&<button className="primary" onClick={()=>setModal(tab==="Schedule"?"schedule":tab==="Routes"?"route":tab==="Drivers & Assistants"?"person":"vehicle")}>＋ {tab==="Overview"?"Register vehicle":`Add ${tab.replace('Drivers & Assistants','person').replace('Schedule','trip')}`}</button>}</div>
      {view==="viewer"&&<div className="viewer-note"><Icon>✓</Icon><div><b>Authorized schedule view</b><span>You have read-only access to routes, assigned teams, and departure times.</span></div></div>}
      {loading?<div className="loading">Preparing today’s operations…</div>:tab==="Overview"?<Overview data={data} available={available} setTab={setTab}/>:<Records tab={tab} data={data}/>} 
    </section>
    {modal&&<Modal kind={modal} data={data} onClose={()=>setModal("")} onSaved={saved}/>} {toast&&<div className="toast">✓ {toast}</div>}
  </main>
}

function Overview({data,available,setTab}:{data:Data;available:number;setTab:(s:string)=>void}){
 const cards=[[data.vehicles.length,'Total vehicles',`${available} available`,'▣'],[data.people.filter(p=>p.role==='Driver').length,'Active drivers','2 on duty','♙'],[data.routes.length,'Active routes','All operating','⌁'],[data.schedules.length,"Today's trips",'1 currently on route','□']];
 return <><div className="stats">{cards.map((c,i)=><article key={String(c[1])}><div className={`stat-icon c${i}`}><Icon>{String(c[3])}</Icon></div><div><strong>{c[0]}</strong><span>{c[1]}</span><small><i/> {c[2]}</small></div></article>)}</div>
 <div className="grid"><section className="panel trips"><div className="panel-title"><div><h2>Today’s schedule</h2><p>Live vehicle movement and assignments</p></div><button onClick={()=>setTab('Schedule')}>View full schedule →</button></div><ScheduleTable rows={data.schedules}/></section>
 <section className="panel availability"><div className="panel-title"><div><h2>Fleet availability</h2><p>Current status across all vehicles</p></div></div><div className="donut" style={{'--p':`${Math.round((data.vehicles.filter(v=>v.status==='Available').length/data.vehicles.length)*100)}%`} as React.CSSProperties}><div><strong>{data.vehicles.filter(v=>v.status==='Available').length}</strong><span>available</span></div></div><div className="legend"><span><i className="green"/>Available <b>{data.vehicles.filter(v=>v.status==='Available').length}</b></span><span><i className="blue"/>On route <b>{data.vehicles.filter(v=>v.status==='On route').length}</b></span><span><i className="amber"/>Maintenance <b>{data.vehicles.filter(v=>v.status==='Maintenance').length}</b></span></div></section></div>
 <section className="panel people-strip"><div className="panel-title"><div><h2>Team availability</h2><p>Drivers and assistants ready for assignment</p></div><button onClick={()=>setTab('Drivers & Assistants')}>Manage team →</button></div><div className="person-cards">{data.people.slice(0,4).map(p=><div className="person" key={p.id}><span className="avatar alt">{String(p.name).split(' ').map(x=>x[0]).join('')}</span><div><b>{p.name}</b><span>{p.role}</span></div><em className={p.status==='Available'?'ok':''}>{p.status}</em></div>)}</div></section></>;
}

function Records({tab,data}:{tab:string;data:Data}){if(tab==='Schedule')return <section className="panel records"><ScheduleTable rows={data.schedules}/></section>; const rows=tab==='Vehicles'?data.vehicles:tab==='Routes'?data.routes:data.people; return <section className="panel records"><table><thead><tr>{(tab==='Vehicles'?['Vehicle','Type','Capacity','Status']:tab==='Routes'?['Route','Origin','Destination','Distance']:['Name','Role','Contact','Status']).map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}>{tab==='Vehicles'?<><td><b>{r.plate}</b></td><td>{r.type}</td><td>{r.capacity} seats</td><td><em className="pill">{r.status}</em></td></>:tab==='Routes'?<><td><b>{r.code}</b></td><td>{r.origin}</td><td>{r.destination}</td><td>{r.distance} km</td></>:<><td><b>{r.name}</b></td><td>{r.role}</td><td>{r.phone}</td><td><em className="pill">{r.status}</em></td></>}</tr>)}</tbody></table></section>}
function ScheduleTable({rows}:{rows:Row[]}){return <div className="table-wrap"><table><thead><tr><th>Departure</th><th>Route</th><th>Vehicle</th><th>Driver & assistant</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{r.time}</b><small>{new Date(String(r.date)).toLocaleDateString('en-SG',{day:'numeric',month:'short'})}</small></td><td><b>{r.route_code}</b><small>{r.origin} → {r.destination}</small></td><td>{r.plate}</td><td><b>{r.driver_name}</b><small>{r.assistant_name||'No assistant required'}</small></td><td><em className={`pill ${r.status==='On route'?'live':''}`}>{r.status}</em></td></tr>)}</tbody></table></div>}

function Modal({kind,data,onClose,onSaved}:{kind:string;data:Data;onClose:()=>void;onSaved:()=>void}){const [busy,setBusy]=useState(false); async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);const fd=new FormData(e.currentTarget);const body=Object.fromEntries(fd);body.kind=kind;await fetch('/api/fleet',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});onSaved()}
 const drivers=useMemo(()=>data.people.filter(p=>p.role==='Driver'),[data]);const assistants=useMemo(()=>data.people.filter(p=>p.role==='Assistant'),[data]);return <div className="overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><form className="modal" onSubmit={submit}><div className="modal-head"><div><h2>{kind==='person'?'Register team member':kind==='schedule'?'Schedule a trip':`Add ${kind}`}</h2><p>Enter the required information below.</p></div><button type="button" onClick={onClose}>×</button></div>
 {kind==='vehicle'&&<><label>Registration number<input name="plate" required placeholder="e.g. SGK 4821"/></label><div className="fields"><label>Vehicle type<select name="type"><option>Coach</option><option>Mini bus</option><option>Van</option></select></label><label>Seat capacity<input name="capacity" required type="number" min="1" placeholder="44"/></label></div></>}
 {kind==='person'&&<><label>Full name<input name="name" required placeholder="Full legal name"/></label><div className="fields"><label>Role<select name="role"><option>Driver</option><option>Assistant</option></select></label><label>Phone<input name="phone" required placeholder="9123 4567"/></label></div><label>Licence number <small>(drivers only)</small><input name="license" placeholder="D-20481"/></label></>}
 {kind==='route'&&<><div className="fields"><label>Route code<input name="code" required placeholder="RT-401"/></label><label>Distance (km)<input name="distance" required type="number" min="1"/></label></div><label>Origin<input name="origin" required placeholder="Starting location"/></label><label>Destination<input name="destination" required placeholder="End location"/></label></>}
 {kind==='schedule'&&<><label>Route<select name="routeId" required>{data.routes.map(x=><option value={String(x.id)} key={x.id}>{x.code} — {x.origin} to {x.destination}</option>)}</select></label><div className="fields"><label>Vehicle<select name="vehicleId">{data.vehicles.map(x=><option value={String(x.id)} key={x.id}>{x.plate}</option>)}</select></label><label>Driver<select name="driverId">{drivers.map(x=><option value={String(x.id)} key={x.id}>{x.name}</option>)}</select></label></div><label>Assistant<select name="assistantId"><option value="">Not required</option>{assistants.map(x=><option value={String(x.id)} key={x.id}>{x.name}</option>)}</select></label><div className="fields"><label>Date<input name="date" required type="date"/></label><label>Time<input name="time" required type="time"/></label></div></>}
 <div className="actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary" disabled={busy}>{busy?'Saving…':'Save record'}</button></div></form></div>}
