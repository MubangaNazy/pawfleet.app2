import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bone, Dog, MapPin, MessageCircle, Scissors, ShieldCheck, ShoppingBag, Sparkles, Stethoscope, Store, UsersRound, UtensilsCrossed } from 'lucide-react';
import PawFleetLogo from '../components/ui/PawFleetLogo';
import { routeAt, routeSamples, scrollStage } from '../components/landing/puppyPath';
import { GROOM_PACKAGES } from '../lib/groomingPackages';
import { supabase } from '../lib/supabase';

// ── Scroll-story landing. Each chapter pins for a moment while its text builds,
// then the 3D puppy (three.js, lazy-loaded) walks to the next one. Colours are
// sampled from the puppy photos: mint backdrop, golden fur, cream chest, green
// collar, gold tag.

const PAW = 'M12 13.2c-2.9 0-5.6 2.5-5.6 5 0 1.6 1.2 2.4 2.7 2.4 1.2 0 1.9-.5 2.9-.5s1.7.5 2.9.5c1.5 0 2.7-.8 2.7-2.4 0-2.5-2.7-5-5.6-5zM5.2 8.4c-1.3.3-1.9 1.8-1.4 3.3s1.8 2.5 3.1 2.2 1.9-1.8 1.4-3.3-1.8-2.5-3.1-2.2zm13.6 0c-1.3-.3-2.6.7-3.1 2.2s.1 3 1.4 3.3 2.6-.7 3.1-2.2-.1-3-1.4-3.3zM9.3 3.2C8 3.4 7.2 4.9 7.5 6.6s1.5 2.9 2.8 2.7 2.1-1.7 1.8-3.4-1.5-2.9-2.8-2.7zm5.4 0c-1.3-.2-2.5 1-2.8 2.7s.5 3.2 1.8 3.4 2.5-1 2.8-2.7-.5-3.2-1.8-3.4z';

function Chevron() {
  return (
    <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 1l4 4-4 4" /></svg>
  );
}

// The gold tag from the puppy's collar, used as the page's decoration.
function PawTag({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F8DD97" />
          <stop offset=".55" stopColor="#DDA94A" />
          <stop offset="1" stopColor="#A9742A" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill={`url(#${id})`} />
      <circle cx="50" cy="50" r="39" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1.5" />
      <path d={PAW} transform="translate(17 17) scale(2.75)" fill="#6B4518" />
    </svg>
  );
}

// The clinic the puppy walks up to in the vets chapter.
function VetClinic() {
  return (
    <svg className="clinicart sc" viewBox="0 0 480 340" aria-label="A PawFleet partner vet clinic">
      <ellipse cx="240" cy="326" rx="236" ry="13" fill="rgba(15,118,110,.2)" />
      <circle cx="46" cy="232" r="42" fill="#52B788" />
      <circle cx="26" cy="262" r="30" fill="#2B8A50" />
      <rect x="42" y="262" width="9" height="62" rx="3" fill="#8B5E34" />
      <rect x="66" y="112" width="360" height="212" rx="6" fill="#FFF8EA" />
      <rect x="66" y="296" width="360" height="28" fill="#EFE0C2" />
      <path d="M50 118 L246 34 L442 118Z" fill="#0F766E" />
      <path d="M50 118 L442 118 L442 130 L50 130Z" fill="#0B5E58" />
      <circle cx="246" cy="86" r="24" fill="#fff" />
      <path d="M239 70h14v9h9v14h-9v9h-14v-9h-9V79h9z" fill="#0F766E" />
      <rect x="150" y="146" width="192" height="30" rx="8" fill="#0F766E" />
      <text x="246" y="167" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="700" fontSize="17" letterSpacing="2" fill="#fff">VET CLINIC</text>
      <rect x="92" y="196" width="130" height="84" rx="8" fill="#BFE9E2" stroke="#0F766E" strokeWidth="5" />
      <path d="M157 196v84M92 238h130" stroke="#0F766E" strokeWidth="4" />
      <path d="M104 268l36-44M170 268l30-38" stroke="#fff" strokeWidth="7" opacity=".55" />
      <rect x="290" y="192" width="100" height="132" rx="8" fill="#0F766E" />
      <rect x="302" y="206" width="76" height="62" rx="5" fill="#BFE9E2" />
      <path d="M340 216c-8 0-15 7-15 14 0 5 3 7 8 7 3 0 5-1 7-1s4 1 7 1c5 0 8-2 8-7 0-7-7-14-15-14z" fill="#0F766E" transform="translate(0 12)" />
      <circle cx="378" cy="296" r="5" fill="#F2C879" />
      <path d="M272 186h136l14 22H258z" fill="#DDA94A" />
      <path d="M272 186h34l-10 22h-38zm68 0h34l14 22h-38z" fill="#F8DD97" />
    </svg>
  );
}

// A little puppy shop window for the "Find a new dog" tile.
function PuppyShop() {
  return (
    <svg className="shopart" viewBox="0 0 150 120" aria-hidden="true">
      <defs><clipPath id="pfl-window"><rect x="26" y="40" width="98" height="72" rx="6" /></clipPath></defs>
      <rect x="16" y="26" width="118" height="92" rx="9" fill="#FFF8EA" />
      <rect x="26" y="40" width="98" height="72" rx="6" fill="#DAF2E6" />
      <image href="/landing/front.webp" x="30" y="36" width="90" height="117" clipPath="url(#pfl-window)" preserveAspectRatio="xMidYMin slice" />
      <path d="M8 8h134l8 26H0z" fill="#F8DD97" />
      <path d="M8 8h27l-5 26H0zm54 0h27l5 26H62zm53 0h27l8 26h-30z" fill="#DDA94A" />
      <path d="M0 34a15 9 0 0 0 30 0 16 9 0 0 0 31 0 15 9 0 0 0 30 0 15 9 0 0 0 30 0 15 9 0 0 0 29 0z" fill="#DDA94A" />
      <path d="M125 58c-6-9-18-3-14 6 2 5 8 9 14 14 6-5 12-9 14-14 4-9-8-15-14-6z" fill="#E4572E" stroke="#fff" strokeWidth="3" />
    </svg>
  );
}

// The little town behind the puppy in the "for everyone" chapter.
function Town() {
  return (
    <svg className="town" viewBox="0 0 1200 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path d="M0 214 C200 190 400 226 600 206 C800 188 1000 224 1200 200 V260 H0Z" fill="#1F8A4C" opacity=".45" />
      <circle cx="96" cy="150" r="44" fill="#2B8A50" /><rect x="91" y="176" width="10" height="46" fill="#8B5E34" />
      <rect x="160" y="130" width="120" height="92" rx="4" fill="#FFF8EA" />
      <path d="M150 134 L220 84 L290 134Z" fill="#B3681F" /><rect x="206" y="172" width="28" height="50" fill="#B3681F" />
      <rect x="176" y="150" width="24" height="24" fill="#BFE9E2" /><rect x="242" y="150" width="24" height="24" fill="#BFE9E2" />
      <rect x="330" y="112" width="170" height="110" rx="4" fill="#FFF8EA" />
      <path d="M318 112h194l10 30H308z" fill="#F8DD97" /><path d="M318 112h38l-8 30h-40zm78 0h38l8 30h-40zm76 0h40l10 30h-42z" fill="#DDA94A" />
      <rect x="348" y="158" width="72" height="50" fill="#BFE9E2" /><rect x="440" y="158" width="40" height="64" fill="#0D3B2C" />
      <rect x="700" y="116" width="170" height="106" rx="4" fill="#FFF8EA" />
      <path d="M686 120 L785 62 L884 120Z" fill="#0F766E" /><circle cx="785" cy="100" r="15" fill="#fff" /><path d="M781 90h8v6h6v8h-6v6h-8v-6h-6v-8h6z" fill="#0F766E" />
      <rect x="722" y="144" width="60" height="46" fill="#BFE9E2" /><rect x="806" y="152" width="40" height="70" fill="#0F766E" />
      <rect x="920" y="132" width="120" height="90" rx="4" fill="#FFF8EA" />
      <path d="M910 136 L980 88 L1050 136Z" fill="#B3681F" /><rect x="966" y="174" width="28" height="48" fill="#B3681F" />
      <circle cx="1110" cy="150" r="48" fill="#2B8A50" /><rect x="1104" y="178" width="10" height="44" fill="#8B5E34" />
    </svg>
  );
}

// Text broken into letters / words for the scroll animation. Screen readers get
// the plain sentence from the parent's aria-label.
function Chars({ text }: { text: string }) {
  return (
    <>
      {text.split(' ').map((word, i) => (
        <span key={i}>
          <span className="wd" aria-hidden="true">
            {Array.from(word).map((c, j) => <span key={j} className="ch">{c}</span>)}
          </span>
          {' '}
        </span>
      ))}
    </>
  );
}

function Title({ lines }: { lines: string[] }) {
  return (
    <h2 className="title" aria-label={lines.join(' ')}>
      {lines.map(l => <span key={l} className="ln"><Chars text={l} /></span>)}
    </h2>
  );
}

function Copy({ text }: { text: string }) {
  return (
    <p className="copy" aria-label={text}>
      {text.split(' ').map((w, i) => <span key={i} className="w" aria-hidden="true">{w} </span>)}
    </p>
  );
}

function Join({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button className="join sc" onClick={onClick}><i><Chevron /></i>{children}</button>;
}

const CSS = `
.pfl{--ink:#10332A;--muted:#47655A;--mint:#DAF2E6;--mint2:#C9EBDA;--cream:#FBF2DF;--gold:#DDA94A;--caramel:#B3681F;--ghost:#BFE5D2;--forest:#0D3B2C;--collar:#1F8A4C;--pad:clamp(18px,3.2vw,46px);--vh:100vh;
  font-family:"Poppins",system-ui,sans-serif;color:var(--ink);background:var(--mint);overflow-x:clip;-webkit-font-smoothing:antialiased}
@supports(height:100svh){.pfl{--vh:100svh}}
.pfl *{box-sizing:border-box;margin:0;padding:0}
.pfl a,.pfl button{color:inherit;text-decoration:none;background:none;border:0;font:inherit;cursor:pointer}

.pfl .nav{position:fixed;z-index:30;top:0;left:0;right:0;display:flex;align-items:center;padding:18px var(--pad) 0;pointer-events:none;transition:color .5s ease}
.pfl .nav>*{pointer-events:auto}
.pfl .logo{display:flex;align-items:center;gap:10px;margin-right:clamp(24px,4vw,56px);font-weight:700;font-size:19px;letter-spacing:-.02em}
.pfl .logo>span:first-child{transition:transform .6s cubic-bezier(.2,.8,.2,1);display:grid}
.pfl .logo:hover>span:first-child{transform:rotate(-12deg) scale(1.06)}
.pfl .nav__links{display:flex;gap:clamp(18px,3vw,42px);font-size:15px}
.pfl .nav__links a{position:relative}
.pfl .nav__links a::after{content:"";position:absolute;left:0;right:0;bottom:-3px;height:1.5px;background:currentColor;transform:scaleX(0);transform-origin:left;transition:transform .35s ease}
.pfl .nav__links a:hover::after{transform:scaleX(1)}
.pfl .nav__cta{margin-left:auto;white-space:nowrap;display:flex;align-items:center;gap:18px;font-weight:600;font-size:15px}
.pfl .pill{padding:10px 20px;border-radius:999px;background:var(--ink);color:#fff !important;transition:transform .3s ease,background .3s}
.pfl .pill:hover{transform:translateY(-2px);background:var(--caramel)}
.pfl.on-dark .nav,.pfl.on-dark .badge{color:#fff}
.pfl.on-dark .pill{background:var(--gold);color:#2B1C08 !important}

.pfl .badge{position:fixed;z-index:30;right:var(--pad);bottom:20px;display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:500;color:var(--ink);transition:color .5s ease}
.pfl .badge b{font-weight:700;color:var(--caramel)}
.pfl.on-dark .badge b{color:#F2C879}
.pfl .badge svg{width:18px;height:18px;fill:currentColor}

.pfl #pup{position:fixed;inset:0;z-index:20;width:100%;height:100%;pointer-events:none;opacity:0;transition:opacity 1.2s ease}
.pfl #pup.ready{opacity:1}
.pfl .pup-fallback{display:none}
.pfl.no3d #pup{display:none}
.pfl.no3d .pup-fallback{display:block;position:absolute;left:50%;bottom:4vh;height:52vh;transform:translateX(-50%)}

.pfl .chap{position:relative;height:calc(var(--vh)*1.75)}
.pfl .chap--end{height:calc(var(--vh)*1.5)}
.pfl .chap--long{height:calc(var(--vh)*3.2)}
.pfl .chap>section{position:sticky;top:0;height:var(--vh);min-height:560px;overflow:hidden}
.pfl .flower{position:absolute;pointer-events:none;user-select:none;will-change:transform}
.pfl .flower svg{width:100%;height:auto;display:block;filter:drop-shadow(0 14px 22px rgba(90,60,10,.25))}
.pfl .ghost{position:absolute;white-space:nowrap;font-weight:800;font-size:clamp(120px,24vw,420px);letter-spacing:-.05em;line-height:1;color:var(--ghost);opacity:.45;pointer-events:none;will-change:transform;user-select:none}

.pfl .hero{background:radial-gradient(55% 45% at 50% 62%,rgba(255,255,255,.65),transparent 72%),radial-gradient(40% 30% at 50% 92%,rgba(133,205,170,.5),transparent 75%),var(--mint)}
.pfl .hero h1{position:absolute;left:var(--pad);right:var(--pad);top:13vh;text-align:center;font-weight:800;font-size:clamp(40px,6.6vw,118px);line-height:1.03;letter-spacing:-.035em;z-index:2}
.pfl .hero h1 .line{display:block;overflow:hidden;padding-bottom:.08em}
.pfl .hero h1 .line>span{display:inline-block;transform:translateY(110%)}
.pfl .hero h1 .line:nth-child(2){color:var(--caramel)}
.pfl.loaded .hero h1 .line>span{animation:rise 1.1s cubic-bezier(.2,.8,.15,1) forwards}
.pfl .hero h1 .line:nth-child(2)>span{animation-delay:.12s}
@keyframes rise{to{transform:translateY(0)}}
.pfl .hero__side{position:absolute;right:clamp(24px,6vw,110px);top:60vh;width:min(270px,80vw);z-index:2;opacity:0}
.pfl.loaded .hero__side{animation:fade 1s .7s ease forwards}
.pfl .hero__side p{font-size:clamp(15px,1.3vw,19px);line-height:1.38;color:var(--muted)}
.pfl .hero__left{position:absolute;left:clamp(24px,6vw,110px);top:66vh;z-index:2;display:flex;gap:28px;opacity:0}
.pfl.loaded .hero__left{animation:fade 1s .85s ease forwards}
.pfl .hero__left b{display:block;font-size:clamp(22px,2.2vw,32px);font-weight:700;color:var(--caramel)}
.pfl .hero__left span{font-size:12.5px;color:var(--muted)}
@keyframes fade{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.pfl .join{display:inline-flex;align-items:center;gap:14px;margin-top:24px;font-weight:600;font-size:clamp(15px,1.3vw,18px)}
.pfl .join i{width:25px;height:32px;border:1.8px solid currentColor;border-radius:10px;display:grid;place-items:center;transition:transform .35s ease}
.pfl .join i svg{width:9px;height:9px}
.pfl .join:hover i{transform:translateX(4px)}
.pfl .hero .tag-a{width:clamp(56px,7vw,120px);left:9vw;top:38vh;z-index:1}
.pfl .hero .tag-b{width:clamp(36px,4vw,70px);right:12vw;top:40vh;z-index:1}

.pfl .eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--caramel);margin-bottom:12px}
.pfl .eyebrow svg{width:17px;height:17px}
.pfl .title{font-weight:700;font-size:clamp(30px,3.5vw,58px);line-height:1.1;letter-spacing:-.02em}
.pfl .ln{display:block}
.pfl .wd{display:inline-block;white-space:nowrap}
.pfl .ch{display:inline-block}
.pfl .copy{margin-top:16px;font-size:clamp(14px,1.08vw,16.5px);line-height:1.6;color:var(--muted);max-width:470px}
.pfl .text{position:absolute;top:50%;transform:translateY(-50%);width:min(520px,42vw);z-index:3}
.pfl .text--r{left:50vw}
.pfl .text--l{left:6vw}

.pfl .ticks{margin-top:16px;display:grid;gap:8px;font-size:14px;font-weight:500}
.pfl .ticks span{display:flex;align-items:center;gap:10px}
.pfl .ticks span::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--gold);box-shadow:0 0 0 4px rgba(221,169,74,.22);flex:none}
.pfl .card{background:rgba(255,255,255,.72);border:1px solid rgba(16,51,42,.08);border-radius:16px;box-shadow:0 10px 26px rgba(16,51,42,.08)}

.pfl .s-walk{background:linear-gradient(180deg,var(--mint),var(--mint2))}
.pfl .s-walk .ghost{left:0;top:8vh}

.pfl .s-track{background:var(--forest);color:#fff}
.pfl .s-track .eyebrow{color:#F2C879}
.pfl .s-track .copy{color:rgba(232,245,238,.86)}
.pfl .s-track .text{left:6vw;width:min(440px,38vw)}
.pfl .mapbg{position:absolute;inset:0;width:100%;height:100%}
.pfl .mapbg .street{stroke:rgba(149,213,178,.16);fill:none;vector-effect:non-scaling-stroke;stroke-width:9}
.pfl .mapbg .lane{stroke:rgba(149,213,178,.09);fill:none;vector-effect:non-scaling-stroke;stroke-width:3}
.pfl .mapbg .park{fill:rgba(31,138,76,.24)}
.pfl .mapbg .way{stroke:rgba(242,200,121,.28);fill:none;vector-effect:non-scaling-stroke;stroke-width:4;stroke-dasharray:3 9;stroke-linecap:round}
.pfl .mapbg .done{stroke:#F2C879;fill:none;vector-effect:non-scaling-stroke;stroke-width:5;stroke-linecap:round;stroke-linejoin:round}
.pfl .s-track::before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,rgba(13,59,44,.96) 0%,rgba(13,59,44,.8) 34%,rgba(13,59,44,0) 52%);pointer-events:none}
.pfl .s-track .text{z-index:3}
.pfl .pin{position:absolute;z-index:2;transform:translate(-50%,-120%);display:flex;align-items:center;gap:6px;background:#fff;color:var(--ink);font-size:12px;font-weight:600;padding:6px 10px;border-radius:999px;box-shadow:0 8px 20px rgba(0,0,0,.3);white-space:nowrap}
.pfl .pin svg{width:13px;height:13px;color:var(--caramel)}
.pfl .stats{display:flex;gap:28px;margin-top:22px}
.pfl .stats b{display:block;font-size:clamp(22px,2vw,30px);font-weight:700;color:#F2C879}
.pfl .stats span{font-size:12.5px;color:rgba(232,245,238,.68)}
.pfl .livecard{position:absolute;z-index:4;right:6vw;top:15vh;padding:12px 16px;border-radius:16px;background:rgba(255,255,255,.12);border:1px solid rgba(242,200,121,.35);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);font-size:13px;min-width:190px}
.pfl .livecard small{display:block;color:rgba(232,245,238,.72);margin-top:2px}
.pfl .livecard i{display:block;height:5px;border-radius:9px;background:rgba(255,255,255,.15);margin-top:9px;overflow:hidden}
.pfl .livecard i b{display:block;height:100%;width:100%;transform-origin:left;transform:scaleX(0);background:linear-gradient(90deg,#B3681F,#F2C879)}
.pfl .live-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#F2C879;margin-right:8px;box-shadow:0 0 10px #F2C879}

.pfl .s-groom{background:linear-gradient(180deg,var(--cream),#F6E8CC)}
.pfl .s-groom .ghost{left:0;bottom:3vh;color:#EAD3A5}
.pfl .bubble{position:absolute;border-radius:50%;background:radial-gradient(circle at 32% 28%,rgba(255,255,255,.95),rgba(255,255,255,.22) 42%,rgba(133,205,170,.22) 72%,rgba(255,255,255,.5));border:1px solid rgba(255,255,255,.7);pointer-events:none;will-change:transform}
.pfl .prices{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:18px}
.pfl .prices div{padding:11px 10px;position:relative}
.pfl .prices b{display:block;font-size:12.5px;line-height:1.25;min-height:2.5em}
.pfl .prices span{display:block;font-size:17px;font-weight:700;color:var(--caramel);margin-top:4px}
.pfl .prices small{font-size:11px;color:var(--muted)}

.pfl .s-vet{background:radial-gradient(45% 50% at 22% 70%,rgba(255,255,255,.7),transparent 70%),#CDEDE6}
.pfl .s-vet .eyebrow{color:#0F766E}
.pfl .clinicart{position:absolute;left:3vw;bottom:15vh;width:min(36vw,520px);height:auto;z-index:1}
.pfl .clinic{margin-top:18px;padding:14px 16px;display:flex;align-items:center;gap:12px;max-width:440px}
.pfl .clinic .ic{width:42px;height:42px;border-radius:12px;background:#0F766E;color:#fff;display:grid;place-items:center;flex:none}
.pfl .clinic b{display:block;font-size:14px}
.pfl .clinic small{font-size:12px;color:var(--muted)}
.pfl .clinic em{margin-left:auto;font-style:normal;font-size:12px;font-weight:600;color:#fff;background:#0F766E;padding:7px 12px;border-radius:999px;white-space:nowrap}
.pfl .chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}
.pfl .chips span{font-size:12.5px;font-weight:500;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.7)}

.pfl .s-market{background:linear-gradient(135deg,#FBF2DF 0%,#F4DFAF 100%)}
.pfl .s-market .text{left:6vw;top:13vh;transform:none;width:min(430px,36vw)}
.pfl .tiles{position:absolute;right:5vw;top:50%;transform:translateY(-50%);width:min(620px,52vw);display:grid;grid-template-columns:1fr 1fr;gap:12px;z-index:3}
.pfl .tile{padding:16px;text-align:left;transition:transform .3s ease,box-shadow .3s ease;position:relative;overflow:hidden;background:#fff}
.pfl .tile:hover{transform:translateY(-3px);box-shadow:0 16px 30px rgba(120,80,20,.16)}
.pfl .tile--big{grid-column:1/-1;background:var(--forest);color:#fff;display:flex;align-items:center;gap:14px}
.pfl .tile .ic{width:44px;height:44px;border-radius:13px;background:linear-gradient(135deg,#F8DD97,#DDA94A);color:#5C3A10;display:grid;place-items:center;flex:none;margin-bottom:10px}
.pfl .shopart{width:112px;height:auto;flex:none}
.pfl .tile b{display:block;font-size:15.5px;font-weight:700}
.pfl .tile small{display:block;font-size:12.5px;line-height:1.4;color:var(--muted);margin-top:3px}
.pfl .tile--big small{color:rgba(232,245,238,.8)}
.pfl .tile u{position:absolute;right:14px;top:14px;text-decoration:none;font-size:11px;font-weight:600;color:#2B1C08;background:#F2C879;padding:4px 9px;border-radius:999px}

.pfl .s-chat{background:linear-gradient(180deg,var(--mint2),var(--mint))}
.pfl .phone{position:absolute;left:50vw;top:50%;transform:translateY(-50%);width:clamp(200px,20vw,270px);aspect-ratio:9/18.5;max-height:82vh;background:#10332A;border-radius:34px;padding:9px;box-shadow:0 30px 60px rgba(16,51,42,.32);z-index:3}
.pfl .phone__in{height:100%;background:#EEF8F3;border-radius:26px;overflow:hidden;display:flex;flex-direction:column}
.pfl .phone__bar{background:var(--forest);color:#fff;padding:18px 12px 10px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px}
.pfl .phone__bar i{width:26px;height:26px;border-radius:50%;background:#F2C879 url(/landing/front.webp) 50% 8%/190% no-repeat;flex:none}
.pfl .phone__bar small{display:block;font-size:10px;font-weight:400;opacity:.75}
.pfl .phone__type{margin:0 8px 9px;padding:8px 12px;border-radius:999px;background:#fff;font-size:11.5px;color:var(--muted)}
.pfl .bubbles{flex:1;padding:10px 8px;display:flex;flex-direction:column;gap:7px;justify-content:flex-end}
.pfl .msg{padding:8px 11px;border-radius:14px 14px 14px 4px;background:#fff;font-size:12px;width:fit-content;max-width:88%;box-shadow:0 6px 16px rgba(16,51,42,.08)}
.pfl .msg small{display:block;font-size:11px;font-weight:600;color:var(--caramel);margin-bottom:1px}
.pfl .msg--me{align-self:flex-end;background:var(--collar);color:#fff;border-radius:14px 14px 4px 14px}

.pfl .s-roles{background:var(--forest);color:#fff}
.pfl .town{position:absolute;left:0;right:0;bottom:0;width:100%;height:30vh;z-index:1}
.pfl .s-roles .wrap{position:absolute;left:0;right:0;top:13vh;text-align:center;padding:0 var(--pad);z-index:3}
.pfl .s-roles .eyebrow{color:#F2C879}
.pfl .roles{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;max-width:1120px;margin:24px auto 0;text-align:left}
.pfl .role{padding:15px;border-radius:16px;background:rgba(255,255,255,.08);border:1px solid rgba(242,200,121,.22)}
.pfl .role svg{width:22px;height:22px;color:#F2C879;margin-bottom:8px}
.pfl .role b{display:block;font-size:14.5px}
.pfl .role small{display:block;font-size:12.5px;line-height:1.4;color:rgba(232,245,238,.76);margin-top:3px}

.pfl .s-pass{background:linear-gradient(180deg,#F6E8CC 0%,var(--mint) 55%)}
.pfl .s-pass .text{top:12vh;transform:none;left:48vw;width:min(580px,46vw)}
.pfl .passport{margin-top:18px;border-radius:20px;overflow:hidden;background:#fff;box-shadow:0 22px 50px rgba(16,51,42,.18);max-width:470px;font-size:13px}
.pfl .passport header{background:var(--forest);color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;font-weight:600;font-size:12.5px;letter-spacing:.06em}
.pfl .passport header span{color:#F2C879}
.pfl .pbody{display:flex;gap:14px;padding:14px 16px;align-items:center}
.pfl .pbody img{width:76px;height:76px;object-fit:cover;object-position:50% 0;border-radius:14px;background:var(--mint)}
.pfl .pbody dl{display:grid;grid-template-columns:auto 1fr;gap:1px 10px;font-size:12.5px}
.pfl .pbody dt{color:var(--muted)}
.pfl .pbody dd{font-weight:600}
.pfl .stamps{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;padding:0 16px 14px}
.pfl .stamp{text-align:center;padding:7px 2px;border-radius:10px;border:1.5px dashed var(--gold);font-size:11px;font-weight:600;color:var(--caramel);line-height:1.2}
.pfl .fbar{position:absolute;left:var(--pad);right:calc(var(--pad) + 140px);bottom:20px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px;z-index:4;font-size:13px}
.pfl .fbar strong{display:flex;align-items:center;gap:8px;font-size:17px;font-weight:700}
.pfl .fbar .sub{color:var(--muted);font-size:12px}
.pfl .cols{display:flex;gap:22px;font-weight:500}
.pfl .cols a:hover{color:var(--caramel)}

.pfl .loader{position:fixed;inset:0;z-index:50;background:var(--mint);display:grid;place-items:center;transition:opacity .8s ease,visibility .8s}
.pfl .loader.done{opacity:0;visibility:hidden}
.pfl .loader div{width:64px;animation:swing 1.3s ease-in-out infinite;transform-origin:50% -30%}
@keyframes swing{0%,100%{transform:rotate(-16deg)}50%{transform:rotate(16deg)}}

@media (max-width:980px){
  .pfl .nav__links{display:none}
}
@media (max-width:760px){
  .pfl .chap>section{min-height:600px}
  .pfl .nav{padding-top:14px}
  .pfl .nav__links,.pfl .nav__cta .signin,.pfl .badge{display:none}
  .pfl .logo{margin-right:0}
  .pfl .pill{padding:9px 17px;font-size:14px}
  .pfl .ghost{font-size:44vw}
  .pfl .hero h1{top:calc(70px + 2vh);font-size:10.8vw;line-height:1.06}
  .pfl .hero__side{left:18px;right:18px;top:auto;bottom:calc(24px + 2vh);width:auto}
  .pfl .hero__side p{font-size:15px;max-width:330px}
  .pfl .join{margin-top:12px;font-size:16px}
  .pfl .hero__left{left:18px;right:18px;top:auto;bottom:calc(142px + 3vh);gap:22px}
  .pfl .hero__left b{font-size:20px}
  .pfl .hero__left span{font-size:11.5px}
  .pfl .hero .tag-a{left:auto;right:18px;top:30vh;width:44px}
  .pfl .hero .tag-b{display:none}
  .pfl .title{font-size:29px}
  .pfl .copy{font-size:14px;margin-top:9px;line-height:1.5;max-width:none}
  .pfl .eyebrow{margin-bottom:7px}
  .pfl .ticks{margin-top:10px;gap:5px;font-size:13px}
  .pfl .text,.pfl .text--l,.pfl .text--r,.pfl .s-market .text,.pfl .s-pass .text{left:18px;right:18px;width:auto;top:auto;bottom:calc(20px + 1.5vh);transform:none}
  .pfl .s-track .text{top:78px;bottom:auto;width:auto;right:18px}
  .pfl .s-track::before{background:linear-gradient(180deg,rgba(13,59,44,.97) 0%,rgba(13,59,44,.88) 42%,rgba(13,59,44,0) 56%)}
  .pfl .s-track .stats{margin-top:12px}
  .pfl .livecard{display:none}
  .pfl .pin{font-size:11px;padding:5px 8px}
  .pfl .prices{grid-template-columns:repeat(2,1fr);gap:7px;margin-top:11px}
  .pfl .prices div{padding:8px 10px;display:flex;align-items:center;justify-content:space-between;gap:6px}
  .pfl .prices b{min-height:0;font-size:12px}
  .pfl .prices span{margin:0;font-size:14px}
  .pfl .prices small{display:none}
  .pfl .clinic{margin-top:11px;padding:10px 12px}
  .pfl .chips{margin-top:9px;gap:5px}
  .pfl .chips span{font-size:11.5px;padding:4px 10px}
  .pfl .s-market .text{position:absolute;top:calc(60px + 1vh);bottom:auto;right:40vw}
  .pfl .s-market .copy{display:none}
  .pfl .tiles{left:18px;right:18px;width:auto;top:auto;bottom:calc(20px + 1.5vh);transform:none;gap:8px}
  .pfl .tile{padding:10px 12px}
  .pfl .tile .ic{width:32px;height:32px;border-radius:9px;margin-bottom:6px}
  .pfl .tile .ic svg{width:17px;height:17px}
  .pfl .shopart{width:78px}
  .pfl .clinicart{left:14px;right:auto;top:calc(62px + 1vh);bottom:auto;width:52vw}
  .pfl .tile b{font-size:14px}
  .pfl .tile small{font-size:11.5px}
  .pfl .phone{left:14px;top:calc(62px + 1vh);transform:none;width:44vw;max-width:170px;max-height:44vh;border-radius:24px;padding:6px}
  .pfl .phone__in{border-radius:19px}
  .pfl .phone__bar{padding:10px 8px 7px;font-size:10.5px}
  .pfl .phone__bar i{width:18px;height:18px}
  .pfl .phone__bar small{font-size:8px}
  .pfl .phone__type{font-size:9px;padding:5px 8px;margin:0 5px 6px}
  .pfl .bubbles{padding:5px;gap:4px}
  .pfl .msg{font-size:9.5px;padding:5px 7px}
  .pfl .msg small{font-size:8px}
  .pfl .town{top:calc(52px + 1vh);bottom:auto;height:22vh}
  .pfl .s-roles .wrap{top:auto;bottom:calc(20px + 1.5vh);padding:0 18px;text-align:left}
  .pfl .s-roles .title{font-size:27px}
  .pfl .roles{grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}
  .pfl .role{padding:9px 11px}
  .pfl .role svg{width:17px;height:17px;margin-bottom:3px}
  .pfl .role b{font-size:13px}
  .pfl .role small{font-size:11px}
  .pfl .role:first-child{grid-column:1/-1}
  .pfl .s-pass .text{bottom:calc(84px + 1vh)}
  .pfl .passport{margin-top:11px}
  .pfl .pbody{padding:9px 12px;gap:10px}
  .pfl .pbody img{width:58px;height:58px}
  .pfl .stamps{padding:0 12px 10px;gap:5px}
  .pfl .stamp{font-size:10px;padding:5px 1px}
  .pfl .fbar{left:18px;right:18px;bottom:12px;flex-direction:row;align-items:center;gap:8px}
  .pfl .fbar .sub{display:none}
  .pfl .fbar strong{font-size:14px}
  .pfl .cols{gap:10px;font-size:11.5px;white-space:nowrap}
}
@media (max-width:760px) and (max-height:700px){
  .pfl .ticks,.pfl .hero__left,.pfl .chips,.pfl .s-pass .copy{display:none}
  .pfl .title{font-size:25px}
  .pfl .copy{font-size:13px}
  .pfl .tile small{display:none}
  .pfl .s-track .copy{font-size:13px}
}
`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const spots = (pts: [number, number][]) => pts.map(([x, y]) => `${x} ${-y}`).join(' L');

export default function Landing() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [liveStats, setLiveStats] = useState({ walks: '500+', walkers: '50+', rating: '4.9' });
  const [routeEnds, setRouteEnds] = useState(() => [routeAt(0), routeAt(1)]);

  useEffect(() => {
    Promise.all([
      supabase.from('walks').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'walker').eq('walker_status', 'active'),
      supabase.from('walks').select('rating').eq('status', 'completed').not('rating', 'is', null),
    ]).then(([walksRes, walkersRes, ratingsRes]) => {
      const walksCount   = walksRes.count  ?? 0;
      const walkersCount = walkersRes.count ?? 0;
      const ratings      = (ratingsRes.data ?? []) as { rating: number }[];
      const avgRating    = ratings.length > 0
        ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
        : null;
      setLiveStats({
        walks:   walksCount   > 0 ? String(walksCount)   : '500+',
        walkers: walkersCount > 0 ? String(walkersCount) : '50+',
        rating:  avgRating ?? '4.9',
      });
    }).catch(() => {});
  }, []);

  // Poppins, for this page only.
  useEffect(() => {
    const id = 'pfl-poppins';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }, []);

  // Scroll animation, nav theme, tracking map, loader and the 3D puppy.
  useEffect(() => {
    const root = rootRef.current!;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wraps = Array.from(root.querySelectorAll<HTMLElement>('.chap'));
    const chapters = wraps.map((wrap, i) => {
      const sec = wrap.firstElementChild as HTMLElement;
      return {
        wrap,
        sec,
        first: i === 0,
        last: i === wraps.length - 1,
        chars: Array.from(sec.querySelectorAll<HTMLElement>('.ch')),
        words: Array.from(sec.querySelectorAll<HTMLElement>('.w')),
        items: Array.from(sec.querySelectorAll<HTMLElement>('.sc')),
        steps: Array.from(sec.querySelectorAll<HTMLElement>('.st')),
        ghosts: Array.from(sec.querySelectorAll<HTMLElement>('.ghost')),
        bubbles: Array.from(sec.querySelectorAll<HTMLElement>('.bubble')),
      };
    });
    const movers = Array.from(root.querySelectorAll<HTMLElement>('[data-speed]'));
    const done = root.querySelector<SVGPathElement>('.done');
    const way = root.querySelector<SVGPathElement>('.way');
    const trackBar = root.querySelector<HTMLElement>('.livecard i b');
    const trackIndex = wraps.findIndex(w => w.id === 'track');

    // The route draws itself up to wherever the puppy has walked.
    const drawWalked = (walked: number) => {
      const pts = routeSamples();
      done?.setAttribute('d', `M${spots(pts.slice(0, Math.max(2, Math.round(walked * (pts.length - 1)) + 1)))}`);
      if (trackBar) trackBar.style.transform = `scaleX(${walked})`;
    };
    let puppyLive = false;

    const render = () => {
      const h = innerHeight;
      for (const el of movers) {
        const p = -el.closest('.chap')!.getBoundingClientRect().top / h;
        const rot = parseFloat(el.dataset.rot ?? '0');
        el.style.transform = `translate3d(0,${p * parseFloat(el.dataset.speed!) * h}px,0) rotate(${p * rot}deg)`;
      }
      const stage = scrollStage(wraps);
      root.classList.toggle('on-dark', chapters[stage.i].sec.dataset.theme === 'dark' && stage.walk < 0.9);

      way?.setAttribute('d', `M${spots(routeSamples())}`);
      if (!puppyLive) drawWalked(stage.i > trackIndex ? 1 : stage.i === trackIndex ? stage.hold : 0);

      chapters.forEach((c, n) => {
        const r = c.wrap.getBoundingClientRect();
        if (calm || r.bottom < -h * 0.2 || r.top > h * 1.1) return;
        // enter: 0 as the chapter slides in, 1 once it has arrived.
        // leave: 0 while it's pinned and being read, 1 once it's nearly gone.
        const enter = c.first ? 1 : clamp01((h - r.top) / (h * 0.8));
        const leave = c.last ? 0 : clamp01((h - r.bottom) / (h * 0.6));
        const hold = n === stage.i ? stage.hold : n < stage.i ? 1 : 0;

        const total = c.chars.length || 1;
        c.chars.forEach((ch, i) => {
          const o = i / total;
          const a = ease(clamp01(enter * 1.6 - o * 0.6));
          const b = ease(clamp01(leave * 1.6 - o * 0.6));
          ch.style.transform = `translate3d(0,${(1 - a) - b}em,0) rotate(${(1 - a) * 9 - b * 6}deg) scale(${0.7 + a * 0.3})`;
          ch.style.opacity = String(a * (1 - b));
        });
        const m = c.words.length || 1;
        c.words.forEach((w, i) => {
          const a = clamp01(((enter - 0.45) / 0.45) * 1.3 - (i / m) * 0.3);
          w.style.opacity = String((0.12 + 0.88 * a) * (1 - leave));
        });
        c.items.forEach((el, i) => {
          const a = ease(clamp01((enter - 0.55) / 0.36 - i * 0.05));
          el.style.transform = `translate3d(0,${(1 - a) * 34 - leave * 50}px,0)`;
          el.style.opacity = String(a * (1 - leave));
        });
        // Steps appear one at a time during the pause: chat messages, passport stamps.
        const q = c.steps.length || 1;
        c.steps.forEach((el, i) => {
          const a = ease(clamp01((hold * 1.15 - i / q) * q));
          el.style.transform = `translate3d(0,${(1 - a) * 16}px,0) scale(${0.92 + a * 0.08})`;
          el.style.opacity = String(a * (1 - leave));
        });
        for (const g of c.ghosts) g.style.transform = `translate3d(${(r.top / h - 0.5) * 22}vw,0,0)`;
        c.bubbles.forEach((b, i) => {
          b.style.transform = `translate3d(0,${(r.top / h) * (160 + i * 90)}px,0)`;
        });
      });
    };

    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; render(); });
    };
    const onResize = () => { setRouteEnds([routeAt(0), routeAt(1)]); onScroll(); };
    render();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onResize);

    const reveal = () => {
      loaderRef.current?.classList.add('done');
      root.classList.add('loaded');
    };
    // The app's own splash has already been shown, so don't hold this one long.
    const fallback = setTimeout(reveal, 2200);

    let dispose: (() => void) | undefined;
    let cancelled = false;
    import('../components/landing/puppyScene')
      .then(async ({ createPuppyScene }) => {
        if (!canvasRef.current) return;
        puppyLive = true;
        const stop = await createPuppyScene(canvasRef.current, wraps, drawWalked);
        if (cancelled) return stop();
        dispose = stop;
        canvasRef.current?.classList.add('ready');
        reveal();
      })
      .catch(() => {
        puppyLive = false;
        root.classList.add('no3d');
        reveal();
      });

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onResize);
      dispose?.();
    };
  }, []);

  const go = (path: string) => () => navigate(path);
  const link = (path: string) => (e: MouseEvent) => { e.preventDefault(); navigate(path); };
  const jump = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
  const at = (p: { x: number; y: number }) => ({ left: `${((p.x + 1) / 2) * 100}%`, top: `${((1 - p.y) / 2) * 100}%` });

  return (
    <div className="pfl" ref={rootRef}>
      <style>{CSS}</style>

      <div className="loader" ref={loaderRef}><div><PawTag id="tag-loader" /></div></div>

      <nav className="nav">
        <a className="logo" href="#top" onClick={jump('top')} aria-label="PawFleet home">
          <span><PawFleetLogo size={36} /></span>
          <span>PawFleet</span>
        </a>
        <div className="nav__links">
          <a href="#walks" onClick={jump('walks')}>Walks</a>
          <a href="#groom" onClick={jump('groom')}>Grooming</a>
          <a href="#vets" onClick={jump('vets')}>Vets</a>
          <a href="#market" onClick={jump('market')}>Marketplace</a>
          <a href="#passport" onClick={jump('passport')}>Passport</a>
        </div>
        <div className="nav__cta">
          <button className="signin" onClick={go('/login')}>Sign in</button>
          <button className="pill" onClick={go('/register')}>Get started</button>
        </div>
      </nav>

      <canvas id="pup" ref={canvasRef} />

      <main>
        <div className="chap" id="top">
          <section className="hero" data-theme="light">
            <h1 aria-label="Smarter dog walks. Simply managed.">
              <span className="line"><span><Chars text="Smarter dog walks." /></span></span>
              <span className="line"><span><Chars text="Simply managed." /></span></span>
            </h1>
            <div className="flower tag-a" data-speed="-0.4" data-rot="40"><PawTag id="tag-a" /></div>
            <div className="flower tag-b" data-speed="0.3" data-rot="-50"><PawTag id="tag-b" /></div>
            <div className="hero__left">
              <div><b>{liveStats.walks}</b><span>Walks done</span></div>
              <div><b>{liveStats.rating}★</b><span>Avg rating</span></div>
            </div>
            <div className="hero__side">
              <p>Walks, grooming, vets, food and friends for your dog — all in one app, right here in Lusaka.</p>
              <button className="join" onClick={go('/register')}><i><Chevron /></i>Get started</button>
            </div>
            <img className="pup-fallback" src="/landing/front.webp" alt="A happy golden puppy in a green PawFleet collar" />
          </section>
        </div>

        <div className="chap" id="walks">
          <section className="s-walk" data-theme="light">
            <div className="ghost" aria-hidden="true">Walks</div>
            <div className="text text--r">
              <div className="eyebrow sc"><Dog /> Dog walking</div>
              <Title lines={['Get your dog walked', 'by professional', 'walkers']} />
              <Copy text="Every PawFleet walker passes NRC verification, a background check and a dog-handling assessment. Book instantly or schedule ahead, and we'll show you who's nearest." />
              <div className="ticks">
                <span className="sc">Instant or scheduled bookings</span>
                <span className="sc">Pin-drop pickup, right at your gate</span>
                <span className="sc">Rate every walk</span>
              </div>
              <Join onClick={go('/register')}>Book a walk</Join>
            </div>
          </section>
        </div>

        <div className="chap chap--long" id="track">
          <section className="s-track" data-theme="dark">
            <svg className="mapbg" viewBox="-1 -1 2 2" preserveAspectRatio="none" aria-hidden="true">
              <path className="park" d="M.42 -.5 Q.8 -.62 .9 -.3 Q.7 -.12 .46 -.22Z" />
              <path className="park" d="M-.2 .5 Q.1 .3 .3 .6 Q.1 .9 -.2 .8Z" />
              <path className="street" d="M-1 .3 C-.3 .2 .3 .5 1 .2" />
              <path className="street" d="M-.1 -1 C0 -.3 -.1 .3 .1 1" />
              <path className="street" d="M.6 -1 C.5 -.4 .7 .3 .55 1" />
              <path className="street" d="M-1 -.45 C-.2 -.5 .4 -.3 1 -.5" />
              <path className="lane" d="M-.5 -1 L-.45 1" />
              <path className="lane" d="M.28 -1 C.2 -.3 .32 .3 .3 1" />
              <path className="lane" d="M.85 -1 L.8 1" />
              <path className="lane" d="M-1 -.08 C-.2 -.14 .5 .02 1 -.1" />
              <path className="lane" d="M-1 .68 C-.1 .6 .4 .75 1 .62" />
              <path className="way" />
              <path className="done" />
            </svg>
            <div className="pin" style={at(routeEnds[0])}><MapPin /> Home</div>
            <div className="pin" style={at(routeEnds[1])}><MapPin /> Park</div>
            <div className="text">
              <div className="eyebrow sc"><MapPin /> Live tracking</div>
              <Title lines={['Track your pet', 'on every walk']} />
              <Copy text="Watch every step on a live map as it happens, chat with your walker and get a notification the moment they're home." />
              <div className="stats">
                <div className="sc"><b>{liveStats.walks}</b><span>Walks done</span></div>
                <div className="sc"><b>{liveStats.walkers}</b><span>Active walkers</span></div>
                <div className="sc"><b>{liveStats.rating}★</b><span>Avg rating</span></div>
              </div>
            </div>
            <div className="livecard">
              <span className="live-dot" /><b>Walk in progress</b>
              <small>Your dog is out with their walker</small>
              <i><b /></i>
            </div>
          </section>
        </div>

        <div className="chap chap--long" id="groom">
          <section className="s-groom" data-theme="light">
            <div className="ghost" aria-hidden="true">Groom</div>
            <span className="bubble" style={{ width: 90, height: 90, left: '56vw', top: '20vh' }} />
            <span className="bubble" style={{ width: 46, height: 46, left: '64vw', top: '62vh' }} />
            <span className="bubble" style={{ width: 62, height: 62, left: '88vw', top: '16vh' }} />
            <span className="bubble" style={{ width: 30, height: 30, left: '50vw', top: '70vh' }} />
            <div className="text text--l">
              <div className="eyebrow sc"><Scissors /> Professional grooming</div>
              <Title lines={['Get your dog', 'groomed professionally']} />
              <Copy text="From a quick nail trim to a full pamper spa, our groomers come to you. Pick a package, drop a pin and book." />
              <div className="prices">
                {GROOM_PACKAGES.filter(p => !p.isVet).map(p => (
                  <div key={p.id} className="card sc">
                    <b>{p.label}</b>
                    <span>K{p.price}</span>
                    <small>{p.minutes} mins</small>
                  </div>
                ))}
              </div>
              <Join onClick={go('/register')}>Book a groom</Join>
            </div>
          </section>
        </div>

        <div className="chap" id="vets">
          <section className="s-vet" data-theme="light">
            <VetClinic />
            <div className="text text--r">
              <div className="eyebrow sc"><Stethoscope /> Vet care</div>
              <Title lines={['Find your nearest vet', 'and book online']} />
              <Copy text="See the vet clinics closest to you on a map and book your visit in advance, without the phone calls." />
              <div className="clinic card sc">
                <div className="ic"><Stethoscope size={21} /></div>
                <div><b>Your nearest clinic</b><small>Sorted by distance from you</small></div>
                <em>Book</em>
              </div>
              <div className="chips">
                {['General checkup', 'Vaccination', 'Dental care', 'Deworming', 'Emergency visit'].map(s => <span key={s} className="sc">{s}</span>)}
              </div>
            </div>
          </section>
        </div>

        <div className="chap" id="market">
          <section className="s-market" data-theme="light">
            <div className="text">
              <div className="eyebrow sc"><ShoppingBag /> Marketplace</div>
              <Title lines={['Everything your', 'dog needs, in', 'one market']} />
              <Copy text="Looking for a new dog? Running low on food? Shop from pet stores near you, or find your next best friend." />
            </div>
            <div className="tiles">
              <button className="tile tile--big card sc" onClick={go('/register')}>
                <PuppyShop />
                <span><b>Find a new dog</b><small>Browse listings with vaccination, deworming and microchip status shown up front.</small></span>
              </button>
              <button className="tile card sc" onClick={go('/register')}>
                <span className="ic"><UtensilsCrossed size={21} /></span>
                <b>Dog food</b><small>Meal plans and everyday food</small>
              </button>
              <button className="tile card sc" onClick={go('/register')}>
                <span className="ic"><Bone size={21} /></span>
                <b>Treats</b><small>Rewards for your good pup</small>
              </button>
              <button className="tile card sc" onClick={go('/register')}>
                <span className="ic"><Sparkles size={21} /></span>
                <b>Accessories & hygiene</b><small>Collars, leads, shampoo and more</small>
              </button>
              <button className="tile card sc" onClick={go('/register')}>
                <span className="ic"><Store size={21} /></span>
                <b>Shops near you</b><small>See local pet shops on the map</small>
              </button>
            </div>
          </section>
        </div>

        <div className="chap" id="community">
          <section className="s-chat" data-theme="light">
            <div className="text text--l">
              <div className="eyebrow sc"><MessageCircle /> Community</div>
              <Title lines={['Chat with friends', 'who love dogs too']} />
              <Copy text="Share photos, swap tips with other dog owners and message your walker, groomer or friends, all in one inbox." />
            </div>
            <div className="phone">
              <div className="phone__in">
                <div className="phone__bar"><i /><span>Dog park friends<small>12 owners online</small></span></div>
                <div className="bubbles">
                  <div className="msg st"><small>Natasha</small>Anyone at the park this Saturday?</div>
                  <div className="msg msg--me st">We'll be there! Bringing the ball</div>
                  <div className="msg st"><small>Your walker</small>On our way home, great walk today!</div>
                </div>
                <div className="phone__type">Message...</div>
              </div>
            </div>
          </section>
        </div>

        <div className="chap" id="everyone">
          <section className="s-roles" data-theme="dark">
            <Town />
            <div className="wrap">
              <div className="eyebrow sc"><UsersRound /> For everyone</div>
              <Title lines={['One home for everyone', 'who cares for dogs']} />
              <div className="roles">
                <div className="role sc"><Dog /><b>Dog owners</b><small>Book, track and care, all from your phone</small></div>
                <div className="role sc"><MapPin /><b>Walkers</b><small>Set your hours and get paid to Mobile Money</small></div>
                <div className="role sc"><Scissors /><b>Groomers</b><small>Fill your diary with nearby bookings</small></div>
                <div className="role sc"><Stethoscope /><b>Vets</b><small>Get found and take bookings online</small></div>
                <div className="role sc"><Store /><b>Shops</b><small>Sell to dog owners close to you</small></div>
              </div>
              <Join onClick={go('/register')}>Apply to walk</Join>
            </div>
          </section>
        </div>

        <div className="chap chap--end" id="passport">
          <section className="s-pass" data-theme="light">
            <div className="text">
              <div className="eyebrow sc"><ShieldCheck /> Digital passport</div>
              <Title lines={["Create your pet's", 'digital passport']} />
              <Copy text="One home for your dog's profile, health journal, vet visits and walks. Always with you, always up to date." />
              <div className="passport sc">
                <header>PAWFLEET PET PASSPORT <span>ZM</span></header>
                <div className="pbody">
                  <img src="/landing/front.webp" alt="" />
                  <dl>
                    <dt>Name</dt><dd>Your best friend</dd>
                    <dt>Breed</dt><dd>Golden Retriever</dd>
                    <dt>Home</dt><dd>Lusaka, Zambia</dd>
                  </dl>
                </div>
                <div className="stamps">
                  <div className="stamp st">Health journal</div>
                  <div className="stamp st">Vet visits</div>
                  <div className="stamp st">Weight</div>
                  <div className="stamp st">Walk history</div>
                </div>
              </div>
              <Join onClick={go('/register')}>Create your pet's passport</Join>
            </div>
            <div className="fbar">
              <div>
                <strong><PawFleetLogo size={24} />PawFleet</strong>
                <span className="sub">Walks, grooming and vet care · Lusaka, Zambia</span>
              </div>
              <div className="cols">
                <a href="/login" onClick={link('/login')}>Sign in</a>
                <a href="/privacy-policy" onClick={link('/privacy-policy')}>Privacy & Terms</a>
                <a href="#top" onClick={jump('top')}>Back to top</a>
              </div>
            </div>
          </section>
        </div>
      </main>

      <div className="badge">
        <svg viewBox="0 0 24 24"><path d={PAW} /></svg>
        Made in <b>Lusaka</b>
      </div>
    </div>
  );
}
