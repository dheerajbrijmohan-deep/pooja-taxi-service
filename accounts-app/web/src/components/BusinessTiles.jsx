import { Link } from "react-router-dom";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" };

const TaxiIcon = () => (
  <svg viewBox="0 0 48 48" className="w-12 h-12" {...stroke}>
    <path d="M19 12h10l2 5H17z" />
    <path d="M9 30l3-9a3 3 0 0 1 3-2h18a3 3 0 0 1 3 2l3 9v6H9z" />
    <path d="M9 30h30" />
    <circle cx="16" cy="36" r="3.2" fill="currentColor" />
    <circle cx="32" cy="36" r="3.2" fill="currentColor" />
  </svg>
);

const CarWashIcon = () => (
  <svg viewBox="0 0 48 48" className="w-12 h-12" {...stroke}>
    <path d="M7 32l3-8a3 3 0 0 1 3-2h16a3 3 0 0 1 3 2l3 8v5H7z" />
    <path d="M7 32h26" />
    <circle cx="14" cy="37" r="2.8" fill="currentColor" />
    <circle cx="28" cy="37" r="2.8" fill="currentColor" />
    <path d="M38 8l1.6 3.4L43 13l-3.4 1.6L38 18l-1.6-3.4L33 13l3.4-1.6z" fill="currentColor" />
    <path d="M12 12c0 2-2 3-2 5a2 2 0 0 0 4 0c0-2-2-3-2-5zM22 8c0 2-2 3-2 5a2 2 0 0 0 4 0c0-2-2-3-2-5z" />
  </svg>
);

// Set `image` (e.g. "/biz/taxi.png", placed in web/public/biz/) to show a real logo/photo instead of the drawn avatar.
const BUSINESSES = [
  { name: "Pooja Taxi Services", to: "/business/taxi", linkText: "Open dashboard →", Icon: TaxiIcon, tone: "bg-primary/15 text-primary" },
  { name: "AutoShine Premium Car Wash", to: "/business/carwash", linkText: "Open dashboard →", Icon: CarWashIcon, tone: "bg-emerald-100 text-emerald-700" },
];

export default function BusinessTiles() {
  return (
    <section>
      <h2 className="text-xs font-semibold tracking-widest text-muted-foreground mb-3">OUR BUSINESSES</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BUSINESSES.map(({ name, Icon, tone, image, to, linkText }) => {
          const Tag = to ? Link : "div";
          return (
          <Tag
            key={name}
            {...(to ? { to } : {})}
            className={`bg-card rounded-2xl shadow-card border border-border p-6 flex flex-col gap-5 min-h-44 border-t-4 border-t-primary ${to ? "hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer" : ""}`}
          >
            {image ? (
              <img src={image} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${tone}`}>
                <Icon />
              </div>
            )}
            <div>
              <h3 className="font-display text-xl font-bold italic leading-snug">{name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{to ? linkText : "No records yet"}</p>
            </div>
          </Tag>
          );
        })}
      </div>
    </section>
  );
}
