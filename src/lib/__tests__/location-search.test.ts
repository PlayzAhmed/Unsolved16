import assert from "node:assert/strict";
import test from "node:test";
import { isValidCoordinates, resolveAddress } from "../location-search.ts";

test("uses exact aliases for known demo locations", async () => {
  let requests = 0;
  const location = await resolveAddress("  MAADI ", {
    fetcher: async () => {
      requests += 1;
      return Response.json({});
    },
  });

  assert.equal(location.locationResolved, true);
  assert.equal(location.lat, 29.9602);
  assert.equal(location.lng, 31.2569);
  assert.equal(requests, 0);
});

test("does not replace a full street address with a district preset", async () => {
  const location = await resolveAddress("12 Abbas El Akkad St, Nasr City, Cairo", {
    fetcher: async () => Response.json([
      { lat: "30.061", lon: "31.337", display_name: "12 Abbas El Akkad St, Nasr City, Cairo, Egypt" },
    ]),
  });

  assert.equal(location.locationResolved, true);
  assert.equal(location.lat, 30.061);
  assert.equal(location.lng, 31.337);
  assert.match(location.formattedAddress, /^12 Abbas/);
});

test("uses Google geocoding for the complete address when configured", async () => {
  let requestedUrl: URL | undefined;
  const location = await resolveAddress("12 Abbas El Akkad St, Nasr City, Cairo", {
    googleApiKey: "test-key",
    fetcher: async (input) => {
      requestedUrl = new URL(String(input));
      return Response.json({
        status: "OK",
        results: [{
          formatted_address: "12 Abbas El Akkad St, Cairo, Egypt",
          geometry: { location: { lat: 30.061, lng: 31.337 } },
        }],
      });
    },
  });

  assert.equal(location.locationResolved, true);
  assert.equal(location.lat, 30.061);
  assert.equal(requestedUrl?.searchParams.get("address"), "12 Abbas El Akkad St, Nasr City, Cairo, Egypt");
  assert.equal(requestedUrl?.searchParams.get("region"), "eg");
});

test("falls through from a Google miss to Egyptian Nominatim results", async () => {
  const requests: string[] = [];
  const location = await resolveAddress("شركة النور، مدينة العبور، مصر", {
    googleApiKey: "test-key",
    fetcher: async (input) => {
      const url = new URL(String(input));
      requests.push(url.hostname);
      if (url.hostname === "maps.googleapis.com") return Response.json({ status: "ZERO_RESULTS", results: [] });
      assert.equal(url.searchParams.get("q"), "شركة النور، مدينة العبور، مصر");
      assert.equal(url.searchParams.get("countrycodes"), "eg");
      return Response.json([
        { lat: "30.228", lon: "31.478", display_name: "شركة النور، مدينة العبور، مصر" },
      ]);
    },
  });

  assert.deepEqual(requests, ["maps.googleapis.com", "nominatim.openstreetmap.org"]);
  assert.equal(location.locationResolved, true);
  assert.equal(location.lat, 30.228);
  assert.equal(location.lng, 31.478);
});

test("marks Maadi fallback as unresolved when providers cannot find the address", async () => {
  const location = await resolveAddress("Unknown industrial site, Egypt", {
    fetcher: async () => Response.json([]),
  });

  assert.equal(location.locationResolved, false);
  assert.equal(location.lat, 29.9602);
  assert.equal(location.lng, 31.2569);
  assert.equal(location.formattedAddress, "Unknown industrial site, Egypt");
  assert.equal(location.presetCoords, undefined);
});

test("rejects coordinates outside valid latitude and longitude ranges", () => {
  assert.equal(isValidCoordinates(30.1, 31.2), true);
  assert.equal(isValidCoordinates(91, 31.2), false);
  assert.equal(isValidCoordinates(30.1, -181), false);
  assert.equal(isValidCoordinates(Number.NaN, 31.2), false);
});
