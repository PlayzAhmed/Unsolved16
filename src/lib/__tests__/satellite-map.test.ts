import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ROOF_POLYGON,
  buildEsriTileUrl,
  buildRooftopImageUrl,
  calculateMapPolygonAreaM2,
  calculateMapRectAreaM2,
  chooseZoomForGeoPolygon,
  clampRooftopZoom,
  fitPolygonToArea,
  metersPerMapUnit,
  offsetGeoPointByMeters,
  projectPolygonToViewBox,
} from "../satellite-map.ts";

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

test("pan tiles opt out of the procedural fallback image", () => {
  const tileUrl = new URL(
    buildRooftopImageUrl({ lat: 30, lng: 31, zoom: 18, tile: true }),
    "http://localhost"
  );
  const mainUrl = new URL(
    buildRooftopImageUrl({ lat: 30, lng: 31, zoom: 18 }),
    "http://localhost"
  );

  assert.equal(tileUrl.searchParams.get("tile"), "1");
  assert.equal(mainUrl.searchParams.has("tile"), false);
});

test("internal satellite and label URLs use the same supported zoom range", () => {
  assert.equal(clampRooftopZoom(20), 19);
  assert.equal(clampRooftopZoom(16), 17);
  assert.equal(clampRooftopZoom(Number.NaN), 18);
  assert.equal(new URL(buildRooftopImageUrl({ lat: 30, lng: 31, zoom: 20, layer: "labels" }), "http://localhost")
    .searchParams.get("zoom"), "19");
});

test("a full map selection covers the expected 4:3 ground extent", () => {
  const area = calculateMapRectAreaM2(400, 300, 30.0384, 19);
  assert.ok(area > 20000 && area < 21000, `unexpected area ${area}`);
});

test("fitting a polygon matches the detected rooftop area", () => {
  const polygon = fitPolygonToArea(DEFAULT_ROOF_POLYGON, 280, 29.9602, 19);
  assert.equal(calculateMapPolygonAreaM2(polygon, 29.9602, 19), 280);
});

test("neighbouring map tiles are offset by one tile extent", () => {
  const origin = { lat: 30.0384, lng: 31.2118 };
  const tileMeters = metersPerMapUnit(origin.lat, 19) * 400;
  const shifted = offsetGeoPointByMeters(origin, 0, -tileMeters);

  const latRadians = (origin.lat * Math.PI) / 180;
  const metersPerDegreeLat = 111132.954 - 559.822 * Math.cos(2 * latRadians);
  const groundMeters = (origin.lat - shifted.lat) * metersPerDegreeLat;

  assert.ok(
    Math.abs(groundMeters - tileMeters * Math.cos(latRadians)) < 1,
    `unexpected tile offset ${groundMeters}`
  );
});

test("projected building polygons preserve the geocoded area", () => {
  const coords = [
    { lat: 29.960275, lng: 31.256813 },
    { lat: 29.960275, lng: 31.256987 },
    { lat: 29.960125, lng: 31.256987 },
    { lat: 29.960125, lng: 31.256813 },
  ];
  const zoom = chooseZoomForGeoPolygon(coords, 29.9602, 31.2569);
  const polygon = projectPolygonToViewBox(coords, 29.9602, 31.2569, zoom);
  const area = calculateMapPolygonAreaM2(polygon, 29.9602, zoom);

  assert.equal(zoom, 19);
  assert.ok(Math.abs(area - 280) <= 2, `unexpected area ${area}`);
});
