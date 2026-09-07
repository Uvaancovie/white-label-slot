export interface Env {
  SESSIONS?: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      market: "ZA",
      currency: "ZAR",
      mode: "demo",
      product: "sa-white-label-slot",
      platform: "cloudflare-pages-functions",
      timestamp: new Date().toISOString(),
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
};
