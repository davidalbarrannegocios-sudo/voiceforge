import autocannon from "autocannon";
const BASE = "http://localhost:3000";
const TARGETS = [
  { name: "Home /", path: "/" },
  { name: "Pricing /pricing", path: "/pricing" },
  { name: "Voices /voices", path: "/voices" },
  { name: "API public-voices", path: "/api/public-voices" },
  { name: "API build-id", path: "/api/build-id" },
];
const CONNECTIONS = 50;
const DURATION = 15;
const fmt = (n) => new Intl.NumberFormat("es-ES").format(Math.round(n));
async function runOne(t) {
  console.log("\n" + "=".repeat(60) + "\n  " + t.name + "\n  " + CONNECTIONS + " conexiones · " + DURATION + "s\n" + "=".repeat(60));
  const r = await autocannon({ url: BASE + t.path, connections: CONNECTIONS, duration: DURATION });
  console.log("  Peticiones/seg:  " + fmt(r.requests.average) + " req/s");
  console.log("  Latencia media:  " + r.latency.average.toFixed(1) + " ms");
  console.log("  Latencia p99:    " + r.latency.p99.toFixed(1) + " ms");
  console.log("  Totales:         " + fmt(r.requests.total));
  console.log("  No-2xx:          " + fmt(r.non2xx) + (r.non2xx > 0 ? " warn" : " ok"));
  console.log("  Errores:         " + fmt(r.errors) + (r.errors > 0 ? " warn" : " ok"));
  console.log("  Timeouts:        " + fmt(r.timeouts) + (r.timeouts > 0 ? " warn" : " ok"));
  let v = "BIEN"; if (r.errors > 0 || r.timeouts > 0) v = "SE SATURA"; else if (r.latency.p99 > 2000) v = "LENTO";
  console.log("  -> " + v);
  return { name: t.name, reqSec: r.requests.average, p99: r.latency.p99, fail: r.errors + r.timeouts };
}
(async () => {
  console.log("\nLOAD TEST INTERNO -> " + BASE);
  const s = [];
  for (const t of TARGETS) { try { s.push(await runOne(t)); } catch (e) { console.log("  Error " + t.name + ": " + e.message); } }
  console.log("\n" + "#".repeat(60) + "\n  RESUMEN\n" + "#".repeat(60));
  for (const x of s) console.log("  " + x.name.padEnd(22) + fmt(x.reqSec).padStart(7) + " req/s · p99 " + x.p99.toFixed(0).padStart(5) + "ms · " + (x.fail > 0 ? "FALLOS" : "ok"));
  console.log("#".repeat(60));
})();
