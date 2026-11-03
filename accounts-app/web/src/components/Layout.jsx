import { Link, useLocation, useNavigate } from "react-router-dom";
import { homeFor, useAuth } from "../auth.jsx";
import { BUSINESSES } from "../lib/businesses.js";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const home = homeFor(user);
  const links = [
    { to: home, label: "Home" },
    ...BUSINESSES.map((b) => ({ to: `/business/${b.slug}`, label: b.short })),
    { to: "/planned", label: "Planned Business" },
  ];

  return (
    <div className="min-h-screen md:flex">
      <aside className="print:hidden bg-sidebar text-sidebar-foreground md:w-60 md:min-h-screen p-5 flex flex-wrap md:flex-nowrap md:flex-col gap-4 items-center md:items-stretch justify-between md:justify-start">
        <Link to={home} className="leading-tight order-1 md:order-none block" aria-label="Go to the main page">
          <div className="text-base font-bold text-primary tracking-wider whitespace-nowrap">THE POOJA GROUP</div>
          <div className="text-xs font-semibold tracking-wider text-sidebar-foreground">MANAGEMENT</div>
        </Link>
        <nav className="flex flex-wrap md:flex-nowrap md:flex-col gap-1.5 md:gap-2 order-3 md:order-none w-full md:w-auto">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold tracking-wider ${
                pathname === l.to || (l.to !== home && pathname.startsWith(l.to)) ? "bg-primary text-primary-foreground" : "hover:bg-sidebar-accent"
              }`}
            >
              {l.label.toUpperCase()}
            </Link>
          ))}
        </nav>
        <div className="md:mt-auto text-xs order-2 md:order-none">
          <div className="opacity-70 mb-2 hidden md:block">
            {user.name} · {user.role}
          </div>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="rounded-full border border-white/30 px-4 py-1.5 font-bold tracking-wider hover:bg-white hover:text-foreground transition-colors"
          >
            LOG OUT
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-5 md:p-10 print:p-0">
        {children}
      </main>
    </div>
  );
}
