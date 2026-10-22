import assert from "node:assert/strict";
import test from "node:test";
import { buildEsriTileUrl, buildRooftopImageUrl, clampRooftopZoom } from "../satellite-map.ts";

test("satellite and hybrid label layers target the same tile", () => {
  const imageryUrl = new URL(buildEsriTileUrl(30.05, 31.2, 18, "imagery"));
  const labelsUrl = new URL(buildEsriTileUrl(30.05, 31.2, 18, "labels"));

  assert.match(imageryUrl.pathname, /World_Imagery\/MapServer\/tile\/18\/\d+\/\d+$/);
  assert.match(labelsUrl.pathname, /World_Boundaries_and_Places\/MapServer\/tile\/18\/\d+\/\d+$/);
  assert.equal(imageryUrl.pathname.split("/").slice(-3).join("/"), labelsUrl.pathname.split("/").slice(-3).join("/"));
});

test("hybrid label image URL preserves the selected location and zoom", () => {
  const imageUrl = new URL(buildRooftopImageUrl({
    lat: 30.05,
    lng: 31.2,
    zoom: 19,
    layer: "labels",
  }), "http://localhost");

  assert.equal(imageUrl.searchParams.get("lat"), "30.05");
  assert.equal(imageUrl.searchParams.get("lng"), "31.2");
  assert.equal(imageUrl.searchParams.get("zoom"), "19");
  assert.equal(imageUrl.searchParams.get("layer"), "labels");
});

test("internal satellite and label URLs use the same supported zoom range", () => {
  assert.equal(clampRooftopZoom(20), 19);
  assert.equal(clampRooftopZoom(16), 17);
  assert.equal(clampRooftopZoom(Number.NaN), 18);
  assert.equal(new URL(buildRooftopImageUrl({ lat: 30, lng: 31, zoom: 20, layer: "labels" }), "http://localhost")
    .searchParams.get("zoom"), "19");
});
