import "https://deno.land/std@0.224.0/dotenv/load.ts";

export const config = {
  authGateway: {
    url: Deno.env.get("AUTH_GATEWAY_URL") ?? "http://localhost:8888",
    clientId: Deno.env.get("AUTH_CLIENT_ID") ?? "",
    clientSecret: Deno.env.get("AUTH_CLIENT_SECRET") ?? "",
    redirectUri: Deno.env.get("AUTH_REDIRECT_URI") ?? "",
  },
  server: {
    port: Number(Deno.env.get("PORT") ?? "8000"),
  },
}; 