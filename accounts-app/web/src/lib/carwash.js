export const WASH_SERVICES = ["Full Wash", "Top Wash", "Water Spray", "Interior Vacuum", "Interior Deep Clean", "Wax Polish", "Glass Clean"];
export const PAYMENT_MODES = ["Online", "Cash", "Credit", "Complimentary"];
// Credit is not yet received and Complimentary is free, so only Online and Cash count as earning.
export const earned = (e) => (e.payment_mode === "Credit" ? 0 : e.paid);
