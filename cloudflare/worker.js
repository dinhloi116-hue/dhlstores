const ORIGIN_HOST = "cuahangtoit-9a4r8wsz.manus.space";
const PRIMARY_HOST = "dhlstores.com";

function rewriteLocation(location, incomingUrl) {
  if (!location) return location;

  try {
    const target = new URL(location, `https://${ORIGIN_HOST}`);
    if (target.hostname === ORIGIN_HOST) {
      target.protocol = "https:";
      target.hostname = PRIMARY_HOST;
      target.port = "";
      return target.toString();
    }
  } catch {
    // Keep the original Location header if it is not a valid URL.
  }

  return location;
}

export default {
  async fetch(request) {
    const incomingUrl = new URL(request.url);

    // Keep one canonical hostname.
    if (incomingUrl.hostname === `www.${PRIMARY_HOST}`) {
      incomingUrl.hostname = PRIMARY_HOST;
      incomingUrl.protocol = "https:";
      return Response.redirect(incomingUrl.toString(), 308);
    }

    // A tiny endpoint to verify the Worker itself before checking the origin app.
    if (incomingUrl.pathname === "/__dhl_proxy_health") {
      return new Response("ok", {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    const originUrl = new URL(request.url);
    originUrl.protocol = "https:";
    originUrl.hostname = ORIGIN_HOST;
    originUrl.port = "";

    const headers = new Headers(request.headers);
    headers.set("x-forwarded-host", incomingUrl.host);
    headers.set("x-forwarded-proto", "https");
    headers.set("x-original-host", incomingUrl.host);

    // Cloudflare sets the Host header for the fetch target automatically.
    // Do not force the custom-domain Host header onto the Manus origin.
    headers.delete("host");

    const upstreamRequest = new Request(originUrl.toString(), {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    });

    let upstreamResponse;
    try {
      upstreamResponse = await fetch(upstreamRequest);
    } catch (error) {
      return new Response("DHL Stores origin is temporarily unavailable.", {
        status: 502,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    const responseHeaders = new Headers(upstreamResponse.headers);
    const location = responseHeaders.get("location");
    if (location) {
      responseHeaders.set("location", rewriteLocation(location, incomingUrl));
    }

    // The application already uses host-only session cookies. If an upstream
    // response ever adds an explicit Manus Domain attribute, remove it so the
    // browser can bind the cookie to dhlstores.com instead.
    if (typeof responseHeaders.getSetCookie === "function") {
      const cookies = responseHeaders.getSetCookie();
      if (cookies.length) {
        responseHeaders.delete("set-cookie");
        for (const cookie of cookies) {
          responseHeaders.append(
            "set-cookie",
            cookie.replace(/;\s*Domain=[^;]+/gi, ""),
          );
        }
      }
    }

    responseHeaders.set("x-dhl-proxy", "cloudflare-worker");

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  },
};
