// Demo card checkout marks orders as "paid" WITHOUT charging anything.
// It is off unless DEMO_CARD_PAYMENTS=true, so a live site can never fake payments by accident.
export const demoCardEnabled = () => process.env.DEMO_CARD_PAYMENTS === "true";
