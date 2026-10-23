import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ROOF_UTILIZATION_FACTOR,
  calculateUsableRoofArea,
} from "../roof-area.ts";

test("roof area split uses a conservative default utilization factor", () => {
  assert.strictEqual(DEFAULT_ROOF_UTILIZATION_FACTOR, 0.8);
  assert.strictEqual(calculateUsableRoofArea(100), 80);
  assert.strictEqual(calculateUsableRoofArea(279.27), 223.42);
});

test("roof area split clamps unrealistic factors and invalid areas", () => {
  assert.strictEqual(calculateUsableRoofArea(100, 0.75), 75);
  assert.strictEqual(calculateUsableRoofArea(100, 2), 100);
  assert.strictEqual(calculateUsableRoofArea(100, 0.1), 50);
  assert.strictEqual(calculateUsableRoofArea(0), 0);
  assert.strictEqual(calculateUsableRoofArea(-10), 0);
  assert.strictEqual(calculateUsableRoofArea(Number.NaN), 0);
});
