// src/lib/accessibilityUtils.ts
let polite:HTMLDivElement|null=null;
let assertive:HTMLDivElement|null=null;
let politeT:NodeJS.Timeout|null=null;
let assertiveT:NodeJS.Timeout|null=null;
const CLEAR=150;

const mk = (id:string, level:'polite'|'assertive')=>{
  const n=document.createElement('div');
  n.id=id; n.setAttribute('role',level==='assertive'?'alert':'status');
  n.setAttribute('aria-live',level); n.setAttribute('aria-atomic','true');
  Object.assign(n.style,{position:'absolute',width:'1px',height:'1px',
    overflow:'hidden',clip:'rect(0 0 0 0)',whiteSpace:'nowrap'});
  document.body.appendChild(n); return n;
};
const ensure = (l:'polite'|'assertive')=>{
  if (typeof window==='undefined') return null;
  if (l==='polite' && !polite) polite   = mk('sr-live-polite'   ,'polite');
  if (l==='assertive'&&!assertive)assertive=mk('sr-live-assertive','assertive');
  return l==='polite'?polite:assertive;
};

export const announceToSR = (msg:string,{politeness='polite'}: {politeness?:'polite'|'assertive'} ={})=>{
  if (!msg?.trim()) return;
  const reg=ensure(politeness); if (!reg) return;
  const ref   = politeness==='polite'?politeT:assertiveT;
  if (ref) clearTimeout(ref);
  reg.textContent = msg;
  const tid=setTimeout(()=>{ if (reg.textContent===msg) reg.textContent=''; },CLEAR);
  if (politeness==='polite') politeT=tid; else assertiveT=tid;
};
