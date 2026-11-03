// One entry per running business. `slug` is used in URLs (/business/<slug>/...); `name` is the exact value stored against
// employees, expenses, investments and loans. Each business is managed on its own, under its own workspace.
export const BUSINESSES = [
  { slug: "taxi", name: "Pooja Taxi Services", short: "Pooja Taxi" },
  { slug: "carwash", name: "AutoShine Premium Car Wash", short: "AutoShine Car Wash" },
];
export const businessBySlug = (slug) => BUSINESSES.find((b) => b.slug === slug);
export const slugOf = (name) => BUSINESSES.find((b) => b.name === name)?.slug;

// The tabs of a business workspace (its dashboard and accounts). Employees and Attendance stay shared, in the main menu.
// The tabs of a business workspace. `admin: true` = owner only; `only` = that business only.
export const BUSINESS_TABS = [
  { path: "", label: "Dashboard", end: true },
  { path: "vehicles", label: "Vehicles", only: "taxi" },
  { path: "earnings", label: "Earnings", only: "taxi" },
  { path: "drivers", label: "Drivers", only: "taxi", admin: true },
  { path: "employees", label: "Employees", only: "carwash", admin: true },
  { path: "salary", label: "Salary", admin: true },
  { path: "expenses", label: "Expenses" },
  { path: "net-profit", label: "Net Profit", only: "taxi", admin: true },
  { path: "investments", label: "Investments", admin: true, not: "taxi" }, // `not` = hidden for that business
  { path: "reports", label: "Reports", admin: true },
];
