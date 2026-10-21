import { NextRequest, NextResponse } from "next/server";
import { readBillData, extractBillDataFromText } from "@/lib/bill-ocr";
import { calculateKwhFromEgp } from "@/lib/egypt-tariffs";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. Direct File Upload (Image or PDF)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("billFile");

      if (file && typeof file === "object" && "arrayBuffer" in file) {
        const fileObj = file as File;
        const arrayBuffer = await fileObj.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const result = await readBillData(buffer, fileObj.type || "image/jpeg");

        return NextResponse.json({
          success: true,
          data: result,
        });
      }
    }

    // 2. Direct JSON body (OCR text or manual spend)
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));

      if (body.rawText) {
        const result = extractBillDataFromText(String(body.rawText));
        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      if (body.totalCostEgp) {
        const cost = Number(body.totalCostEgp);
        const kwh = calculateKwhFromEgp(cost);
        return NextResponse.json({
          success: true,
          data: {
            totalCostEgp: cost,
            kwhConsumption: kwh,
            meterNumber: body.meterNumber || "MANUAL",
            confidence: 1.0,
            lowConfidence: false,
            source: "manual",
          },
        });
      }
    }

    return NextResponse.json({
      success: false,
      error: "No bill file or data provided",
    });
  } catch (error) {
    console.error("OCR API error:", error);
    return NextResponse.json({
      success: true,
      data: {
        totalCostEgp: 3850,
        kwhConsumption: calculateKwhFromEgp(3850),
        meterNumber: "FALLBACK",
        lowConfidence: true,
        source: "fallback",
        warning: "Could not read bill image. Please adjust with the manual slider.",
      },
    });
  }
}
