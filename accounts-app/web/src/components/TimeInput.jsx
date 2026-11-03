import { useEffect, useRef, useState } from "react";

// A time box with the fixed pattern  hh:mm AM  (e.g. 09:30 PM).
//  - type the hour: after 2 digits the cursor jumps past the colon to the minutes (a first digit of 3-9 is read as 03-09 and jumps at once)
//  - type the minutes, press Tab: the cursor moves to AM/PM; type A or P (or use the arrow keys); press Tab again to go to the next field
//  - Shift+Tab goes back the same way. The hour may also be typed in 24-hour style (21 becomes 09 PM).
// The value handed to the form is "HH:MM" (24-hour), or "" until the time is complete.
const SEG = [[0, 2], [3, 5], [6, 8]];
const pad = (n) => String(n).padStart(2, "0");

function fromValue(v) {
  if (!v) return { h: "", m: "", ap: "" };
  const [H, M] = v.split(":").map(Number);
  return { h: pad(((H + 11) % 12) + 1), m: pad(M), ap: H < 12 ? "AM" : "PM" };
}
const toValue = (s) => (s.h.length === 2 && s.m.length === 2 && s.ap ? `${pad((Number(s.h) % 12) + (s.ap === "PM" ? 12 : 0))}:${s.m}` : "");
const shown = (s) => `${s.h.length === 2 ? s.h : s.h ? s.h + "_" : "hh"}:${s.m.length === 2 ? s.m : s.m ? s.m + "_" : "mm"} ${s.ap || "--"}`;

// feed one typed digit into the state; returns the new state and the segment the cursor should be in
function digit(s, seg, d) {
  s = { ...s };
  if (seg === 0) {
    let h = s.h.length === 2 ? "" : s.h; // typing on a finished hour starts it again
    if (h === "") {
      if (d <= 2) { s.h = String(d); return [s, 0]; }
      s.h = "0" + d; return [s, 1];
    }
    const n = Number(h + d);
    if (h === "0") { if (n === 0) { s.h = "12"; s.ap = "AM"; } else s.h = "0" + d; return [s, 1]; }
    if (h === "1") {
      if (n <= 12) s.h = String(n);
      else { s.h = pad(n - 12); s.ap = "PM"; } // 13-19 typed in 24-hour style
      return [s, 1];
    }
    if (n <= 23) { s.h = pad(n - 12); s.ap = "PM"; return [s, 1]; } // 20-23
    s.h = "02"; // "2" then 4-9: the hour is 02 and this digit starts the minutes
    return digit(s, 1, d);
  }
  if (seg === 1) {
    let m = s.m.length === 2 ? "" : s.m;
    if (m === "") { if (d <= 5) s.m = String(d); else s.m = "0" + d; return [s, 1]; }
    s.m = m + d; return [s, 1];
  }
  return [s, 2];
}

export default function TimeInput({ id, value, onChange, onPartial, className, ...rest }) {
  const ref = useRef(null);
  const [s, setS] = useState(() => fromValue(value));
  const [seg, setSeg] = useState(0);
  const [touched, setTouched] = useState(false);
  const mouse = useRef(false); // a click chooses the part itself; the focus rule below is only for the keyboard
  const live = useRef({});
  live.current = { s, seg, onChange };

  // an outside change (e.g. the form opening on another entry) replaces what is shown
  useEffect(() => { if (toValue(live.current.s) !== (value || "")) { setS(fromValue(value)); } }, [value]);

  const commit = (ns, nseg) => {
    setS(ns); setSeg(nseg);
    const v = toValue(ns);
    if (v !== (value || "")) live.current.onChange(v);
  };

  // keep the highlighted part of the box in step with the segment being edited
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement === el) el.setSelectionRange(...SEG[seg]);
  }, [s, seg]);

  // typing (also from phone keyboards) arrives as "beforeinput"; it is handled here and never reaches the box itself
  useEffect(() => {
    const el = ref.current;
    const onBefore = (e) => {
      const { s: st, seg: sg } = live.current;
      const t = e.inputType;
      if (t === "insertFromPaste" || t === "insertFromDrop") {
        e.preventDefault();
        const m = (e.data || e.dataTransfer?.getData("text") || "").trim().toLowerCase().match(/^(\d{1,2}):?(\d{2})\s*([ap])?m?$/);
        if (m) { let h = Number(m[1]); const mi = Number(m[2]); let ap = m[3] ? (m[3] === "p" ? "PM" : "AM") : (h >= 12 ? "PM" : "AM"); if (h > 12) h -= 12; if (h === 0) h = 12; if (mi < 60 && h <= 12) commit({ h: pad(h), m: pad(mi), ap }, 2); }
        return;
      }
      if (t.startsWith("delete")) {
        e.preventDefault();
        if (el.selectionStart === 0 && el.selectionEnd === 8) { commit({ h: "", m: "", ap: "" }, 0); return; } // Select all + Backspace clears the whole time
        const ns = { ...st };
        if (sg === 0) ns.h = ""; else if (sg === 1) ns.m = ""; else ns.ap = "";
        if (((sg === 0 && !st.h) || (sg === 1 && !st.m) || (sg === 2 && !st.ap)) && sg > 0) { commit(st, sg - 1); return; } // already empty: step back
        commit(ns, sg); return;
      }
      if (!t.startsWith("insert")) return;
      e.preventDefault();
      for (const ch of (e.data || "").toLowerCase()) {
        const cur = live.current;
        if (/\d/.test(ch)) { const [ns, nseg] = digit(cur.s, cur.seg, Number(ch)); commit(ns, nseg); }
        else if ((ch === "a" || ch === "p") && (cur.seg === 2 || (cur.seg === 1 && cur.s.m.length === 2))) commit({ ...cur.s, ap: ch === "a" ? "AM" : "PM" }, 2);
        else if (ch === ":" && cur.seg === 0 && cur.s.h.length === 1) commit({ ...cur.s, h: "0" + cur.s.h }, 1); // "9:" -> 09
        else if (ch === ":" && cur.seg === 0 && cur.s.h.length === 2) commit(cur.s, 1);
      }
    };
    el.addEventListener("beforeinput", onBefore);
    return () => el.removeEventListener("beforeinput", onBefore);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onKeyDown = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Tab") {
      if (!e.shiftKey && seg < 2) { e.preventDefault(); setSeg(seg + 1); }
      else if (e.shiftKey && seg > 0) { e.preventDefault(); setSeg(seg - 1); }
      return; // first/last segment: Tab leaves the box for the next/previous field
    }
    if (e.key === "ArrowRight") { e.preventDefault(); setSeg(Math.min(2, seg + 1)); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); setSeg(Math.max(0, seg - 1)); }
    else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const up = e.key === "ArrowUp", ns = { ...s };
      if (seg === 0) { const h = Number(s.h) || (up ? 12 : 1); ns.h = pad(up ? (h % 12) + 1 : h === 1 ? 12 : h - 1); }
      else if (seg === 1) { const m = Number(s.m) || 0; ns.m = pad(up ? (m + 1) % 60 : (m + 59) % 60); }
      else ns.ap = s.ap === "AM" ? "PM" : "AM";
      commit(ns, seg);
    }
  };
  const onFocus = (e) => {
    if (mouse.current) return;
    const from = e.relatedTarget;
    const back = from && from !== ref.current && (from.compareDocumentPosition(ref.current) & Node.DOCUMENT_POSITION_PRECEDING); // arrived with Shift+Tab
    const sg = back ? 2 : 0;
    setSeg(sg);
    const mark = () => { if (document.activeElement === ref.current) ref.current.setSelectionRange(...SEG[sg]); };
    requestAnimationFrame(mark); setTimeout(mark, 0); setTimeout(mark, 40); // the browser selects the whole box when Tab arrives; this puts the highlight on one part
  };
  const onMouseUp = () => {
    mouse.current = false;
    const p = ref.current.selectionStart;
    const sg = p < 3 ? 0 : p < 6 ? 1 : 2;
    setSeg(sg); ref.current.setSelectionRange(...SEG[sg]);
  };
  const unfinished = !!((s.h || s.m || s.ap) && !toValue(s));
  useEffect(() => { onPartial?.(unfinished); }, [unfinished]); // eslint-disable-line react-hooks/exhaustive-deps
  const partial = touched && unfinished;

  return (
    <>
      <input ref={ref} id={id} type="text" inputMode="numeric" autoComplete="off" className={className} value={shown(s)} readOnly={false} onChange={() => {}}
        onKeyDown={onKeyDown} onMouseDown={() => { mouse.current = true; }} onFocus={onFocus} onMouseUp={onMouseUp} onBlur={() => setTouched(true)} aria-invalid={!!partial} aria-label={rest["aria-label"]} />
      {partial && <p className="text-xs text-destructive mt-1">Finish the time, like 09:30 PM</p>}
    </>
  );
}
