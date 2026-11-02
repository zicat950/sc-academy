import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./Webinar.css";

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------ */
/* CONFIG                                                              */
/* ------------------------------------------------------------------ */
// Backend base URL. Set VITE_API_URL in .env (e.g. https://api.yoursite.com)
const API = import.meta.env.VITE_API_URL || "";

// Session: every Saturday 19:30 IST  ==  14:00 UTC (IST = UTC+5:30, no DST)
const SESSION_UTC = { day: 6, hour: 14, minute: 0 };
const SESSION_MINUTES = 120; // how long the "LIVE / Join" window stays open

const ZONES = [
  { country: "India", label: "IST", tz: "Asia/Kolkata" },
  { country: "UAE", label: "GST", tz: "Asia/Dubai" },
  { country: "United Kingdom", label: "GMT / BST", tz: "Europe/London" },
  { country: "USA", label: "Eastern Time", tz: "America/New_York" },
  { country: "Saudi Arabia", label: "AST", tz: "Asia/Riyadh" },
  { country: "Singapore", label: "SGT", tz: "Asia/Singapore" },
  { country: "Australia", label: "AEST", tz: "Australia/Sydney" },
];

const TOPICS = [
  { t: "Stock Market Fundamentals", d: "How markets, exchanges and instruments really work.", i: "M3 17l5-5 4 4 8-9M3 21h18" },
  { t: "Technical Analysis", d: "Read charts, structure and trend with discipline.", i: "M4 20V10m5 10V4m5 16v-8m5 8V7" },
  { t: "Price Action Trading", d: "Trade what price shows, not what indicators suggest.", i: "M3 15l4-6 4 4 4-8 6 10" },
  { t: "Intraday Trading", d: "Frameworks for fast, structured same-day decisions.", i: "M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z" },
  { t: "Options Trading", d: "Understand premiums, strategies and payoff profiles.", i: "M4 18c4 0 4-12 8-12s4 12 8 12" },
  { t: "Risk Management", d: "Position sizing and capital protection first.", i: "M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6l8-3z" },
  { t: "Professional Market Analysis", d: "Build a repeatable, professional analysis routine.", i: "M4 5h16M4 12h10M4 19h16" },
];

const STEPS = [
  ["Register for the Masterclass", "Share your details through the secure registration form."],
  ["Receive Your Confirmation", "Your confirmation shows the next session in your local time."],
  ["Get Your Google Meet Details", "Registered students get access to the meeting details."],
  ["Join Every Saturday at 7:30 PM IST", "Click Join Masterclass when the session goes live."],
];

// Approximate city coordinates for the community visual (lat, lon)
const HUB = { n: "India", lat: 10.0, lon: 76.3 };
const NODES = [
  { n: "UAE", lat: 25.2, lon: 55.3 },
  { n: "United Kingdom", lat: 51.5, lon: -0.1 },
  { n: "USA", lat: 40.7, lon: -74 },
  { n: "Saudi Arabia", lat: 24.7, lon: 46.7 },
  { n: "Singapore", lat: 1.35, lon: 103.8 },
  { n: "Australia", lat: -33.9, lon: 151.2 },
];

const COUNTRIES = [
  ["India", "+91"], ["United Arab Emirates", "+971"], ["United Kingdom", "+44"], ["United States", "+1"],
  ["Canada", "+1"], ["Saudi Arabia", "+966"], ["Qatar", "+974"], ["Kuwait", "+965"], ["Oman", "+968"],
  ["Bahrain", "+973"], ["Singapore", "+65"], ["Malaysia", "+60"], ["Australia", "+61"], ["New Zealand", "+64"],
  ["Germany", "+49"], ["France", "+33"], ["South Africa", "+27"], ["Other", ""],
];

/* ------------------------------------------------------------------ */
/* TIME HELPERS                                                        */
/* ------------------------------------------------------------------ */
function nextSession(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), SESSION_UTC.hour, SESSION_UTC.minute));
  d.setUTCDate(d.getUTCDate() + ((SESSION_UTC.day - d.getUTCDay() + 7) % 7));
  // keep the current session as "next" until its live window ends
  if (now.getTime() > d.getTime() + SESSION_MINUTES * 60000) d.setUTCDate(d.getUTCDate() + 7);
  return d;
}
const fmtTime = (date, tz) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long", hour: "numeric", minute: "2-digit", hour12: true }).format(date);
const fmtDate = (date, tz) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric", month: "long", year: "numeric" }).format(date);
const tzShort = (date, tz) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: tz, timeZoneName: "short" }).formatToParts(date).find((p) => p.type === "timeZoneName")?.value || tz;

/* ------------------------------------------------------------------ */
/* SMALL COMPONENTS                                                    */
/* ------------------------------------------------------------------ */
const MeetIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <rect x="2" y="6" width="13" height="12" rx="2.5" fill="currentColor" opacity=".95" />
    <path d="M16 10.5l5-3v9l-5-3z" fill="currentColor" opacity=".7" />
  </svg>
);

const LiveDot = ({ text = "LIVE" }) => (
  <span className="wb-live"><i /> {text}</span>
);

const reveal = {
  hidden: { opacity: 0, y: 40 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.9, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] } }),
};

function Tilt({ children, className = "" }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [9, -9]), { stiffness: 160, damping: 18 });
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-9, 9]), { stiffness: 160, damping: 18 });
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };
  const leave = () => { x.set(0); y.set(0); };
  return (
    <motion.div className={className} style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }} onMouseMove={move} onMouseLeave={leave}>
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* SECTIONS                                                            */
/* ------------------------------------------------------------------ */
function Hero({ onRegister }) {
  const root = useRef(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".wb-hero-line span", { yPercent: 110, duration: 1.3, stagger: 0.14, ease: "power4.out", delay: 0.2 });
      gsap.to(".wb-hero-glow", { yPercent: 25, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } });
      gsap.to(".wb-float", { yPercent: -40, ease: "none", stagger: 0.1, scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="wb-hero" ref={root}>
      <div className="wb-hero-glow" />
      <div className="wb-grid-bg" />
      <svg className="wb-float wb-float-a" viewBox="0 0 200 80"><polyline points="0,70 30,50 55,60 90,25 120,38 160,10 200,18" /></svg>
      <svg className="wb-float wb-float-b" viewBox="0 0 120 120">
        {[15, 40, 65, 90].map((x, i) => (
          <g key={x}><line x1={x} x2={x} y1={20 + i * 6} y2={100 - i * 8} /><rect x={x - 6} y={35 + i * 4} width="12" height={30 + i * 6} /></g>
        ))}
      </svg>

      <div className="wb-container wb-hero-inner">
        <motion.div className="wb-badges" initial="hidden" animate="show" variants={reveal}>
          <span className="wb-badge">GLOBAL LIVE MASTERCLASS</span>
          <LiveDot />
        </motion.div>

        <h1 className="wb-hero-title" aria-label="The world learns to trade.">
          <span className="wb-hero-line"><span>THE WORLD</span></span>
          <span className="wb-hero-line"><span>LEARNS TO <em>TRADE.</em></span></span>
        </h1>

        <motion.p className="wb-hero-sub" initial="hidden" animate="show" custom={4} variants={reveal}>
          One Global Community. One Market. Endless Possibilities.
        </motion.p>
        <motion.p className="wb-hero-desc" initial="hidden" animate="show" custom={5} variants={reveal}>
          Join our exclusive weekly trading masterclass and learn market strategies, technical analysis and professional
          trading concepts alongside students from around the world.
        </motion.p>

        <motion.div className="wb-hero-meta" initial="hidden" animate="show" custom={6} variants={reveal}>
          <span>Every Saturday <b>|</b> 7:30 PM IST</span>
          <span className="wb-meet"><MeetIcon /> Google Meet</span>
        </motion.div>

        <motion.div className="wb-cta" initial="hidden" animate="show" custom={7} variants={reveal}>
          <button className="wb-btn wb-btn-primary" onClick={onRegister}>REGISTER FOR NEXT SESSION</button>
          <a className="wb-btn wb-btn-ghost" href="#wb-tz">EXPLORE MASTERCLASS</a>
        </motion.div>
      </div>
    </section>
  );
}

function Timezones({ session }) {
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <section className="wb-section wb-tz" id="wb-tz">
      <div className="wb-container">
        <motion.p className="wb-eyebrow" variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true }}>YOUR TIME</motion.p>
        <motion.h2 className="wb-h2" variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true }}>
          Wherever you are in the world, your classroom is just one click away.
        </motion.h2>

        <motion.div className="wb-local" variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <small>Your local time ({local.replace("_", " ")})</small>
          <strong>{fmtTime(session, local)}</strong>
          <span>{fmtDate(session, local)} · {tzShort(session, local)}</span>
        </motion.div>

        <div className="wb-tz-grid">
          {ZONES.map((z, i) => (
            <motion.div key={z.tz} className="wb-tz-row" variants={reveal} custom={i} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <span className="wb-tz-country">{z.country}</span>
              <span className="wb-tz-label">{z.label}</span>
              <span className="wb-tz-time">{fmtTime(session, z.tz)}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Learn() {
  return (
    <section className="wb-section wb-learn">
      <div className="wb-container">
        <p className="wb-eyebrow">THE CURRICULUM</p>
        <h2 className="wb-h2">What You Will Learn</h2>
        <div className="wb-learn-grid">
          {TOPICS.map((t, i) => (
            <motion.div key={t.t} variants={reveal} custom={i % 4} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
              <Tilt className="wb-learn-card">
                <span className="wb-learn-no">{String(i + 1).padStart(2, "0")}</span>
                <svg viewBox="0 0 24 24" className="wb-icon"><path d={t.i} /></svg>
                <h3>{t.t}</h3>
                <p>{t.d}</p>
              </Tilt>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const W = 1000, H = 500;
const proj = (lat, lon) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];

function Community() {
  const root = useRef(null);
  const hub = proj(HUB.lat, HUB.lon);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray(".wb-arc").forEach((p) => {
        const len = p.getTotalLength();
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(p, { strokeDashoffset: 0, duration: 2, ease: "power2.inOut", scrollTrigger: { trigger: root.current, start: "top 70%" } });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="wb-section wb-community" ref={root}>
      <div className="wb-container">
        <p className="wb-eyebrow">GLOBAL COMMUNITY</p>
        <h2 className="wb-h2 wb-light">ONE CLASSROOM. STUDENTS FROM AROUND THE WORLD.</h2>
        <div className="wb-map">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Connections between our classroom in India and learners worldwide">
            {[...Array(11)].map((_, i) => <line key={"v" + i} x1={(i * W) / 10} x2={(i * W) / 10} y1="0" y2={H} className="wb-graticule" />)}
            {[...Array(6)].map((_, i) => <line key={"h" + i} y1={(i * H) / 5} y2={(i * H) / 5} x1="0" x2={W} className="wb-graticule" />)}
            {NODES.map((n) => {
              const [x, y] = proj(n.lat, n.lon);
              const cx = (x + hub[0]) / 2, cy = Math.min(y, hub[1]) - 70;
              return (
                <g key={n.n}>
                  <path className="wb-arc" d={`M${hub[0]},${hub[1]} Q${cx},${cy} ${x},${y}`} />
                  <circle cx={x} cy={y} r="5" className="wb-node" />
                  <circle cx={x} cy={y} r="5" className="wb-node-ring" />
                  <text x={x + 10} y={y + 4}>{n.n}</text>
                </g>
              );
            })}
            <circle cx={hub[0]} cy={hub[1]} r="8" className="wb-hub" />
            <text x={hub[0] + 12} y={hub[1] + 18} className="wb-hub-label">{HUB.n}</text>
          </svg>
        </div>
        <p className="wb-community-note">Add your own photography here (classroom, city skylines) by placing images in <code>/public/masterclass/</code>.</p>
      </div>
    </section>
  );
}

function Steps() {
  return (
    <section className="wb-section wb-steps">
      <div className="wb-container">
        <p className="wb-eyebrow">HOW TO JOIN</p>
        <h2 className="wb-h2">Four steps to your seat.</h2>
        <ol className="wb-steps-list">
          {STEPS.map(([t, d], i) => (
            <motion.li key={t} variants={reveal} custom={i} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <span>{i + 1}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* REGISTRATION                                                        */
/* ------------------------------------------------------------------ */
const EMPTY = { name: "", email: "", code: "+91", phone: "", country: "India", experience: "", language: "" };

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = "Please enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = "Enter a valid email address.";
  if (!/^\+\d{1,4}$/.test(f.code.trim())) e.code = "Use format +91.";
  if (!/^\d{6,14}$/.test(f.phone.replace(/[\s-]/g, ""))) e.phone = "Enter 6–14 digits.";
  if (!f.country) e.country = "Select your country.";
  if (!f.experience) e.experience = "Select your experience.";
  if (!f.language) e.language = "Select a language.";
  return e;
}

function RegisterModal({ open, onClose, session, onDone }) {
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverErr, setServerErr] = useState("");
  const [done, setDone] = useState(null);
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const set = (k) => (e) => {
    const v = e.target.value;
    setF((p) => {
      const n = { ...p, [k]: v };
      if (k === "country") { const c = COUNTRIES.find((x) => x[0] === v); if (c && c[1]) n.code = c[1]; }
      return n;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    const v = validate(f);
    setErr(v);
    if (Object.keys(v).length) return;
    setBusy(true); setServerErr("");
    try {
      const res = await fetch(`${API}/api/masterclass/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: f.name.trim(), email: f.email.trim().toLowerCase(), whatsapp: `${f.code.trim()}${f.phone.replace(/[\s-]/g, "")}`,
          country: f.country, experience: f.experience, language: f.language, timezone: local,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Registration failed. Please try again.");
      localStorage.setItem("wb_reg", JSON.stringify({ email: f.email.trim().toLowerCase(), token: data.token }));
      setDone(data);
      onDone?.(data);
    } catch (x) {
      setServerErr(x.message || "Could not reach the server.");
    } finally { setBusy(false); }
  };

  const close = () => { onClose(); setTimeout(() => { setDone(null); setF(EMPTY); setErr({}); }, 400); };
  const field = (k, label, el) => (
    <label className={`wb-field ${err[k] ? "has-err" : ""}`}>
      <span>{label}</span>{el}{err[k] && <em>{err[k]}</em>}
    </label>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="wb-modal-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.div className="wb-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
            initial={{ y: 60, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
            <button className="wb-close" onClick={close} aria-label="Close">×</button>
            {done ? (
              <div className="wb-done">
                <div className="wb-check">✓</div>
                <h3>You're registered.</h3>
                <p>Your next session</p>
                <strong>{fmtDate(session, local)}</strong>
                <div className="wb-done-times">
                  <span>{fmtTime(session, local)} <small>({tzShort(session, local)}, your time)</small></span>
                  <span>{fmtTime(session, "Asia/Kolkata")} <small>(IST)</small></span>
                </div>
                <p className="wb-note">
                  Google Meet access is provided to registered students. {done.meetUrl
                    ? "Your link will appear on this page as the Join Masterclass button when the session goes live."
                    : "The Meet link will be shared by the academy before the session."}
                </p>
                <button className="wb-btn wb-btn-primary" onClick={close}>DONE</button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <p className="wb-eyebrow">RESERVE YOUR SEAT</p>
                <h3>Register for the next masterclass</h3>
                {field("name", "Full Name", <input value={f.name} onChange={set("name")} autoComplete="name" />)}
                {field("email", "Email Address", <input type="email" value={f.email} onChange={set("email")} autoComplete="email" />)}
                {field("country", "Country", (
                  <select value={f.country} onChange={set("country")}>{COUNTRIES.map(([c]) => <option key={c}>{c}</option>)}</select>
                ))}
                <div className="wb-phone">
                  {field("code", "Code", <input value={f.code} onChange={set("code")} inputMode="tel" />)}
                  {field("phone", "WhatsApp Number", <input value={f.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel-national" />)}
                </div>
                {field("experience", "Trading Experience", (
                  <select value={f.experience} onChange={set("experience")}>
                    <option value="">Select…</option><option>Complete beginner</option><option>Less than 1 year</option>
                    <option>1–3 years</option><option>3+ years</option>
                  </select>
                ))}
                {field("language", "Preferred Language", (
                  <select value={f.language} onChange={set("language")}>
                    <option value="">Select…</option><option>English</option><option>Malayalam</option><option>Hindi</option>
                    <option>Arabic</option><option>Tamil</option><option>Other</option>
                  </select>
                ))}
                {serverErr && <p className="wb-server-err">{serverErr}</p>}
                <button className="wb-btn wb-btn-primary wb-full" disabled={busy}>{busy ? "SUBMITTING…" : "CONFIRM REGISTRATION"}</button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* PAGE                                                                */
/* ------------------------------------------------------------------ */
export default function Webinar() {
  const session = useMemo(() => nextSession(), []);
  const [open, setOpen] = useState(false);

  return (
    <main className="wb-page">
      <Hero onRegister={() => setOpen(true)} />
      <Timezones session={session} />
      <Learn />
      <Community />
      <Steps />
      <section className="wb-final">
        <h2>Your seat in the world's classroom.</h2>
        <button className="wb-btn wb-btn-primary" onClick={() => setOpen(true)}>REGISTER FOR NEXT SESSION</button>
      </section>
      <RegisterModal open={open} onClose={() => setOpen(false)} session={session} />
    </main>
  );
}