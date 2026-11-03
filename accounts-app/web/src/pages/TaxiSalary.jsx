import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { fmtDate, todayIST } from "../lib/format.js";
import { rupeesInWords } from "../lib/words.js";

const field =
  "rounded-md border border-input bg-white px-3 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary min-w-56";
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const prevMonth = () => { const t = todayIST(); return new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 2, 1)).toISOString().slice(0, 7); };
const monthName = (m) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5) - 1, 1)).toLocaleDateString("en-IN", { timeZone: "UTC", month: "long", year: "numeric" });
const stamp = (utc) => new Date(`${utc.replace(" ", "T")}Z`).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });

function Row({ label, value, muted }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

// Pooja Taxi driver salary slip for one car, one driver and one month (1st to last day, paid on the 3rd of the next month).
//   driver earning = the driver's share (30%) of each worked day's total earning;  net payable = driver earning - advances.
// "Generate slip" works the figures out on the server and saves a permanent copy; saved slips are listed below and reopen exactly as generated.
export default function TaxiSalary() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [carId, setCarId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [month, setMonth] = useState(prevMonth());
  const [preview, setPreview] = useState(null); // live figures, not saved
  const [saved, setSaved] = useState(null);     // a saved slip being shown
  const [list, setList] = useState([]);
  const [showDays, setShowDays] = useState(true); // day-wise details are printed on a second page, only if wanted
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api("taxi/vehicles"), api("taxi/drivers")])
      .then(([v, d]) => {
        const cars = v.vehicles.filter((x) => x.active);
        const people = d.drivers.filter((x) => x.active);
        setVehicles(cars);
        setDrivers(people);
        const first = cars.find((c) => c.driver_id) ?? cars[0]; // start on a car that has a driver
        setCarId(first ? String(first.id) : "");
        setDriverId(String(first?.driver_id ?? people[0]?.id ?? ""));
      })
      .catch((e) => setError(e.message));
  }, []);

  const loadList = useCallback(() => {
    if (!driverId) return;
    api(`taxi/salary-slips?driver_id=${driverId}`).then((d) => setList(d.slips)).catch((e) => setError(e.message));
  }, [driverId]);
  useEffect(loadList, [loadList]);

  // any change of car, driver or month goes back to a fresh preview
  useEffect(() => {
    if (!carId || !driverId) return;
    let live = true;
    setSaved(null);
    setPreview(null);
    setError("");
    api(`taxi/salary-slip?driver_id=${driverId}&vehicle_id=${carId}&month=${month}`)
      .then((d) => live && setPreview(d.slip))
      .catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [carId, driverId, month]);

  const pickCar = (id) => {
    setCarId(id);
    const car = vehicles.find((v) => String(v.id) === id);
    if (car?.driver_id) setDriverId(String(car.driver_id)); // the driver assigned to that car (can still be changed)
  };

  // choosing a driver picks the car he is assigned to, so the two cannot be left mismatched by accident
  const pickDriver = (id) => {
    setDriverId(id);
    const car = vehicles.find((v) => String(v.driver_id) === id);
    if (car) setCarId(String(car.id));
  };

  const del = async (x) => {
    if (!window.confirm(`Delete slip no. ${x.id} (${monthName(x.month)}, car ${x.car_code.slice(-4)}, ${inr(x.net_payable)})? This cannot be undone.`)) return;
    setError("");
    try {
      await api(`taxi/salary-slips/${x.id}`, { method: "DELETE" });
      if (saved?.id === x.id) setSaved(null);
      loadList();
    } catch (e) {
      setError(e.message);
    }
  };

  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      const d = await api("taxi/salary-slips", { method: "POST", body: { driver_id: Number(driverId), vehicle_id: Number(carId), month } });
      setSaved(d.slip);
      loadList();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const open = async (id) => {
    setError("");
    try {
      const d = await api(`taxi/salary-slips/${id}`);
      setSaved(d.slip);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e.message);
    }
  };

  const s = saved ?? preview;
  const empty = !saved && preview && preview.days_worked + preview.leave_days === 0; // nothing to put on a slip: wrong car or month
  const hisCar = vehicles.find((v) => String(v.driver_id) === driverId);

  return (
    <div className="max-w-4xl">
      <div className="print:hidden mb-6">
        <h1 className="font-display text-4xl font-bold italic mb-2">Salary</h1>
        <p className="text-muted-foreground mb-6">Driver salary slip. Choose the car, the driver and the month, then generate the slip. It is saved for future reference.</p>
        {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm font-semibold">Car number<br />
            <select value={carId} onChange={(e) => pickCar(e.target.value)} className={field} aria-label="Car number">
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.code}{v.model ? ` · ${v.model}` : ""}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">Driver name<br />
            <select value={driverId} onChange={(e) => pickDriver(e.target.value)} className={field} aria-label="Driver name">
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">Month<br />
            <input type="month" value={month} max={todayIST().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} className={`${field} min-w-44`} aria-label="Month" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <button onClick={generate} disabled={!preview || busy || !!saved || empty} className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm tracking-wider hover:opacity-90 disabled:opacity-50">{busy ? "SAVING…" : "GENERATE SLIP"}</button>
          <button onClick={() => window.print()} disabled={!saved} className="px-6 py-3 rounded-full border border-primary text-primary font-bold text-sm tracking-wider hover:bg-primary hover:text-primary-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-primary">PRINT / SAVE AS PDF</button>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={showDays} onChange={(e) => setShowDays(e.target.checked)} className="w-4 h-4" /> Print day-wise details (page 2)</label>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {saved ? <>Saved slip no. <b>{saved.id}</b>, generated on {stamp(saved.generated_at)}. This copy does not change if entries are edited later.</> : "Preview only. Click GENERATE SLIP to save it; the saved copy can then be printed."}
          {saved && <> <button onClick={() => setSaved(null)} className="font-bold text-primary hover:underline ml-2">BACK TO PREVIEW</button></>}
        </p>
      </div>

      {empty && (
        <div role="alert" className="print:hidden bg-card rounded-2xl p-6 border border-destructive/50 text-sm mb-6">
          <b>No entries for {preview.driver.name} on car {preview.car.code.slice(-4)} in {monthName(preview.month)}.</b>
          <div className="text-muted-foreground mt-1">
            {hisCar && String(hisCar.id) !== carId ? <>He drives car <button onClick={() => pickCar(String(hisCar.id))} className="font-bold text-primary hover:underline">{hisCar.code.slice(-4)}</button>. Choose that car, or another month.</> : "Choose the car this driver drove, or another month."}
          </div>
        </div>
      )}

      {!s && !error && <div className="print:hidden bg-card rounded-2xl p-8 border border-border text-center text-muted-foreground">Loading…</div>}

      {s && !empty && (
        <article className={`bg-white rounded-2xl border shadow-card print:shadow-none print:border-0 print:rounded-none p-8 md:p-10 text-sm ${saved ? "border-border" : "border-dashed border-primary/60"}`}>
          <header className="text-center border-b-2 border-primary pb-5 mb-6">
            <div className="text-2xl font-bold text-primary tracking-widest">THE POOJA GROUP</div>
            <div className="text-xl font-bold tracking-wide mt-1.5">Pooja Taxi Services</div>
            <div className="font-display text-2xl font-bold italic mt-4">Driver Salary Slip</div>
            <div className="text-muted-foreground mt-1">{monthName(s.month)}</div>
            {saved && <div className="text-xs text-muted-foreground mt-1">Slip no. {saved.id} · Generated {stamp(saved.generated_at)}</div>}
          </header>

          <div className="grid grid-cols-2 gap-x-8 mb-6">
            <div>
              <Row label="Employee ID" value={s.driver.employee_id || "—"} />
              <Row label="Driver" value={<b>{s.driver.name}</b>} />
              <Row label="Date of joining" value={s.driver.join_date ? fmtDate(s.driver.join_date) : "—"} />
              <Row label="Bank name" value={s.driver.bank_name || "—"} />
              <Row label="A/c No." value={s.driver.bank_account || "—"} />
              <Row label="Car" value={`${s.car.code}${s.car.model ? ` · ${s.car.model}` : ""}`} />
              <Row label="Mobile" value={s.driver.mobile || "—"} />
            </div>
            <div>
              <Row label="Pay period" value={`${fmtDate(s.from)} – ${fmtDate(s.to)}`} />
              <Row label="Days worked" value={s.days_worked} />
              <Row label="Leave days" value={s.leave_days} />
              <Row label="Pay day" value={fmtDate(s.pay_day)} />
            </div>
          </div>

          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-2">PAYMENT</h2>
          <div className="mb-2">
            <Row label="Total earning in the month" value={inr(s.earning)} />
            <Row label={`Driver earning (${s.driver.share_pct}% of total earning)`} value={inr(s.driver_earning)} />
            <Row label="Less: advances paid" value={`− ${inr(s.advances_total)}`} muted />
            <div className="flex justify-between gap-4 py-3 text-base font-bold border-b-2 border-foreground"><span>NET PAYABLE</span><span>{inr(s.net_payable)}</span></div>
          </div>
          <p className="text-muted-foreground mb-8">{s.net_payable > 0 ? rupeesInWords(s.net_payable) : s.net_payable < 0 ? "Amount recoverable from the driver" : "Nil"}</p>

          {s.advances.length > 0 && (
            <>
              <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-2">ADVANCES</h2>
              <table className="w-full mb-8"><tbody>
                {s.advances.map((l, i) => <tr key={i} className="border-b border-border"><td className="py-1.5 pr-3 whitespace-nowrap">{fmtDate(l.date, false)}</td><td className="pr-3 text-muted-foreground">{l.note}</td><td className="text-right">{inr(l.amount)}</td></tr>)}
              </tbody></table>
            </>
          )}

          <div className="grid grid-cols-2 gap-16 mt-16 text-center text-xs">
            <div className="border-t border-foreground pt-2">Owner signature</div>
            <div className="border-t border-foreground pt-2">Driver signature</div>
          </div>
          <p className="text-center text-[11px] text-muted-foreground mt-8">This is a computer-generated slip.</p>

          {showDays && (
            <section className="mt-10 print:mt-0 print:[break-before:page]">
              <div className="text-center mb-4 border-t border-border print:border-0 pt-6 print:pt-0">
                <div className="font-display text-xl font-bold italic">Day-wise details</div>
                <div className="text-muted-foreground text-xs">{s.driver.name} · {s.car.code} · {monthName(s.month)}{saved ? ` · Slip no. ${saved.id}` : ""}</div>
              </div>
              <table className="w-full text-xs">
                <thead><tr className="text-left text-muted-foreground"><th className="py-1">Date</th><th>Day</th><th>Status</th><th className="text-right">Total earning</th><th className="text-right">Driver earning</th><th className="text-right">Advance</th></tr></thead>
                <tbody>
                  {s.days.map((r) => (
                    <tr key={r.date} className={`border-b border-border ${r.status === "Leave" ? "bg-amber-100" : ""}`}>
                      <td className="py-1">{fmtDate(r.date, false)}</td><td>{r.day}</td><td>{r.status}</td>
                      <td className="text-right">{r.total_earning == null ? "" : inr(r.total_earning)}</td><td className="text-right">{r.driver_earning == null ? "" : inr(r.driver_earning)}</td><td className="text-right">{r.advance ? inr(r.advance) : ""}</td>
                    </tr>
                  ))}
                  {s.days.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No entries for this driver on this car in {monthName(s.month)}.</td></tr>}
                </tbody>
                <tfoot><tr className="font-bold"><td className="py-2" colSpan={3}>TOTAL</td><td className="text-right">{inr(s.earning)}</td><td className="text-right">{inr(s.driver_earning)}</td><td className="text-right">{inr(s.advances_total)}</td></tr></tfoot>
              </table>
            </section>
          )}
        </article>
      )}

      <section className="print:hidden mt-10">
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-3">SAVED SLIPS{drivers.find((d) => String(d.id) === driverId) ? ` · ${drivers.find((d) => String(d.id) === driverId).name.toUpperCase()}` : ""}</h2>
        <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr className="text-left text-[11px] tracking-widest text-muted-foreground"><th className="px-4 py-2.5">SLIP NO.</th><th>MONTH</th><th>CAR</th><th className="text-right">NET PAYABLE</th><th className="pl-6">GENERATED ON</th><th /></tr></thead>
            <tbody className="divide-y divide-border">
              {list.map((x) => (
                <tr key={x.id} className={saved?.id === x.id ? "bg-primary/10" : ""}>
                  <td className="px-4 py-2.5 font-semibold">{x.id}</td><td>{monthName(x.month)}</td><td>{x.car_code.slice(-4)}</td>
                  <td className="text-right">{inr(x.net_payable)}</td><td className="pl-6 text-muted-foreground">{stamp(x.generated_at)}</td>
                  <td className="px-4 text-right whitespace-nowrap"><button onClick={() => open(x.id)} className="text-xs font-bold tracking-wider text-primary hover:underline">VIEW</button><button onClick={() => del(x)} className="ml-4 text-xs font-bold tracking-wider text-destructive hover:underline">DELETE</button></td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No slips saved for this driver yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
