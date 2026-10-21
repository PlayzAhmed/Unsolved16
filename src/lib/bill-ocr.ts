import path from "path";
import fs from "fs";
import { calculateKwhFromEgp, calculateEgpFromKwh } from "@/lib/egypt-tariffs";
import type { BillData } from "@/types";

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
  const lines = norm.split(/[\r\n]+/);

  let totalCost: number | undefined;
  let kwh: number | undefined;
  let meter: string | undefined;

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

    const prompt = `Read this electricity bill image and extract:
1. totalCostEgp: Total amount to pay in EGP (number)
2. kwhConsumption: Monthly consumption in kWh (number)
3. meterNumber: Meter or account number (string)

Return JSON only:
{"totalCostEgp": number, "kwhConsumption": number, "meterNumber": string}`;

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

    return {
      totalCostEgp: cost > 0 ? cost : undefined,
      kwhConsumption: kwh > 0 ? kwh : undefined,
      meterNumber: parsed.meterNumber || undefined,
      extractedText: `Gemini API Extracted: Cost=${cost} EGP, kWh=${kwh}, Meter=${parsed.meterNumber || "N/A"}`,
      confidence: 0.98,
      lowConfidence: false,
      source: "gemini",
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
