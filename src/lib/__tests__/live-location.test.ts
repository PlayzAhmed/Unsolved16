import assert from "node:assert/strict";
import test from "node:test";
import { resolveNetworkLocation } from "../live-location.ts";

test("parses an ipwho.is payload into coordinates and a label", async () => {
  let requested: URL | undefined;
  const location = await resolveNetworkLocation({
    fetcher: async (input) => {
      requested = new URL(String(input));
      return Response.json({
        success: true,
        latitude: 30.0444,
        longitude: 31.2357,
        city: "Cairo",
        region: "Cairo",
        country: "Egypt",
      });
    },
  });

  assert.equal(requested?.hostname, "ipwho.is");
  assert.deepEqual(location, {
    lat: 30.0444,
    lng: 31.2357,
    label: "Cairo, Cairo, Egypt",
    source: "network",
  });
});

test("falls back to ipapi.co and geolocates the supplied client IP", async () => {
  const requestedUrls: string[] = [];
  const location = await resolveNetworkLocation({
    clientIp: "41.65.10.20",
    fetcher: async (input) => {
      const url = new URL(String(input));
      requestedUrls.push(url.toString());

      if (url.hostname === "ipwho.is") {
        return new Response("unavailable", { status: 503 });
      }

      return Response.json({
        latitude: 30.0131,
        longitude: 31.2089,
        city: "Cairo",
        region: "Cairo",
        country_name: "Egypt",
      });
    },
  });

  assert.equal(requestedUrls.length, 2);
  assert.equal(new URL(requestedUrls[0]).pathname, "/41.65.10.20");
  assert.equal(new URL(requestedUrls[1]).pathname, "/41.65.10.20/json/");
  assert.equal(location?.lat, 30.0131);
  assert.equal(location?.lng, 31.2089);
  assert.equal(location?.label, "Cairo, Cairo, Egypt");
});

test("rejects null-island and malformed provider payloads", async () => {
  const location = await resolveNetworkLocation({
    fetcher: async () => Response.json({ success: true, latitude: 0, longitude: 0 }),
  });

  assert.equal(location, null);
});

test("returns null when every provider fails", async () => {
  const location = await resolveNetworkLocation({
    fetcher: async () => new Response("boom", { status: 500 }),
  });

  assert.equal(location, null);
});
