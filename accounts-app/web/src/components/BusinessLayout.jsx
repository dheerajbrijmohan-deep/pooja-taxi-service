import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { BUSINESS_TABS, businessBySlug } from "../lib/businesses.js";

// The business the current page belongs to, taken from the URL (/business/<slug>/...).
export function useBusiness() {
  const { slug } = useParams();
  const b = businessBySlug(slug);
  return { ...b, base: `/business/${slug}` };
}

// Shell of one business's workspace: its name and its own tabs. Every page inside only shows that business's data.
export default function BusinessLayout() {
  const { user } = useAuth();
  const { slug } = useParams();
  const b = businessBySlug(slug);
  const [accounts, setAccounts] = useState([]); // owner account sheets (e.g. "Jiju's Account"), one tab each
  useEffect(() => { if (slug === "taxi" && user.role === "admin") api("taxi/accounts").then((d) => setAccounts(d.accounts)).catch(() => {}); else setAccounts([]); }, [slug, user.role]);
  if (!b) return <Navigate to="/" replace />;
  const base = BUSINESS_TABS.filter((t) => (!t.admin || user.role === "admin") && (!t.only || t.only === slug) && t.not !== slug);
  const at = base.findIndex((t) => t.path === "earnings") + 1; // account tabs sit right after Earnings
  const tabs = [...base.slice(0, at), ...accounts.map((a) => ({ path: `account/${a.vehicle_id}`, label: a.account_name })), ...base.slice(at)];
  return (
    <div>
      <div className="print:hidden mb-8">
        <div className="text-xs font-bold tracking-widest text-primary mb-2">{b.name.toUpperCase()}</div>
        <nav className="flex flex-wrap gap-2" aria-label={`${b.name} sections`}>
          {tabs.map((t) => (
            <NavLink key={t.path} to={t.path === "" ? `/business/${slug}` : `/business/${slug}/${t.path}`} end={!!t.end}
              className={({ isActive }) => `px-4 py-2 rounded-full text-xs sm:text-sm font-bold tracking-wider border transition-colors ${isActive ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
              {t.label.toUpperCase()}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}

// Owner-only (or any other role list) gate inside a business workspace; sends others back to the business dashboard.
export function Gate({ roles = ["admin"], only, children }) {
  const { user } = useAuth();
  const { slug } = useParams();
  if (!roles.includes(user.role) || (only && only !== slug)) return <Navigate to={`/business/${slug}`} replace />;
  return children;
}
