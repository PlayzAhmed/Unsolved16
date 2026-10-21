import assert from "node:assert";
import test from "node:test";
import {
  normalizeArabicNumerals,
  extractBillDataFromText,
  readBillData,
} from "../bill-ocr";
import { calculateKwhFromEgp } from "../egypt-tariffs";

test("OCR - normalizeArabicNumerals converts Eastern Arabic digits", () => {
  const arabicText = "المطلوب سداده: ٣٨٥٠.٥٠ جنيه، رقم العداد: ٩٠٢١٤";
  const normalized = normalizeArabicNumerals(arabicText);
  assert.strictEqual(normalized.includes("3850.50"), true);
  assert.strictEqual(normalized.includes("90214"), true);
  assert.strictEqual(normalized.includes("٣"), false);
});

test("OCR - extractBillDataFromText extracts standard Cairo commercial bill", () => {
  const billText = `
شركة جنوب القاهرة لتوزيع الكهرباء
فاتورة استهلاك الطاقة الكهربائية
اسم المشترك: مخبز المعادي الآلي
رقم العداد: EGY-ME-90214
كمية الاستهلاك: 1366 ك.و.س
المطلوب سداده: 3,850.00 ج.م
  `;

  const parsed = extractBillDataFromText(billText);
  assert.strictEqual(parsed.totalCostEgp, 3850);
  assert.strictEqual(parsed.kwhConsumption, 1366);
  assert.strictEqual(parsed.meterNumber, "EGY-ME-90214");
  assert.strictEqual(parsed.lowConfidence, false);
});

test("OCR - extractBillDataFromText handles Eastern Arabic numerals on Egyptian bills", () => {
  const billText = `
شركة شمال القاهرة لتوزيع الكهرباء
اسم المشترك: مصنع العاشر للصناعات
رقم العداد: 3490-EGY
كمية الاستهلاك: ٥٠٧٥ ك.و.س
المطلوب سداده: ١٤٢٠٠ جنيه
  `;

  const parsed = extractBillDataFromText(billText);
  assert.strictEqual(parsed.totalCostEgp, 14200);
  assert.strictEqual(parsed.kwhConsumption, 5075);
  assert.strictEqual(parsed.meterNumber, "3490-EGY");
  assert.strictEqual(parsed.lowConfidence, false);
});

test("OCR - extractBillDataFromText extracts English bilingual format", () => {
  const billText = `
Egyptian Electricity Holding Company
Meter No: EGY-NC-5821
Monthly Consumption: 2315 kWh
Total Amount Due: 6,500.00 EGP
  `;

  const parsed = extractBillDataFromText(billText);
  assert.strictEqual(parsed.totalCostEgp, 6500);
  assert.strictEqual(parsed.kwhConsumption, 2315);
  assert.strictEqual(parsed.meterNumber, "EGY-NC-5821");
  assert.strictEqual(parsed.lowConfidence, false);
});

test("OCR - extractBillDataFromText calculates reciprocal kWh when only total cost is present", () => {
  const billText = `
فاتورة استهلاك كهرباء
المطلوب سداده: 4200 جنيه
رقم العداد: EGY-TEST-123
  `;

  const parsed = extractBillDataFromText(billText);
  assert.strictEqual(parsed.totalCostEgp, 4200);
  assert.strictEqual(parsed.meterNumber, "EGY-TEST-123");
  const expectedKwh = Math.round(calculateKwhFromEgp(4200));
  assert.strictEqual(parsed.kwhConsumption, expectedKwh);
  assert.strictEqual(parsed.lowConfidence, false);
});

test("OCR - extractBillDataFromText flags unreadable images honestly without fake hardcoding", () => {
  const garbageText = "Hello world this is some random photo without any bill numbers";
  const parsed = extractBillDataFromText(garbageText);

  assert.strictEqual(parsed.lowConfidence, true);
  assert.strictEqual(parsed.totalCostEgp, undefined);
  assert.strictEqual(typeof parsed.warning, "string");
});

test("OCR - readBillData executes Tesseract without workerPath error", async () => {
  const png1x1 = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
  const result = await readBillData(png1x1, "image/png");
  assert.strictEqual(typeof result, "object");
  assert.strictEqual(result.lowConfidence, true);
});
