import formidable from "formidable";
import ExcelJS from "exceljs";
import nodemailer from "nodemailer";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: { bodyParser: false },
};

/* ===== Gemini Usage Tracking ===== */
let dailyUsage = {
  date: new Date().toDateString(),
  count: 0,
};

let alertSentToday = false;

const DAILY_LIMIT = 80;
const WARNING_AT = 60;

/* ===== Gemini Client ===== */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/* ===== Email Setup ===== */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendQuotaAlert() {
  if (alertSentToday) return;

  await transporter.sendMail({
    from: `"AI App Alert" <${process.env.EMAIL_USER}>`,
    to: process.env.ALERT_EMAIL,
    subject: "⚠️ Gemini Free Quota Almost Exhausted",
    text: `Warning! Gemini usage is high.\nUsed: ${dailyUsage.count}/${DAILY_LIMIT}`,
  });

  alertSentToday = true;
}

/* ===== Free Dictionary Fallback ===== */
const DICTIONARY = {
  "chiken": "Chicken",
  "buter naan": "Butter Naan",
  "french fires": "French Fries",
};

function dictionaryFix(text) {
  const key = text.toLowerCase().trim();
  return DICTIONARY[key] || text;
}

/* ===== API Handler ===== */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Reset daily counter
  const today = new Date().toDateString();
  if (dailyUsage.date !== today) {
    dailyUsage.date = today;
    dailyUsage.count = 0;
    alertSentToday = false;
  }

  const form = formidable({ maxFileSize: 1 * 1024 * 1024 });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: "Invalid file" });

    const file = files.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(file.filepath);
      const sheet = workbook.worksheets[0];

      let usedFallback = false;
      let warning = null;

      sheet.eachRow(row => {
        row.eachCell(async cell => {
          if (typeof cell.value === "string") {
            let fixed = cell.value;

            try {
              if (dailyUsage.count >= DAILY_LIMIT) {
                throw new Error("QUOTA_EXCEEDED");
              }

              dailyUsage.count++;

              if (dailyUsage.count === WARNING_AT) {
                await sendQuotaAlert();
                warning = "⚠️ AI free quota almost exhausted";
              }

              const prompt = `
Fix spelling mistakes in this restaurant menu item.
Return ONLY corrected text.

Input: ${cell.value}
              `;

              const result = await model.generateContent(prompt);
              fixed = result.response.text().trim();

            } catch {
              usedFallback = true;
              fixed = dictionaryFix(cell.value);
            }

            if (fixed !== cell.value) {
              cell.value = fixed;
              cell.font = { bold: true, color: { argb: "FF008000" } };
            }
          }
        });
      });

      if (warning) res.setHeader("X-AI-Warning", warning);
      if (usedFallback) res.setHeader("X-AI-Mode", "fallback");

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=Menu_Fixed.xlsx"
      );

      await workbook.xlsx.write(res);
      res.end();

    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Processing failed" });
    }
  });
}
