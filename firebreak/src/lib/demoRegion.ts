// Chico, CA -- the demo region used both as the client-side geolocation
// fallback (useGeolocation.ts) and as the server-rendered default for the
// dashboard's first paint (page.tsx), so a cold Render backend or a judge's
// unfamiliar wifi never has to show a loading/empty state for the demo's
// most important view -- see page.tsx for why.
export const DEMO_REGION = { lat: 39.7285, lon: -121.8375 };
