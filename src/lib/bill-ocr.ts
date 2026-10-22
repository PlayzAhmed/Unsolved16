import path from "path";
import fs from "fs";
import { calculateKwhFromEgp, calculateEgpFromKwh } from "@/lib/egypt-tariffs";
import type { BillData } from "@/types";

export interface BillValidationResult {
  isEgyptianBusinessBill: boolean;
  validationReason?: string;
}

export interface ElectricityBillValidationResult {
  isElectricityBill: boolean;
  validationReason?: string;
}

interface NativeArabicBillFields {
  totalCost?: number;
  kwh?: number;
  meter?: string;
}

interface ScoredBillValue {
  value: number;
  score: number;
}

const NATIVE_ELECTRICITY_PATTERN = /(?:كهرباء|الطاقة الكهربائية|فاتورة استهلاك|كيلووات|ك\.و\.س)/u;
const NATIVE_EGYPT_PATTERN = /(?:مصر|وزارة الكهرباء|الشركة القابضة لكهرباء مصر|شمال القاهرة|جنوب القاهرة|القاهرة لتوزيع|الإسكندرية|الاسكندرية|البحيرة|القناة لتوزيع|شمال الدلتا|جنوب الدلتا|مصر الوسطى|مصر العليا|توزيع الكهرباء)/u;
const NATIVE_BUSINESS_PATTERN = /(?:تجاري|استخدام تجاري|مشترك تجاري|نشاط تجاري|منشأة|محل|ورشة|مصنع|مخبز|عيادة|مكتب|فندق|مطعم)/u;
const NATIVE_RESIDENTIAL_PATTERN = /(?:منزلي|سكني|شقة|وحدة سكنية)/u;

function getLineNumbers(line: string): number[] {
  return (line.match(/[0-9]+(?:[,.][0-9]{1,2})?/g) ?? [])
    .map((value) => Number(value.replace(/,/g, "")))
    .filter((value) => Number.isFinite(value));
}

function selectHigherConfidence(
  current: ScoredBillValue | undefined,
  candidate: ScoredBillValue
): ScoredBillValue {
  return !current || candidate.score > current.score ? candidate : current;
}

/**
 * Handles common Arabic and English bill layouts, including reading tables
 * where the final number is the usage column (current, previous, multiplier, usage).
 */
function extractFlexibleBillFields(text: string): NativeArabicBillFields {
  let cost: ScoredBillValue | undefined;
  let usage: ScoredBillValue | undefined;
  let meter: string | undefined;

  for (const rawLine of text.split(/[\r\n]+/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const numbers = getLineNumbers(line);
    const finalNumber = numbers[numbers.length - 1];
    if (finalNumber !== undefined) {
      let costScore = 0;
      if (/(?:total\s+(?:amount\s+)?due|amount\s+due|amount\s+payable|please\s+pay|grand\s+total|المطلوب\s+سداده|إجمالي\s+المستحق|اجمالي\s+المستحق)/iu.test(line)) {
        costScore = 4;
      } else if (/(?:net\s+amount|total\s+bill|total\s+current\s+electric(?:ity)?\s+service|إجمالي\s+الفاتورة|اجمالي\s+الفاتورة|صافي\s+الفاتورة)/iu.test(line)) {
        costScore = 3;
      } else if (/(?:current\s+service|المبلغ|جنيه|ج\.م|egp)/iu.test(line)) {
        costScore = 1;
      }
      if (costScore > 0 && finalNumber >= 0 && finalNumber <= 1000000) {
        cost = selectHigherConfidence(cost, { value: finalNumber, score: costScore });
      }

      let usageScore = 0;
      if (/(?:total\s+(?:monthly\s+)?(?:consumption|usage)|total\s*kwh|tot\s*kwh|إجمالي\s+الاستهلاك|اجمالي\s+الاستهلاك|إجمالي\s+ك\.و|اجمالي\s+ك\.و)/iu.test(line)) {
        usageScore = 4;
      } else if (/(?:monthly\s+consumption|consumption|usage|units\s+(?:used|consumed)|كمية\s+الاستهلاك|الاستهلاك\s+الشهري|استهلاك\s+شهري)/iu.test(line)) {
        usageScore = 3;
      } else if (/(?:kwh\s+rec|كيلووات|ك\.و\.س|ك\/س)/iu.test(line)) {
        usageScore = 2;
      }
      if (usageScore > 0 && finalNumber >= 0 && finalNumber <= 1000000) {
        usage = selectHigherConfidence(usage, { value: Math.round(finalNumber), score: usageScore });
      }
    }

    if (meter === undefined) {
      const meterMatch = line.match(/(?:meter\s*#?|meter\s*(?:number|no\.?)|account\s*(?:number|no\.?)|رقم\s+العداد|عداد|رقم\s+الحساب|اشتراك)\s*[:#-]?\s*([A-Za-z0-9\-_]{4,18})/iu);
      if (meterMatch) meter = meterMatch[1];
    }
  }

  return { totalCost: cost?.value, kwh: usage?.value, meter };
}

function extractEnglishElectricityBillFields(text: string): NativeArabicBillFields {
  const fields: NativeArabicBillFields = {};

  for (const rawLine of text.split(/[\r\n]+/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const numbers = line.match(/[0-9]+(?:[,.][0-9]{1,2})?/g) ?? [];

    if (
      fields.totalCost === undefined &&
      /(?:total\s+(?:amount\s+)?due|amount\s+due|please\s+pay|amount\s+payable)/i.test(line) &&
      numbers.length > 0
    ) {
      const amount = Number(numbers[numbers.length - 1].replace(/,/g, ""));
      if (amount >= 0 && amount <= 1000000) fields.totalCost = amount;
    }

    // Egyptian bill meter-reading rows list: current, previous, constant, usage.
    // The final number is therefore the billed consumption, not the current reading.
    if (
      fields.kwh === undefined &&
      /\b(?:tot(?:al)?)\s*kwh\b/i.test(line) &&
      numbers.length >= 2
    ) {
      const usage = Number(numbers[numbers.length - 1].replace(/,/g, ""));
      if (usage >= 0 && usage <= 1000000) fields.kwh = Math.round(usage);
    }

    if (fields.meter === undefined) {
      const meterMatch = line.match(/(?:meter\s*#?|account\s*(?:number|no\.?))\s*[:#-]?\s*([A-Za-z0-9\-_]{4,18})/i);
      if (meterMatch) fields.meter = meterMatch[1];
    }
  }

  return fields;
}

/** Verifies bill type only; country and customer-account type are intentionally ignored. */
export function validateElectricityBill(text: string): ElectricityBillValidationResult {
  const normalized = normalizeArabicNumerals(text).toLowerCase();
  const hasElectricityMarker = /(?:كهرباء|الطاقة الكهربائية|فاتورة استهلاك|electricity|electric bill|power bill|electric(?:al)?\s+(?:service|usage|charge)|eehc\.gov\.eg)/iu.test(normalized);
  const hasBillDataMarker = /(?:كيلووات|ك\.و|ك\/س|استهلاك|كمية|عداد|رقم العداد|اشتراك|حساب|kwh|consumption|meter|account|amount due|total amount)/iu.test(normalized);

  if (hasElectricityMarker && hasBillDataMarker) {
    return { isElectricityBill: true };
  }

  return {
    isElectricityBill: false,
    validationReason: "The uploaded document could not be verified as an electricity bill.",
  };
}

function validateNativeArabicBill(text: string): BillValidationResult | null {
  if (!/[ء-ي]/u.test(text)) return null;

  if (!NATIVE_ELECTRICITY_PATTERN.test(text)) {
    return { isEgyptianBusinessBill: false, validationReason: "The uploaded document does not contain Egyptian electricity-bill markers." };
  }
  if (!NATIVE_EGYPT_PATTERN.test(text)) {
    return { isEgyptianBusinessBill: false, validationReason: "The uploaded bill does not contain an Egyptian electricity-provider or location marker." };
  }
  if (NATIVE_RESIDENTIAL_PATTERN.test(text) || !NATIVE_BUSINESS_PATTERN.test(text)) {
    return { isEgyptianBusinessBill: false, validationReason: "The bill is Egyptian electricity-related, but it is not clearly a commercial account." };
  }

  return { isEgyptianBusinessBill: true };
}

function extractNativeArabicBillFields(text: string): NativeArabicBillFields {
  const fields: NativeArabicBillFields = {};

  for (const rawLine of text.split(/[\r\n]+/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const numberMatch = line.match(/([0-9,]+(?:\.[0-9]{1,2})?)/);
    const value = numberMatch ? Number(numberMatch[1].replace(/,/g, "")) : undefined;

    if (fields.totalCost === undefined && value !== undefined && /(?:المطلوب|المبلغ|إجمالي|اجمالي|صافي|جملة|فاتورة|جنيه|ج\.م)/u.test(line) && value >= 50 && value <= 1000000) {
      fields.totalCost = Math.round(value * 100) / 100;
    }
    if (fields.kwh === undefined && value !== undefined && /(?:الاستهلاك|استهلاك|كمية|فرق القراءة|كيلووات|كيلو وات|ك\.و|ك\/س)/u.test(line) && value >= 10 && value <= 1000000) {
      fields.kwh = Math.round(value);
    }
    if (fields.meter === undefined && /(?:رقم العداد|عداد|اشتراك|حساب|مرجع)/u.test(line)) {
      const meterMatch = line.match(/(?:رقم العداد|عداد|اشتراك|حساب|مرجع)\s*[:：-]?\s*([A-Za-z0-9\-_]{4,18})/u);
      if (meterMatch) fields.meter = meterMatch[1];
    }
  }

  return fields;
}

/**
 * Confirms that OCR text contains evidence of an Egyptian electricity bill for
 * a commercial account. We deliberately require all three signals so a bank
 * receipt, a residential bill, or an unrelated invoice is never accepted.
 */
export function validateEgyptianBusinessElectricityBill(
  text: string
): BillValidationResult {
  const nativeValidation = validateNativeArabicBill(text);
  if (nativeValidation) return nativeValidation;

  const normalized = normalizeArabicNumerals(text).toLowerCase();
  const hasElectricityEvidence =
    /(?:كهرباء|الطاقة الكهربائية|ك.?و.?س|electricity|electric bill|\bkwh\b|meter)/iu.test(normalized);
  const hasEgyptEvidence =
    /(?:مصر|القاهرة|الجيزة|الإسكندرية|الاسكندرية|شركة.*توزيع.*كهرباء|egypt|egyptian electricity)/iu.test(normalized);
  const isResidential = /(?:منزلي|سكني|شقة|وحدة سكنية|residential|household)/iu.test(normalized);
  const hasBusinessEvidence =
    /(?:تجاري|نشاط|منشأة|محل|ورشة|مصنع|مخبز|شركة|عيادة|مكتب|فندق|مطعم|commercial|business|shop|store|workshop|factory|bakery|clinic|office|hotel|restaurant)/iu.test(normalized);

  if (!hasElectricityEvidence) {
    return {
      isEgyptianBusinessBill: false,
      validationReason: "The uploaded document does not appear to be an electricity bill.",
    };
  }

  if (!hasEgyptEvidence) {
    return {
      isEgyptianBusinessBill: false,
      validationReason: "The uploaded bill could not be verified as an Egyptian electricity bill.",
    };
  }

  if (isResidential || !hasBusinessEvidence) {
    return {
      isEgyptianBusinessBill: false,
      validationReason: "The uploaded bill could not be verified as a business or commercial account.",
    };
  }

  return { isEgyptianBusinessBill: true };
}

/**
 * Normalizes Eastern Arabic numerals (٠-٩) to Western standard digits (0-9)
 * and decimal separators.
 */
export function normalizeArabicNumerals(input: string): string {
  if (!input) return "";
  const digits: Record<string, string> = {
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
    "٫": ".", "،": ",",
  };
  return input.replace(/[٠-٩۰-۹٫،]/g, (d) => digits[d] || d);
}

/**
 * Extracts totalCostEgp, kwhConsumption, and meterNumber from OCR text.
 * Simple, direct, and deterministic — no hardcoding.
 */
export function extractBillDataFromText(rawText: string): BillData {
  if (!rawText || !rawText.trim()) {
    return {
      confidence: 0,
      lowConfidence: true,
      extractedText: "",
      warning: "No text could be extracted from this image. Please adjust using the manual slider.",
    };
  }

  const norm = normalizeArabicNumerals(rawText);
  const electricityBillValidation = validateElectricityBill(rawText);
  const flexibleFields = extractFlexibleBillFields(norm);
  const nativeFields = extractNativeArabicBillFields(norm);
  const englishFields = extractEnglishElectricityBillFields(norm);
  const lines = norm.split(/[\r\n]+/);

  let totalCost: number | undefined = flexibleFields.totalCost ?? nativeFields.totalCost ?? englishFields.totalCost;
  let kwh: number | undefined = flexibleFields.kwh ?? nativeFields.kwh ?? englishFields.kwh;
  let meter: string | undefined = flexibleFields.meter ?? nativeFields.meter ?? englishFields.meter;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // 1. Total Bill Cost (المطلوب سداده / الإجمالي / المبلغ / Total / Due / EGP)
    if (!totalCost && /(المطلوب|المبلغ|اجمالي|إجمالي|صافي|جملة|فاتورة|total|amount|due|egp|جنيه|ج\.م)/i.test(line)) {
      const match = line.match(/([0-9,]+(?:\.[0-9]{1,2})?)/);
      if (match) {
        const val = parseFloat(match[1].replace(/,/g, ""));
        if (val >= 50 && val <= 1000000) {
          totalCost = Math.round(val * 100) / 100;
        }
      }
    }

    // 2. Consumption (الاستهلاك / كمية / ك.و.س / kWh / Units)
    if (!kwh && /(استهلاك|كمية|فرق|ك\.و|ك\/س|kwh|units)/i.test(line)) {
      const match = line.match(/([0-9,]+(?:\.[0-9]{1,2})?)/);
      if (match) {
        const val = parseFloat(match[1].replace(/,/g, ""));
        if (val >= 10 && val <= 1000000) {
          kwh = Math.round(val);
        }
      }
    }

    // 3. Meter Number (عداد / اشتراك / حساب / مرجع / Meter / Account)
    if (!meter && /(عداد|اشتراك|حساب|meter|account)/i.test(line)) {
      const afterKeyword = line.replace(/^.*?(?:عداد|اشتراك|حساب|meter|account)[:\s]*/i, "").trim();
      const match = afterKeyword.match(/([A-Za-z0-9\-_]{4,18})/);
      if (match) {
        meter = match[1];
      }
    }
  }

  // Fallback: If no keyword matched for cost, search for any prominent 3-6 digit number
  if (!totalCost) {
    const allNumbers = norm.match(/\b([0-9]{3,6}(?:\.[0-9]{1,2})?)\b/g);
    if (allNumbers && allNumbers.length > 0) {
      for (const numStr of allNumbers) {
        const candidate = parseFloat(numStr);
        if (candidate >= 100 && candidate <= 200000) {
          totalCost = candidate;
          break;
        }
      }
    }
  }

  // Reciprocal calculation: compute missing values via official EgyptERA tariffs
  if (totalCost && (!kwh || kwh <= 0)) {
    kwh = Math.round(calculateKwhFromEgp(totalCost));
  } else if (kwh && (!totalCost || totalCost <= 0)) {
    totalCost = Math.round(calculateEgpFromKwh(kwh));
  }

  const detected = !!totalCost || !!kwh;

  return {
    totalCostEgp: totalCost,
    kwhConsumption: kwh,
    meterNumber: meter || (detected ? "DETECTED" : undefined),
    extractedText: rawText.slice(0, 1000),
    confidence: detected ? (meter ? 0.95 : 0.85) : 0.2,
    lowConfidence: !detected,
    source: "tesseract",
    isElectricityBill: electricityBillValidation.isElectricityBill,
    validationReason: electricityBillValidation.validationReason,
    warning: detected
      ? undefined
      : "Could not detect clear electricity figures from this image. Please adjust using the manual slider.",
  };
}

/**
 * Direct call to Gemini Multimodal API if an API key is provided.
 */
export async function extractWithGeminiApi(
  imageBuffer: Buffer,
  mimeType: string
): Promise<BillData | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;

  try {
    const base64Data = imageBuffer.toString("base64");
    const validMimeType = mimeType && mimeType.includes("/") ? mimeType : "image/jpeg";

    const prompt = `Read this document and first verify that it is an electricity bill.
Do not infer country or customer type. Reject only documents that are not clearly electricity bills.

Extract:
1. totalCostEgp: Total amount to pay in EGP (number)
2. kwhConsumption: Monthly consumption in kWh (number)
3. meterNumber: Meter or account number (string)
4. isElectricityBill: true only when electricity-bill evidence is visible
5. validationReason: brief explanation when isElectricityBill is false

Return JSON only:
{"totalCostEgp": number, "kwhConsumption": number, "meterNumber": string, "isElectricityBill": boolean, "validationReason": string}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: validMimeType, data: base64Data } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text);
    let cost = Number(parsed.totalCostEgp) || 0;
    let kwh = Number(parsed.kwhConsumption) || 0;

    if (cost > 0 && kwh <= 0) kwh = Math.round(calculateKwhFromEgp(cost));
    else if (kwh > 0 && cost <= 0) cost = Math.round(calculateEgpFromKwh(kwh));

    const isElectricityBill = parsed.isElectricityBill === true;

    return {
      totalCostEgp: cost > 0 ? cost : undefined,
      kwhConsumption: kwh > 0 ? kwh : undefined,
      meterNumber: parsed.meterNumber || undefined,
      extractedText: `Gemini API Extracted: Cost=${cost} EGP, kWh=${kwh}, Meter=${parsed.meterNumber || "N/A"}`,
      confidence: 0.98,
      lowConfidence: !isElectricityBill,
      source: "gemini",
      isElectricityBill,
      validationReason: isElectricityBill
        ? undefined
        : String(parsed.validationReason || "The document is not an electricity bill."),
    };
  } catch {
    return null;
  }
}

/**
 * Resolves the absolute path to the tesseract.js worker script.
 * Prevents Next.js bundler from trying to load D:\ROOT\node_modules\...
 */
function getWorkerPath(): string | undefined {
  try {
    const candidate = path.join(
      process.cwd(),
      "node_modules",
      "tesseract.js",
      "src",
      "worker-script",
      "node",
      "index.js"
    );
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  } catch {}

  try {
    return require.resolve("tesseract.js/src/worker-script/node/index.js");
  } catch {}

  return undefined;
}

/**
 * Runs Tesseract.js directly on the uploaded image buffer.
 */
export async function runTesseractOcr(imageBuffer: Buffer): Promise<string> {
  try {
    const { createWorker } = await import("tesseract.js");
    const workerPath = getWorkerPath();
    const options = workerPath ? { workerPath } : {};

    let worker;
    try {
      worker = await createWorker("ara+eng", 1, options);
      const ret = await worker.recognize(imageBuffer);
      await worker.terminate();
      return ret.data.text || "";
    } catch {
      if (worker) {
        try {
          await worker.terminate();
        } catch {}
      }
      try {
        const engWorker = await createWorker("eng", 1, options);
        const ret = await engWorker.recognize(imageBuffer);
        await engWorker.terminate();
        return ret.data.text || "";
      } catch {
        return "";
      }
    }
  } catch (err) {
    console.error("Tesseract OCR execution error:", err);
    return "";
  }
}

/**
 * Main entry point: reads bill data via API if configured, otherwise via Tesseract.js.
 * No hardcoding or fake responses.
 */
export async function readBillData(
  buffer: Buffer,
  mimeType: string
): Promise<BillData> {
  // 1. If an API key is available, use Gemini Vision API
  const apiResult = await extractWithGeminiApi(buffer, mimeType);
  if (apiResult && (apiResult.totalCostEgp || apiResult.kwhConsumption)) {
    return apiResult;
  }

  // 2. Otherwise run Tesseract.js directly on the uploaded file
  const rawText = await runTesseractOcr(buffer);

  // 3. Extract actual bill numbers from the OCR text
  return extractBillDataFromText(rawText);
}
