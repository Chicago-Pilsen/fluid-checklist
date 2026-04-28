import { useState, useRef, useEffect } from "react";

const fluids = [
  { id: "engine_oil",      name: "Engine Oil",             icon: "🛢️",  description: "Lubrication for engine internals",   interval: "5,000–7,500 mi" },
  { id: "coolant",         name: "Coolant / Antifreeze",   icon: "🌡️",  description: "Regulates engine temperature",       interval: "30,000 mi" },
  { id: "transmission",    name: "Transmission Fluid",     icon: "⚙️",  description: "Keeps gear shifts smooth",           interval: "30,000–60,000 mi" },
  { id: "brake",           name: "Brake Fluid",            icon: "🛑",  description: "Hydraulic pressure for braking",     interval: "Every 2 years" },
  { id: "power_steering",  name: "Power Steering Fluid",   icon: "🔄",  description: "Assists steering effort",            interval: "50,000 mi" },
  { id: "windshield",      name: "Windshield Washer",      icon: "💧",  description: "Cleans the windshield",              interval: "As needed" },
  { id: "differential",    name: "Differential Fluid",     icon: "🔧",  description: "Lubricates the differential",        interval: "30,000–50,000 mi" },
  { id: "ac_refrigerant",  name: "A/C Refrigerant",        icon: "❄️",  description: "Cools the cabin air",               interval: "Every 2–3 years" },
];

export default function FluidChecklist() {
  const [serviced, setServiced] = useState(new Set());
  // Keep a ref mirror of serviced so the global pointerup handler
  // never closes over a stale value
  const servicedRef = useRef(new Set());

  const dragging   = useRef(false);
  const startIdx   = useRef(null);
  const lastIdx    = useRef(null);
  const dragAction = useRef("add");
  const previewRef = useRef(new Set());
  const [previewSet, setPreviewSet] = useState(new Set());
  const cardRefs   = useRef([]);

  // Keep ref in sync whenever state changes
  useEffect(() => { servicedRef.current = serviced; }, [serviced]);

  const getIdxFromY = (clientY) => {
    for (let i = 0; i < cardRefs.current.length; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;
      const { top, bottom } = el.getBoundingClientRect();
      if (clientY >= top && clientY <= bottom) return i;
    }
    if (clientY < (cardRefs.current[0]?.getBoundingClientRect().top ?? 0)) return 0;
    return cardRefs.current.length - 1;
  };

  const buildRange = (a, b) => {
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const s = new Set();
    for (let i = lo; i <= hi; i++) s.add(i);
    return s;
  };

  const onPointerDown = (e, idx) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    dragging.current   = true;
    startIdx.current   = idx;
    lastIdx.current    = idx;
    // Use the ref so we always see current serviced state
    dragAction.current = servicedRef.current.has(fluids[idx].id) ? "remove" : "add";
    const range = buildRange(idx, idx);
    previewRef.current = range;
    setPreviewSet(new Set(range));
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const idx = getIdxFromY(e.clientY);
    if (idx === lastIdx.current) return;
    lastIdx.current = idx;
    const range = buildRange(startIdx.current, idx);
    previewRef.current = range;
    setPreviewSet(new Set(range));
  };

  // Stable commit handler — reads everything from refs, never stale
  const commitDrag = useRef(() => {
    if (!dragging.current) return;
    dragging.current = false;
    const action  = dragAction.current;
    const indices = new Set(previewRef.current);
    setServiced(prev => {
      const next = new Set(prev);
      indices.forEach(i => {
        const id = fluids[i].id;
        if (action === "add") next.add(id);
        else next.delete(id);
      });
      return next;
    });
    previewRef.current = new Set();
    setPreviewSet(new Set());
  }).current;

  useEffect(() => {
    window.addEventListener("pointerup", commitDrag);
    return () => window.removeEventListener("pointerup", commitDrag);
  }, [commitDrag]);

  const doneCount = serviced.size;

  const isGreen = (idx) => {
    const id = fluids[idx].id;
    if (previewSet.has(idx)) return dragAction.current === "add";
    return serviced.has(id);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        fontFamily: "'DM Mono', monospace",
        color: "#e2e8f0",
        padding: "36px 16px 80px",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
      }}
      onPointerMove={onPointerMove}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .fc-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          border-radius: 10px;
          border: 1px solid #1e2130;
          background: #111118;
          cursor: ns-resize;
          touch-action: none;
          transition: background 0.18s, border-color 0.18s, box-shadow 0.18s, transform 0.12s;
          -webkit-tap-highlight-color: transparent;
        }
        .fc-card.serviced {
          background: #071a10;
          border-color: #1a4a2a;
          box-shadow: 0 0 18px rgba(34,197,94,0.1);
        }
        .fc-card.add-preview {
          background: #0b2416;
          border-color: #4ade80;
          transform: scaleX(1.013);
          box-shadow: 0 0 0 2px rgba(74,222,128,0.5), 0 0 18px rgba(34,197,94,0.15);
          z-index: 2;
        }
        .fc-card.remove-preview {
          background: #1a0a0a;
          border-color: #f87171;
          transform: scaleX(1.013);
          box-shadow: 0 0 0 2px rgba(248,113,113,0.4);
          z-index: 2;
        }

        .hint-bar {
          display: flex; align-items: center; gap: 8px;
          color: #2d3748; font-size: 11px; letter-spacing: 0.08em;
          padding: 10px 14px; border: 1px dashed #1e2130; border-radius: 8px;
          margin-bottom: 18px;
        }
        .hint-arrow { animation: nudge 1.5s ease-in-out infinite; display: inline-block; }
        @keyframes nudge { 0%,100%{transform:translateY(0)} 50%{transform:translateY(5px)} }

        .progress-track { height: 4px; background: #1e2130; border-radius: 4px; overflow: hidden; margin-top: 12px; }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #16a34a, #4ade80);
          border-radius: 4px;
          box-shadow: 0 0 8px rgba(74,222,128,0.4);
          transition: width 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }

        .lbl-done { font-size: 10px; color: #4ade80; letter-spacing: 0.1em; text-transform: uppercase; background: #14532d22; border: 1px solid #22c55e33; border-radius: 20px; padding: 2px 9px; }
        .lbl-pend { font-size: 10px; color: #2d3748; letter-spacing: 0.08em; text-transform: uppercase; }

        .reset-btn { background: none; border: 1px solid #1e2130; border-radius: 6px; color: #4b5563; font-family:'DM Mono',monospace; font-size:11px; padding:5px 12px; cursor:pointer; transition: color 0.2s, border-color 0.2s; }
        .reset-btn:hover { color:#f87171; border-color:#f8717166; }
      `}</style>

      <div style={{ maxWidth: 540, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: "#2d3748", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>
            Vehicle · Service Intake
          </p>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(48px, 10vw, 68px)",
            letterSpacing: "0.04em",
            lineHeight: 0.95,
            color: "#f9fafb",
          }}>
            FLUID<br/>
            <span style={{ color: "#22c55e" }}>STATUS</span>
          </h1>

          <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 11, color: "#4b5563" }}>
              <span style={{ color: "#4ade80", fontVariantNumeric: "tabular-nums" }}>{doneCount}</span>
              {" / "}{fluids.length} serviced
            </p>
            {doneCount > 0 && (
              <button className="reset-btn" onClick={() => setServiced(new Set())}>✕ reset all</button>
            )}
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${(doneCount / fluids.length) * 100}%` }} />
          </div>
        </div>

        {/* Hint */}
        <div className="hint-bar">
          <span className="hint-arrow">↕</span>
          Click any row, hold &amp; drag down to mark multiple fluids as serviced
        </div>

        {/* Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {fluids.map((fluid, idx) => {
            const done     = isGreen(idx);
            const inPrev   = previewSet.has(idx);
            const addPrev  = inPrev && dragAction.current === "add";
            const remPrev  = inPrev && dragAction.current === "remove";

            return (
              <div
                key={fluid.id}
                ref={el => cardRefs.current[idx] = el}
                className={[
                  "fc-card",
                  done && !inPrev ? "serviced" : "",
                  addPrev         ? "add-preview" : "",
                  remPrev         ? "remove-preview" : "",
                ].join(" ")}
                onPointerDown={e => onPointerDown(e, idx)}
              >
                {/* Status dot */}
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: done ? "#22c55e" : "#1e2130",
                  boxShadow: done ? "0 0 8px rgba(34,197,94,0.7)" : "none",
                  transition: "background 0.2s, box-shadow 0.2s",
                }} />

                <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{fluid.icon}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: 18,
                      letterSpacing: "0.04em",
                      color: done ? "#4ade80" : "#e2e8f0",
                      transition: "color 0.2s",
                    }}>
                      {fluid.name}
                    </span>
                    {done
                      ? <span className="lbl-done">Serviced</span>
                      : <span className="lbl-pend">Pending</span>
                    }
                  </div>
                  <p style={{ fontSize: 10, color: "#2d3748", marginTop: 2, letterSpacing: "0.03em" }}>
                    {fluid.description} · {fluid.interval}
                  </p>
                </div>

                <span style={{
                  fontSize: 18, flexShrink: 0,
                  color: done ? "#4ade80" : "#1e2130",
                  transform: done ? "scale(1)" : "scale(0.5)",
                  transition: "color 0.2s, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                }}>✓</span>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        {doneCount > 0 && (
          <div style={{
            marginTop: 20, padding: "14px 18px",
            background: "#071a10", border: "1px solid #1a4a2a", borderRadius: 10,
            fontSize: 12, color: "#4ade80", display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <span>
              <strong>{doneCount} fluid{doneCount > 1 ? "s" : ""}</strong> marked recently serviced.{" "}
              {fluids.length - doneCount > 0
                ? `${fluids.length - doneCount} still pending.`
                : "All fluids accounted for!"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
