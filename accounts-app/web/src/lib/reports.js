import { api } from "../api.js";
import { monthTally } from "./attendance.js";
import { BUSINESSES } from "./businesses.js";
import { daysBetween, fmtAadhaar, fmtAddress, fmtDate, money, to12, todayIST } from "./format.js";

// A report = filters + columns + a loader that returns plain row objects keyed by column key.
// Column types: text | date (ISO string) | money | number. `sum: true` adds the column to the totals row.
// `on: true` = ticked by default. Everything is built in the browser from the normal API calls.

const monthStart = () => `${todayIST().slice(0, 7)}-01`;
const thisMonth = () => todayIST().slice(0, 7);
const bizOptions = [["", "All businesses"], ...BUSINESSES.map((b) => [b.name, b.name])];
const monthName = (ym) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", month: "long", year: "numeric" });
const range = (f) => `${fmtDate(f.from)} to ${fmtDate(f.to)}`;
const pick = (label, value) => (value ? `${label}: ${value}` : "");
const join = (...parts) => parts.filter(Boolean).join(" · ");

const dateRange = [
  { key: "from", label: "From", type: "date" },
  { key: "to", label: "To", type: "date" },
];


// One row per car per day, exactly as on each car's own sheet (the Earnings tab). `on` = in the quick downloads and ticked by default.
export const TAXI_SHEET_COLUMNS = [
  { key: "date", label: "Date", type: "date", on: true },
  { key: "car", label: "Car", type: "text", on: true },
  { key: "driver_name", label: "Driver Name", type: "text", on: true },
  { key: "out_time12", label: "Out-Time", type: "text", on: true },
  { key: "in_time12", label: "In-Time", type: "text", on: true },
  { key: "start_km", label: "Start Reading", type: "number" },
  { key: "end_km", label: "End Reading", type: "number" },
  { key: "km", label: "Total Run", type: "number", sum: true, on: true },
  { key: "cng_kg", label: "CNG (kg)", type: "number", sum: true },
  { key: "cng_amount", label: "CNG ₹", type: "money", sum: true, on: true },
  { key: "petrol_ltr", label: "Petrol (L)", type: "number", sum: true },
  { key: "petrol_amount", label: "Petrol ₹", type: "money", sum: true, on: true },
  { key: "total_earning", label: "Total Earning", type: "money", sum: true, on: true },
  { key: "payout", label: "Payout", type: "money", sum: true, on: true },
  { key: "online_transfer", label: "Online", type: "money", sum: true, on: true },
  { key: "cash_to_collect", label: "Cash to Collect", type: "money", sum: true, on: true },
  { key: "cash_received", label: "Cash Received", type: "money", sum: true, on: true },
  { key: "driver_share", label: "Driver Earning", type: "money", sum: true, on: true },
  { key: "supplies", label: "Other Expenses", type: "money", sum: true, on: true },
  { key: "other_text", label: "Other Expenses (details)", type: "text" },
  { key: "run_charge", label: "Managing & Maintenance", type: "money", sum: true, on: true },
  { key: "maintenance", label: "Maintenance", type: "money", sum: true, on: true },
  { key: "emi", label: "EMI", type: "money", sum: true, on: true },
  { key: "cost", label: "Cost", type: "money", sum: true, on: true },
  { key: "gain", label: "Gain", type: "money", sum: true, on: true },
  { key: "advance_paid", label: "Advance Paid", type: "money", sum: true },
  { key: "leave", label: "Leave", type: "text" },
  { key: "shift", label: "Shift", type: "text" },
  { key: "status", label: "Status", type: "text", on: true },
  { key: "damage", label: "Damage", type: "text" },
];

export async function loadTaxiSheet(f) {
  const q = new URLSearchParams({ from: f.from, to: f.to, ...(f.car ? { car: f.car } : {}) });
  return (await api(`taxi/history?${q}`)).rows.map((r) => ({
    ...r, car: r.vehicle_code.slice(-4), out_time12: to12(r.out_time), in_time12: to12(r.in_time),
    other_text: (r.other_items ?? []).map((x) => `${x.item} ${x.amount}`).join(", "), leave: r.on_leave ? "Leave" : "",
    run_charge: r.run_charge || null, maintenance: r.maintenance || null, emi: r.emi || null,
  }));
}

export const REPORTS = [
  {
    id: "taxi-account",
    only: "taxi",
    title: "Owner account sheet (deposits)",
    blurb: "A car's owner account: payout, driver share, fuel, management, profit and the date each day was deposited.",
    filters: [...dateRange, { key: "car", label: "Car", type: "select", dynamic: "cars", options: [["", "Choose the car"]] }],
    defaults: () => ({ from: monthStart(), to: todayIST(), car: "" }),
    columns: () => [
      { key: "date", label: "Date", type: "date", on: true },
      { key: "driver_name", label: "Driver", type: "text", on: true },
      { key: "total_earning", label: "Total Earning", type: "money", sum: true, on: true },
      { key: "payout", label: "Payout", type: "money", sum: true, on: true },
      { key: "driver_share", label: "Driver Share", type: "money", sum: true, on: true },
      { key: "cng_amount", label: "CNG", type: "money", sum: true, on: true },
      { key: "petrol_amount", label: "Petrol", type: "money", sum: true, on: true },
      { key: "management", label: "Management", type: "money", sum: true, on: true },
      { key: "profit", label: "Profit", type: "money", sum: true, on: true },
      { key: "deposited_on", label: "Deposited on", type: "date", on: true },
      { key: "deposited_amount", label: "Amount deposited", type: "money", sum: true },
    ],
    describe: (f) => join("Pooja Taxi Services", f.car ? `Car ${f.car.slice(-4)}` : "", range(f), "Profit = Payout − Driver share − CNG − Petrol − Management"),
    load: async (f) => {
      const v = (await api("taxi/vehicles")).vehicles.find((x) => x.code === f.car);
      if (!v) return [];
      return (await api(`taxi/account?vehicle_id=${v.id}&from=${f.from}&to=${f.to}`)).rows.map((r) => ({ ...r, deposited_on: r.deposited_on || "" }));
    },
  },
  {
    id: "taxi-sheet",
    only: "taxi",
    title: "Taxi earnings sheet (by car)",
    blurb: "Every car's daily sheet for a period: one row per day with all the sheet columns, cost and gain.",
    filters: [...dateRange, { key: "car", label: "Car", type: "select", dynamic: "cars", options: [["", "All cars"]] }],
    defaults: () => ({ from: monthStart(), to: todayIST(), car: "" }),
    columns: () => TAXI_SHEET_COLUMNS,
    describe: (f) => join("Pooja Taxi Services", range(f), f.car ? `Car ${f.car.slice(-4)}` : "All cars"),
    load: loadTaxiSheet,
  },
  {
    id: "taxi-entries",
    only: "taxi",
    title: "Taxi daily entries",
    blurb: "Every taxi day in a date range: car, driver, km, fuel, earning, payout, driver share and gain.",
    filters: [...dateRange],
    defaults: () => ({ from: monthStart(), to: todayIST() }),
    columns: () => [
      { key: "trip_date", label: "Date", type: "date", on: true },
      { key: "driver", label: "Driver", type: "text", on: true },
      { key: "car", label: "Car", type: "text", on: true },
      { key: "shift", label: "Shift", type: "text", on: true },
      { key: "km", label: "Km", type: "number", sum: true, on: true },
      { key: "cng_amount", label: "CNG", type: "money", sum: true },
      { key: "petrol_amount", label: "Petrol", type: "money", sum: true },
      { key: "supplies", label: "Other expenses", type: "money", sum: true },
      { key: "total_earning", label: "Total earning", type: "money", sum: true, on: true },
      { key: "payout", label: "Payout", type: "money", sum: true, on: true },
      { key: "online_transfer", label: "Online transfer", type: "money", sum: true },
      { key: "cash_to_collect", label: "Cash to collect", type: "money", sum: true, on: true },
      { key: "driver_share", label: "Driver share", type: "money", sum: true, on: true },
      { key: "gain", label: "Gain (before EMI)", type: "money", sum: true, on: true },
      { key: "notes", label: "Notes", type: "text" },
    ],
    describe: (f) => join("Pooja Taxi Services", range(f)),
    load: async (f) => {
      const [t, d, v] = await Promise.all([api(`taxi/trips?from=${f.from}&to=${f.to}`), api("taxi/drivers"), api("taxi/vehicles")]);
      const dn = Object.fromEntries(d.drivers.map((x) => [x.id, x.name])), vc = Object.fromEntries(v.vehicles.map((x) => [x.id, x.code.slice(-4)]));
      return t.trips.filter((x) => !x.on_leave).map((x) => ({ ...x, driver: dn[x.driver_id] ?? "", car: vc[x.vehicle_id] ?? "" })).reverse();
    },
  },
  {
    id: "taxi-drivers",
    only: "taxi",
    title: "Taxi driver payments",
    blurb: "For each driver in a date range: days worked, earning, share, advances, damages, salary paid and what is due.",
    filters: [...dateRange],
    defaults: () => ({ from: monthStart(), to: todayIST() }),
    columns: () => [
      { key: "driver", label: "Driver", type: "text", on: true },
      { key: "days", label: "Days worked", type: "number", sum: true, on: true },
      { key: "leave", label: "Leave days", type: "number", sum: true, on: true },
      { key: "earning", label: "Total earning", type: "money", sum: true, on: true },
      { key: "share", label: "Driver share", type: "money", sum: true, on: true },
      { key: "advances", label: "Advances", type: "money", sum: true, on: true },
      { key: "damages", label: "Damages", type: "money", sum: true, on: true },
      { key: "paid", label: "Salary paid", type: "money", sum: true, on: true },
      { key: "due", label: "Due for the period", type: "money", sum: true, on: true },
    ],
    describe: (f) => join("Pooja Taxi Services", range(f)),
    load: async (f) => {
      const [t, l, d] = await Promise.all([api(`taxi/trips?from=${f.from}&to=${f.to}`), api(`taxi/ledger?from=${f.from}&to=${f.to}`), api("taxi/drivers")]);
      return d.drivers.map((dr) => {
        const mine = t.trips.filter((x) => x.driver_id === dr.id), led = l.ledger.filter((x) => x.driver_id === dr.id);
        const sum = (k) => led.filter((x) => x.kind === k).reduce((a, x) => a + x.amount, 0);
        const worked = mine.filter((x) => !x.on_leave);
        const row = { driver: dr.name, days: worked.length, leave: mine.length - worked.length, earning: worked.reduce((a, x) => a + x.total_earning, 0), share: worked.reduce((a, x) => a + x.driver_share, 0), advances: sum("Advance"), damages: sum("Damage"), paid: sum("Salary paid") };
        return { ...row, due: row.share - row.advances - row.damages - row.paid };
      }).filter((r) => r.days || r.leave || r.advances || r.damages || r.paid);
    },
  },
  {
    id: "taxi-vehicles",
    only: "taxi",
    title: "Taxi vehicle performance",
    blurb: "Per car in a date range: days run, km, earning, fuel, driver share, other expenses, EMI, managing & maintenance and gain.",
    filters: [...dateRange],
    defaults: () => ({ from: monthStart(), to: todayIST() }),
    columns: () => [
      { key: "car", label: "Car", type: "text", on: true },
      { key: "model", label: "Model", type: "text", on: true },
      { key: "days", label: "Days run", type: "number", sum: true, on: true },
      { key: "km", label: "Km", type: "number", sum: true, on: true },
      { key: "earning", label: "Total earning", type: "money", sum: true, on: true },
      { key: "per_km", label: "₹ per km", type: "money", on: true },
      { key: "fuel", label: "Fuel", type: "money", sum: true, on: true },
      { key: "share", label: "Driver share", type: "money", sum: true, on: true },
      { key: "supplies", label: "Other expenses", type: "money", sum: true, on: true },
      { key: "emi", label: "EMI", type: "money", sum: true, on: true },
      { key: "charge", label: "Managing & maintenance", type: "money", sum: true, on: true },
      { key: "maintenance", label: "Maintenance", type: "money", sum: true, on: true },
      { key: "gain", label: "Gain", type: "money", sum: true, on: true },
    ],
    describe: (f) => join("Pooja Taxi Services", range(f), "EMI = per-day EMI × days in the period; managing & maintenance = per-day charge × days the car ran; maintenance = per-day charge × days in the period"),
    load: async (f) => {
      const [t, v] = await Promise.all([api(`taxi/trips?from=${f.from}&to=${f.to}`), api("taxi/vehicles")]);
      const days = Math.min(daysBetween(f.from, f.to), daysBetween(f.from, todayIST()) ) + 1;
      return v.vehicles.map((x) => {
        const mine = t.trips.filter((r) => r.vehicle_id === x.id && !r.on_leave);
        const km = mine.reduce((a, r) => a + r.km, 0), earning = mine.reduce((a, r) => a + r.total_earning, 0), fuel = mine.reduce((a, r) => a + r.fuel, 0);
        const share = mine.reduce((a, r) => a + r.driver_share, 0), supplies = mine.reduce((a, r) => a + r.supplies, 0), emi = x.emi_per_day * Math.max(days, 0);
        const ranDays = new Set(mine.map((r) => r.trip_date)).size, charge = (x.run_day_charge || 0) * ranDays;
        const maintenance = (x.maintenance_per_day || 0) * Math.max(days, 0);
        return { car: x.code, model: x.model, days: mine.length, km, earning, per_km: km ? earning / km : 0, fuel, share, supplies, emi, charge, maintenance, gain: earning - fuel - share - supplies - emi - charge - maintenance };
      }).filter((r) => r.days || r.emi);
    },
  },
  {
    id: "taxi-ledger",
    only: "taxi",
    title: "Taxi advances, damages & salary paid",
    blurb: "Every advance, damage deduction and salary payment to taxi drivers in a date range.",
    filters: [...dateRange, { key: "kind", label: "Type", type: "select", options: [["", "All types"], ["Advance", "Advance"], ["Damage", "Damage"], ["Salary paid", "Salary paid"]] }],
    defaults: () => ({ from: monthStart(), to: todayIST(), kind: "" }),
    columns: () => [
      { key: "entry_date", label: "Date", type: "date", on: true },
      { key: "driver", label: "Driver", type: "text", on: true },
      { key: "kind", label: "Type", type: "text", on: true },
      { key: "amount", label: "Amount", type: "money", sum: true, on: true },
      { key: "car", label: "Vehicle", type: "text", on: true },
      { key: "note", label: "Note", type: "text", on: true },
    ],
    describe: (f) => join("Pooja Taxi Services", range(f), pick("Type", f.kind)),
    load: async (f) => {
      const [l, d, v] = await Promise.all([api(`taxi/ledger?from=${f.from}&to=${f.to}`), api("taxi/drivers"), api("taxi/vehicles")]);
      const dn = Object.fromEntries(d.drivers.map((x) => [x.id, x.name])), vc = Object.fromEntries(v.vehicles.map((x) => [x.id, x.code.slice(-4)]));
      return l.ledger.filter((x) => !f.kind || x.kind === f.kind).map((x) => ({ ...x, driver: dn[x.driver_id] ?? "", car: vc[x.vehicle_id] ?? "" })).reverse();
    },
  },
  {
    id: "entries",
    only: "carwash",
    title: "Car wash entries",
    blurb: "Every vehicle washed in a date range, with customer details.",
    filters: [...dateRange, { key: "type", label: "Vehicle type", type: "select", options: [["", "All types"], ["Car", "Car"], ["Bike", "Bike"], ["Auto", "Auto"]] }],
    defaults: () => ({ from: monthStart(), to: todayIST(), type: "" }),
    columns: () => [
      { key: "entry_date", label: "Date", type: "date", on: true },
      { key: "name", label: "Name", type: "text", on: true },
      { key: "mobile", label: "Mobile", type: "text", on: true },
      { key: "address", label: "Address", type: "text" },
      { key: "model", label: "Model", type: "text", on: true },
      { key: "vehicle_number", label: "Vehicle no.", type: "text", on: true },
      { key: "vehicle_type", label: "Type", type: "text", on: true },
      { key: "service", label: "Service", type: "text", on: true },
      { key: "due_on", label: "Next wash due", type: "date" },
      { key: "paid", label: "Paid", type: "money", sum: true, on: true },
    ],
    describe: (f) => join("AutoShine Premium Car Wash", range(f), pick("Type", f.type)),
    load: async (f) => {
      const d = await api(`carwash/entries?from=${f.from}&to=${f.to}`);
      return d.entries.filter((e) => !f.type || e.vehicle_type === f.type).reverse();
    },
  },
  {
    id: "earnings",
    only: "carwash",
    title: "Car wash earnings summary",
    blurb: "Vehicles and money collected, grouped by day or by month.",
    filters: [...dateRange, { key: "by", label: "Group by", type: "select", options: [["day", "Day"], ["month", "Month"]] }],
    defaults: () => ({ from: monthStart(), to: todayIST(), by: "day" }),
    columns: (f) => [
      { key: "period", label: f.by === "month" ? "Month" : "Date", type: f.by === "month" ? "text" : "date", on: true },
      { key: "vehicles", label: "Vehicles", type: "number", sum: true, on: true },
      { key: "cars", label: "Cars", type: "number", sum: true, on: true },
      { key: "bikes", label: "Bikes", type: "number", sum: true, on: true },
      { key: "autos", label: "Autos", type: "number", sum: true, on: true },
      { key: "paid", label: "Paid", type: "money", sum: true, on: true },
    ],
    describe: (f) => join("AutoShine Premium Car Wash", range(f), `By ${f.by}`),
    load: async (f) => {
      const d = await api(`carwash/entries?from=${f.from}&to=${f.to}`);
      const groups = {};
      d.entries.forEach((e) => {
        const key = f.by === "month" ? e.entry_date.slice(0, 7) : e.entry_date;
        const g = (groups[key] ??= { period: f.by === "month" ? monthName(key) : key, sort: key, vehicles: 0, cars: 0, bikes: 0, autos: 0, paid: 0 });
        g.vehicles++;
        g[{ Car: "cars", Bike: "bikes", Auto: "autos" }[e.vehicle_type]]++;
        g.paid += e.paid;
      });
      return Object.values(groups).sort((a, b) => a.sort.localeCompare(b.sort));
    },
  },
  {
    id: "expenses",
    title: "Expenses",
    blurb: "Supplies, rent and salary expenses for one or all businesses.",
    filters: [
      ...dateRange,
      { key: "business", label: "Business", type: "select", options: bizOptions },
      { key: "category", label: "Category", type: "select", options: [["", "All categories"], ["Supplies", "Supplies"], ["Rent", "Rent"], ["Salary", "Salary"]] },
    ],
    defaults: () => ({ from: monthStart(), to: todayIST(), business: "", category: "" }),
    columns: () => [
      { key: "expense_date", label: "Date", type: "date", on: true },
      { key: "business", label: "Business", type: "text", on: true },
      { key: "category", label: "Category", type: "text", on: true },
      { key: "item", label: "Item", type: "text", on: true },
      { key: "qty", label: "Qty", type: "number", on: true },
      { key: "price", label: "Price (per unit)", type: "money", on: true },
      { key: "total", label: "Total", type: "money", sum: true, on: true },
    ],
    describe: (f) => join(f.business || "All businesses", range(f), pick("Category", f.category)),
    load: async (f) => {
      const names = f.business ? [f.business] : BUSINESSES.map((b) => b.name);
      const lists = await Promise.all(names.map((n) => api(`expenses?business=${encodeURIComponent(n)}&from=${f.from}&to=${f.to}`)));
      return lists
        .flatMap((l) => l.expenses)
        .filter((e) => !f.category || e.category === f.category)
        .map((e) => ({ ...e, total: e.qty * e.price }))
        .sort((a, b) => a.expense_date.localeCompare(b.expense_date) || a.business.localeCompare(b.business));
    },
  },
  {
    id: "attendance",
    title: "Attendance (monthly)",
    blurb: "Days present, half days, leave and absent per employee for a month.",
    filters: [
      { key: "month", label: "Month", type: "month" },
      { key: "business", label: "Business", type: "select", options: bizOptions },
      { key: "daily", label: "Include day-by-day (P / H / A / L)", type: "check" },
    ],
    defaults: () => ({ month: thisMonth(), business: "", daily: false }),
    columns: (f) => [
      { key: "name", label: "Employee", type: "text", on: true },
      { key: "designation", label: "Designation", type: "text" },
      { key: "business", label: "Business", type: "text", on: true },
      { key: "present", label: "Present", type: "number", sum: true, on: true },
      { key: "half", label: "Half day", type: "number", sum: true, on: true },
      { key: "leave", label: "Leave", type: "number", sum: true, on: true },
      { key: "absent", label: "Absent", type: "number", sum: true, on: true },
      { key: "notMarked", label: "Not marked", type: "number", sum: true, on: true },
      { key: "paidDays", label: "Paid days", type: "number", sum: true, on: true },
      ...(f.daily ? Array.from({ length: new Date(Date.UTC(+f.month.slice(0, 4), +f.month.slice(5), 0)).getUTCDate() }, (_, i) => ({ key: `d${i + 1}`, label: String(i + 1), type: "text", on: true, narrow: true })) : []),
    ],
    describe: (f) => join(monthName(f.month), f.business || "All businesses"),
    load: async (f) => {
      const d = await api(`attendance/month?month=${f.month}`);
      return d.employees.filter((e) => !f.business || e.business === f.business).map((e) => {
        const t = monthTally(e);
        const row = { name: e.name, designation: e.designation, business: e.business, present: t.Present, half: t["Half day"], leave: t.Leave, absent: t.Absent, notMarked: t.notMarked, paidDays: t.paidDays };
        for (let day = 1; day <= d.days; day++) {
          const inWindow = day >= e.from_day && day <= e.to_day;
          row[`d${day}`] = inWindow ? { Present: "P", "Half day": "H", Absent: "A", Leave: "L" }[e.marks[day]] ?? "" : "–";
        }
        return row;
      });
    },
  },
  {
    id: "salary",
    title: "Salary sheet",
    blurb: "Earned salary, bonus and net pay per employee for a month.",
    filters: [
      { key: "month", label: "Month", type: "month" },
      { key: "business", label: "Business", type: "select", options: bizOptions },
    ],
    defaults: () => ({ month: thisMonth(), business: "" }),
    columns: () => [
      { key: "name", label: "Employee", type: "text", on: true },
      { key: "designation", label: "Designation", type: "text" },
      { key: "business", label: "Business", type: "text", on: true },
      { key: "monthly_salary", label: "Monthly salary", type: "money", sum: true, on: true },
      { key: "present", label: "Present", type: "number" },
      { key: "half_days", label: "Half day", type: "number" },
      { key: "leave", label: "Leave", type: "number" },
      { key: "absent", label: "Absent", type: "number" },
      { key: "unmarked", label: "Not marked", type: "number" },
      { key: "payable_days", label: "Paid days", type: "number", on: true },
      { key: "earned", label: "Earned", type: "money", sum: true, on: true },
      { key: "bonus", label: "Bonus", type: "money", sum: true, on: true },
      { key: "net", label: "Net pay", type: "money", sum: true, on: true },
      { key: "status", label: "Status", type: "text", on: true },
      { key: "paid_on", label: "Paid on", type: "date" },
    ],
    describe: (f) => join(monthName(f.month), f.business || "All businesses"),
    load: async (f) => (await api(`salary/sheet?month=${f.month}`)).rows.filter((r) => !f.business || r.business === f.business),
  },
  {
    id: "employees",
    title: "Employee list",
    blurb: "Employee details, with the columns you choose.",
    filters: [
      { key: "business", label: "Business", type: "select", options: bizOptions },
      { key: "status", label: "Status", type: "select", options: [["Active", "Active"], ["Left", "Left"], ["", "All"]] },
    ],
    defaults: () => ({ business: "", status: "Active" }),
    columns: () => [
      { key: "full_name", label: "Name", type: "text", on: true },
      { key: "designation", label: "Designation", type: "text", on: true },
      { key: "business", label: "Business", type: "text", on: true },
      { key: "phone", label: "Mobile", type: "text", on: true },
      { key: "alt_phone", label: "Alternate mobile", type: "text" },
      { key: "father_name", label: "Father's name", type: "text" },
      { key: "dob", label: "Date of birth", type: "date" },
      { key: "gender", label: "Gender", type: "text" },
      { key: "blood_group", label: "Blood group", type: "text" },
      { key: "address", label: "Current address", type: "text" },
      { key: "perm_address_text", label: "Permanent address", type: "text" },
      { key: "join_date", label: "Joined", type: "date", on: true },
      { key: "leave_date", label: "Last working day", type: "date" },
      { key: "status", label: "Status", type: "text", on: true },
      { key: "monthly_salary", label: "Monthly salary", type: "money", sum: true, on: true },
      { key: "bank_name", label: "Bank", type: "text" },
      { key: "bank_account", label: "Account number", type: "text" },
      { key: "ifsc", label: "IFSC", type: "text" },
      { key: "aadhaar", label: "Aadhaar", type: "text" },
      { key: "emergency", label: "Emergency contact", type: "text" },
    ],
    describe: (f) => join(f.business || "All businesses", f.status ? `${f.status} employees` : "All employees"),
    load: async (f) =>
      (await api("employees")).employees
        .filter((e) => (!f.business || e.business === f.business) && (!f.status || e.status === f.status))
        .map((e) => ({
          ...e,
          aadhaar: fmtAadhaar(e.aadhaar_no),
          address: fmtAddress(e.address, e.city, e.state, e.pincode),
          perm_address_text: fmtAddress(e.perm_address, e.perm_city, e.perm_state, e.perm_pincode),
          emergency: [e.emergency_name, e.emergency_relation && `(${e.emergency_relation})`, e.emergency_phone].filter(Boolean).join(" "),
        })),
  },
  {
    id: "followups",
    only: "carwash",
    title: "Customers to call",
    blurb: "Car wash customers due for a reminder call, with the last comment.",
    filters: [],
    defaults: () => ({}),
    columns: () => [
      { key: "name", label: "Name", type: "text", on: true },
      { key: "mobile", label: "Mobile", type: "text", on: true },
      { key: "vehicle_number", label: "Vehicle no.", type: "text", on: true },
      { key: "vehicle_type", label: "Type", type: "text" },
      { key: "model", label: "Model", type: "text", on: true },
      { key: "entry_date", label: "Last wash", type: "date", on: true },
      { key: "days_since", label: "Days since", type: "number", on: true },
      { key: "due_on", label: "Next wash due", type: "date", on: true },
      { key: "last_comment", label: "Last comment", type: "text", on: true },
      { key: "last_call", label: "Last called", type: "text" },
    ],
    describe: () => join("AutoShine Premium Car Wash", `As on ${fmtDate(todayIST())}`),
    load: async () => {
      const d = await api("carwash/call-list");
      return d.customers.map((c) => ({
        ...c,
        days_since: daysBetween(c.entry_date, todayIST()),
        last_comment: c.calls[0]?.comment ?? "",
        last_call: c.calls[0] ? `${c.calls[0].at.slice(0, 10)} · ${c.calls[0].by}` : "",
      }));
    },
  },
];

export const reportById = (id) => REPORTS.find((r) => r.id === id);

// How a value is shown on screen / in the PDF. (Excel gets real numbers and dates instead.)
export function display(col, value) {
  if (value === null || value === undefined || value === "") return "";
  if (col.type === "date") return fmtDate(value);
  if (col.type === "money") return money(value);
  if (col.type === "number") return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
  return String(value);
}

// Totals row values for the selected columns: sums where `sum: true`, plus the row count
export function totalsFor(columns, rows) {
  const t = {};
  columns.forEach((c) => {
    if (c.sum) t[c.key] = rows.reduce((a, r) => a + (Number(r[c.key]) || 0), 0);
  });
  return t;
}
