import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import fs from "fs";
import XLSX from "xlsx";
import multer from "multer";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("MISSING SUPABASE CREDENTIALS: Using fallback values. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in Vercel environment variables.");
}

const supabase = createClient(
  supabaseUrl || "https://onxixzgugdryxhklafka.supabase.co", 
  supabaseAnonKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ueGl4emd1Z2RyeXhoa2xhZmthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyODU4NjQsImV4cCI6MjA4Nzg2MTg2NH0.7Z_VvAqgst0HpGkfLrW-FXiqSrBNBbRQIhUQxjHOOX0"
);
const upload = multer({ dest: "/tmp/uploads/" });

// Ensure uploads directory exists
if (process.env.NODE_ENV !== "production" && !fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || (process.env.APP_URL ? `${process.env.APP_URL}/api/auth/google/callback` : "http://localhost:3000/api/auth/google/callback")
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV,
      supabaseConfigured: !!process.env.SUPABASE_URL,
      vercel: !!process.env.VERCEL
    });
  });

  // Google Auth Routes
  app.get("/api/auth/google/url", (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(400).json({ error: "Google OAuth credentials are not configured in environment variables." });
    }
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/drive.file"],
      prompt: "consent"
    });
    res.json({ url });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    console.log("Received Google Auth code");
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      console.log("Successfully retrieved tokens");
      res.cookie("google_tokens", JSON.stringify(tokens), {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error getting tokens:", error);
      res.status(500).send("Authentication failed: " + (error instanceof Error ? error.message : String(error)));
    }
  });

  app.get("/api/auth/google/status", (req, res) => {
    const tokens = req.cookies.google_tokens;
    res.json({ connected: !!tokens });
  });

  app.post("/api/backup/google-drive", async (req, res) => {
    const tokensStr = req.cookies.google_tokens;
    if (!tokensStr) {
      return res.status(401).json({ error: "Not connected to Google Drive" });
    }

    try {
      const tokens = JSON.parse(tokensStr);
      oauth2Client.setCredentials(tokens);
      const drive = google.drive({ version: "v3", auth: oauth2Client });

      const { data: cases, error } = await supabase.from("cases").select("*");
      if (error) throw error;

      const backupData = JSON.stringify(cases, null, 2);
      const fileName = `advocatepro_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

      const fileMetadata = {
        name: fileName,
        mimeType: "application/json",
      };
      const media = {
        mimeType: "application/json",
        body: backupData,
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id",
      });

      res.json({ success: true, fileId: response.data.id });
    } catch (error) {
      console.error("Backup failed:", error);
      res.status(500).json({ error: "Backup failed" });
    }
  });

  // Database Check Route
  app.get("/api/db-check", async (req, res) => {
    const tables = ["cases", "priority", "staff", "attendance", "ioregister", "allocatework", "masters"];
    const results: any = {};
    let allOk = true;

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select("*").limit(1);
        if (error) {
          results[table] = { status: "missing", message: error.message };
          allOk = false;
        } else {
          results[table] = { status: "ok" };
        }
      } catch (err: any) {
        results[table] = { status: "error", message: err.message };
        allOk = false;
      }
    }

    res.status(allOk ? 200 : 500).json({ 
      status: allOk ? "ok" : "error", 
      message: allOk ? "All tables exist" : "Some tables are missing or inaccessible",
      tables: results 
    });
  });

  // API Routes
  app.get("/api/cases", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Supabase error fetching cases:", error);
        throw error;
      }
      res.json(data || []);
    } catch (error) {
      console.error("Fetch cases error:", JSON.stringify(error, null, 2));
      res.status(500).json({ 
        error: "Failed to fetch cases", 
        details: error instanceof Error ? error.message : String(error),
        fullError: error
      });
    }
  });

  app.get("/api/export-excel", async (req, res) => {
    try {
      const { data: cases, error } = await supabase.from("cases").select("*");
      if (error) throw error;

      const worksheet = XLSX.utils.json_to_sheet(cases);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Cases");
      
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=cases_export.xlsx");
      res.send(buffer);
    } catch (error) {
      console.error("Export failed:", error);
      res.status(500).json({ error: "Export failed" });
    }
  });

  app.post("/api/import-excel", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("Starting Excel import from:", req.file.path);

    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: null }) as any[];

      console.log(`Parsed ${rawData.length} rows from Excel`);

      if (rawData.length === 0) {
        return res.status(400).json({ error: "The Excel file is empty or has no data rows." });
      }

      // Aggressive normalization of keys
      const data = rawData.map(row => {
        const normalized: any = {};
        for (const key in row) {
          const normalizedKey = key.toLowerCase()
            .replace(/[^a-z0-9\s_-]/g, '')
            .trim()
            .replace(/[\s-]+/g, '_');
          normalized[normalizedKey] = row[key];
        }
        return normalized;
      });

      const rowsToInsert = data.map(row => {
        const val = (v: any) => {
          if (v === undefined || v === null) return null;
          if (v instanceof Date) return v.toISOString().split('T')[0];
          return String(v).trim();
        };

        const num = (v: any) => {
          if (v === undefined || v === null) return 0;
          const n = Number(v);
          return isNaN(n) ? 0 : n;
        };

        const getField = (row: any, ...keys: string[]) => {
          for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null) return row[key];
            const noUnderscore = key.replace(/_/g, '');
            if (row[noUnderscore] !== undefined && row[noUnderscore] !== null) return row[noUnderscore];
          }
          return null;
        };

        return {
          case_number: val(getField(row, 'case_number', 'case_no', 'casenumber', 'caseno') || "N/A"),
          client_name: val(getField(row, 'client_name', 'client', 'clientname') || "Unknown"),
          court: val(getField(row, 'court') || "N/A"),
          file_location: val(getField(row, 'file_location', 'location', 'filelocation') || "N/A"),
          stage: val(getField(row, 'stage') || "Hearing"),
          award_passed_date: val(getField(row, 'award_passed_date', 'award_date', 'awardpasseddate')),
          copy_app_filed_date: val(getField(row, 'copy_app_filed_date', 'copy_filed_date', 'copyappfileddate')),
          award_copy_received: num(getField(row, 'award_copy_received', 'copy_received', 'awardcopyreceived')),
          legal_opinion_given: num(getField(row, 'legal_opinion_given', 'legal_opinion', 'legalopiniongiven')),
          amount_received: num(getField(row, 'amount_received', 'amount', 'amountreceived')),
          receipt_sent: num(getField(row, 'receipt_sent', 'receipt', 'receiptsent')),
          disposed_date: val(getField(row, 'disposed_date', 'disposeddate')),
          hearing_date: val(getField(row, 'hearing_date', 'hearingdate')),
          other_details: val(getField(row, 'other_details', 'details', 'otherdetails')),
          next_posting_date: val(getField(row, 'next_posting_date', 'posting_date', 'nextpostingdate')),
          filing_details: val(getField(row, 'filing_details', 'filingdetails')),
          filed_on: val(getField(row, 'filed_on', 'filedon')),
          ref_number: val(getField(row, 'ref_number', 'ref_no', 'refnumber')),
          cf_number: val(getField(row, 'cf_number', 'cf_no', 'cfnumber')),
          filing_other: val(getField(row, 'filing_other', 'filingother')),
          petitioner_advocate: val(getField(row, 'petitioner_advocate', 'advocate', 'petitioneradvocate')),
          chance_for_settlement: num(getField(row, 'chance_for_settlement', 'settlement_chance', 'chanceforsettlement')),
          ca_received_date: val(getField(row, 'ca_received_date', 'careceiveddate')),
          legal_opinion_sent_date: val(getField(row, 'legal_opinion_sent_date', 'legalopinionsentdate')),
          case_type: val(getField(row, 'case_type', 'type', 'casetype') || 'Other'),
          is_connected: num(getField(row, 'is_connected', 'connected', 'isconnected')),
          connected_case_number: val(getField(row, 'connected_case_number', 'connected_no', 'connectedcasenumber')),
          counsel_other_side: val(getField(row, 'counsel_other_side', 'counsel', 'otherside')),
          appearing_for: val(getField(row, 'appearing_for', 'appearing')),
          remarkable_case: val(getField(row, 'remarkable_case', 'remarkablecase')) || 'No',
          remarkable_comments: val(getField(row, 'remarkable_comments', 'remarkablecomments')),
          case_year: val(getField(row, 'case_year', 'caseyear')) || new Date().getFullYear().toString()
        };
      });

      const { error } = await supabase.from("cases").insert(rowsToInsert);
      
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      if (error) throw error;
      
      res.json({ success: true, count: rowsToInsert.length });
    } catch (error) {
      console.error("Import failed with error:", error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: "Import failed: " + (error instanceof Error ? error.message : String(error)) });
    }
  });

  app.post("/api/cases", async (req, res) => {
    const { 
      case_number, client_name, court, file_location, stage, 
      award_passed_date, copy_app_filed_date, award_copy_received, 
      legal_opinion_given, amount_received, receipt_sent,
      disposed_date, hearing_date, other_details, next_posting_date,
      filing_details, filed_on, ref_number, cf_number, filing_other,
      petitioner_advocate, chance_for_settlement,
      ca_received_date, legal_opinion_sent_date,
      case_type, is_connected, connected_case_number,
      counsel_other_side, appearing_for,
      remarkable_case, remarkable_comments, case_year,
      ws_filed, investigation_received,
      immediate_action, immediate_action_remarks, immediate_action_completed_date
    } = req.body;
    
    if (!case_number || !client_name || !court || !file_location || !stage) {
      return res.status(400).json({ error: "Missing required fields: case_number, client_name, court, file_location, and stage are mandatory." });
    }

    try {
      const { data, error } = await supabase
        .from("cases")
        .insert([{
          case_number, 
          client_name, 
          court, 
          file_location, 
          stage, 
          award_passed_date: award_passed_date || null, 
          copy_app_filed_date: copy_app_filed_date || null, 
          award_copy_received: Number(award_copy_received || 0), 
          legal_opinion_given: Number(legal_opinion_given || 0), 
          amount_received: Number(amount_received || 0), 
          receipt_sent: Number(receipt_sent || 0),
          disposed_date: disposed_date || null, 
          hearing_date: hearing_date || null, 
          other_details: other_details || null, 
          next_posting_date: next_posting_date || null,
          filing_details: filing_details || null, 
          filed_on: filed_on || null, 
          ref_number: ref_number || null, 
          cf_number: cf_number || null, 
          filing_other: filing_other || null,
          petitioner_advocate: petitioner_advocate || null, 
          chance_for_settlement: Number(chance_for_settlement || 0),
          ca_received_date: ca_received_date || null, 
          legal_opinion_sent_date: legal_opinion_sent_date || null,
          case_type: case_type || 'Other', 
          is_connected: Number(is_connected || 0), 
          connected_case_number: connected_case_number || null,
          counsel_other_side: counsel_other_side || null,
          appearing_for: appearing_for || null,
          remarkable_case: remarkable_case || 'No',
          remarkable_comments: remarkable_comments || null,
          case_year: case_year || new Date().getFullYear().toString(),
          ws_filed: ws_filed || 'No',
          investigation_received: investigation_received || 'No',
          immediate_action: immediate_action || 'No',
          immediate_action_remarks: immediate_action_remarks || null,
          immediate_action_completed_date: immediate_action_completed_date || null
        }])
        .select();
      
      if (error) {
        console.error("Supabase insert error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          payload: req.body
        });
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error("No data returned from insert. Check RLS policies.");
      }
      
      res.json({ id: data[0].id });
    } catch (error: any) {
      console.error("Add case error:", error);
      
      let errorMessage = "Failed to add case";
      if (error.code === '42501') {
        errorMessage = "Permission denied. Please check your Supabase RLS policies.";
      } else if (error.message) {
        errorMessage = `Database error: ${error.message}`;
      }

      res.status(500).json({ 
        error: errorMessage, 
        details: error.message || String(error),
        supabaseError: error
      });
    }
  });

  app.put("/api/cases/:id", async (req, res) => {
    const { 
      case_number, client_name, court, file_location,
      stage, award_passed_date, copy_app_filed_date, award_copy_received, 
      legal_opinion_given, amount_received, receipt_sent,
      disposed_date, hearing_date, other_details, next_posting_date,
      filing_details, filed_on, ref_number, cf_number, filing_other,
      petitioner_advocate, chance_for_settlement,
      ca_received_date, legal_opinion_sent_date,
      case_type, is_connected, connected_case_number,
      counsel_other_side, appearing_for,
      remarkable_case, remarkable_comments, case_year,
      ws_filed, investigation_received,
      immediate_action, immediate_action_remarks, immediate_action_completed_date
    } = req.body;
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid case ID" });
    }

    // Ensure required fields are present
    if (!case_number || !client_name || !court || !file_location || !stage) {
      return res.status(400).json({ error: "Missing required fields: case_number, client_name, court, file_location, and stage are mandatory." });
    }

    const updatePayload: any = {
      case_number, 
      client_name, 
      court, 
      file_location,
      stage, 
      award_passed_date: award_passed_date || null, 
      copy_app_filed_date: copy_app_filed_date || null, 
      award_copy_received: Number(award_copy_received || 0), 
      legal_opinion_given: Number(legal_opinion_given || 0), 
      amount_received: Number(amount_received || 0), 
      receipt_sent: Number(receipt_sent || 0),
      disposed_date: disposed_date || null, 
      hearing_date: hearing_date || null, 
      other_details: other_details || null, 
      next_posting_date: next_posting_date || null,
      filing_details: filing_details || null, 
      filed_on: filed_on || null, 
      ref_number: ref_number || null, 
      cf_number: cf_number || null, 
      filing_other: filing_other || null,
      petitioner_advocate: petitioner_advocate || null, 
      chance_for_settlement: Number(chance_for_settlement || 0),
      ca_received_date: ca_received_date || null, 
      legal_opinion_sent_date: legal_opinion_sent_date || null,
      case_type: case_type || 'Other', 
      is_connected: Number(is_connected || 0), 
      connected_case_number: connected_case_number || null,
      counsel_other_side: counsel_other_side || null,
      appearing_for: appearing_for || null,
      remarkable_case: remarkable_case || 'No',
      remarkable_comments: remarkable_comments || null,
      case_year: case_year || new Date().getFullYear().toString(),
      ws_filed: ws_filed || 'No',
      investigation_received: investigation_received || 'No',
      immediate_action: immediate_action || 'No',
      immediate_action_remarks: immediate_action_remarks || null,
      immediate_action_completed_date: immediate_action_completed_date || null
    };

    try {
      const { error } = await supabase
        .from("cases")
        .update(updatePayload)
        .eq("id", id);

      if (error) {
        console.error("Supabase Update Error:", error);
        throw error;
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Update case error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        payload: req.body
      });
      
      let errorMessage = "Failed to update case";
      if (error.code === '42501') {
        errorMessage = "Permission denied. Please check your Supabase RLS policies.";
      } else if (error.message) {
        errorMessage = `Database error: ${error.message}`;
      }

      res.status(500).json({ 
        error: errorMessage,
        details: error.message || String(error),
        supabaseError: error
      });
    }
  });

  app.delete("/api/cases/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const { error } = await supabase
        .from("cases")
        .delete()
        .eq("id", parseInt(id));
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      console.error("Delete failed with error:", error);
      res.status(500).json({ error: "Failed to delete case" });
    }
  });

  // Priority Case Routes
  app.get("/api/priority", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("priority")
        .select("*")
        .order("remind_on", { ascending: true });
      
      if (error) throw error;
      res.json(data || []);
    } catch (error: any) {
      const errorMsg = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
      console.error("Fetch priority cases error:", errorMsg);
      res.status(500).json({ error: "Failed to fetch priority cases", details: errorMsg });
    }
  });

  app.post("/api/priority", async (req, res) => {
    const { case_number, purpose, remind_on, status } = req.body;
    if (!case_number || !purpose || !remind_on || !status) {
      return res.status(400).json({ error: "All fields are required" });
    }
    try {
      const { data, error } = await supabase
        .from("priority")
        .insert([{ 
          case_number, 
          purpose, 
          remind_on: remind_on || null, 
          status: status || 'pending' 
        }])
        .select();
      if (error) {
        console.error("Supabase priority insert error:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error("No data returned from priority insert. Check RLS policies.");
      }
      
      res.json(data[0]);
    } catch (error) {
      console.error("Add priority case error:", error);
      res.status(500).json({ 
        error: "Failed to add priority case",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.put("/api/priority/:id", async (req, res) => {
    const { purpose, remind_on, status } = req.body;
    try {
      const { error } = await supabase
        .from("priority")
        .update({ purpose, remind_on, status })
        .eq("id", req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      console.error("Update priority case error:", error);
      res.status(500).json({ error: "Failed to update priority case" });
    }
  });

  app.delete("/api/priority/:id", async (req, res) => {
    try {
      const { error } = await supabase
        .from("priority")
        .delete()
        .eq("id", req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      console.error("Delete priority case error:", error);
      res.status(500).json({ error: "Failed to delete priority case" });
    }
  });

  // Staff Routes
  app.get("/api/staff", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .order("staff_name", { ascending: true });
      if (error) throw error;
      res.json(data || []);
    } catch (error: any) {
      const errorMsg = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
      console.error("Fetch staff error:", errorMsg);
      res.status(500).json({ error: "Failed to fetch staff", details: errorMsg });
    }
  });

  app.post("/api/staff", async (req, res) => {
    const { staff_name, designation, mobile_number, address, joined_on, relieved_on, blood_group } = req.body;
    if (!staff_name || !designation || !joined_on) {
      return res.status(400).json({ error: "Name, Designation and Joined On are required" });
    }
    try {
      const { data, error } = await supabase
        .from("staff")
        .insert([{ 
          staff_name, 
          designation, 
          mobile_number: mobile_number || null,
          address: address || null, 
          joined_on: joined_on || null, 
          relieved_on: relieved_on || null, 
          blood_group: blood_group || null 
        }])
        .select();
      if (error) {
        console.error("Supabase staff insert error:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error("No data returned from staff insert. Check RLS policies.");
      }
      
      res.json(data[0]);
    } catch (error) {
      console.error("Add staff error:", error);
      res.status(500).json({ 
        error: "Failed to add staff",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete("/api/staff/:id", async (req, res) => {
    try {
      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      console.error("Delete staff error:", error);
      res.status(500).json({ error: "Failed to delete staff" });
    }
  });

  // Attendance Routes
  app.get("/api/attendance", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .order("punch_in_date", { ascending: false });
      if (error) throw error;
      res.json(data || []);
    } catch (error: any) {
      const errorMsg = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
      console.error("Fetch attendance error:", errorMsg);
      res.status(500).json({ error: "Failed to fetch attendance", details: errorMsg });
    }
  });

  app.post("/api/attendance/punch", async (req, res) => {
    const { staff_name, type, date, time } = req.body;
    if (!staff_name || !type || !date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // Check if attendance record exists for this staff and date
      // For 'out', we look for the most recent record that doesn't have a punch_out_time
      let existingRecordQuery = supabase
        .from("attendance")
        .select("*")
        .eq("staff_name", staff_name);
      
      if (type === 'out') {
        existingRecordQuery = existingRecordQuery
          .is("punch_out_time", null)
          .order("punch_in_date", { ascending: false })
          .limit(1);
      } else {
        existingRecordQuery = existingRecordQuery
          .eq("punch_in_date", date);
      }

      const { data: existingData, error: fetchError } = await existingRecordQuery;

      if (fetchError) throw fetchError;
      const existing = existingData && existingData.length > 0 ? existingData[0] : null;

      let result;
      if (existing) {
        const updateData: any = {};
        if (type === 'in') updateData.punch_in_time = time;
        if (type === 'out') {
          updateData.punch_out_time = time;
          updateData.punch_out_date = date;
        }
        
        // If type is 'attendance', we don't really need to update anything if it exists,
        // but we can just return success.
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from("attendance")
            .update(updateData)
            .eq("id", existing.id);
          
          if (updateError) throw updateError;
        }
        result = { success: true, updated: true };
      } else {
        const insertData: any = {
          staff_name,
          punch_in_date: date,
          punch_in_time: type === 'in' ? time : null
        };
        if (type === 'out') {
          insertData.punch_out_time = time;
          insertData.punch_out_date = date;
        }

        const { error: insertError } = await supabase
          .from("attendance")
          .insert([insertData]);
        
        if (insertError) throw insertError;
        result = { success: true, created: true };
      }

      res.json(result);
    } catch (error) {
      console.error("Punch error:", error);
      res.status(500).json({ error: "Failed to process punch", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Inward Outward Register
  app.get("/api/ioregister", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("ioregister")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Supabase fetch ioregister error:", error);
        throw error;
      }
      res.json(data || []);
    } catch (error: any) {
      console.error("Fetch ioregister error:", error);
      res.status(500).json({ 
        error: "Failed to fetch ioregister",
        details: error.message || String(error),
        supabaseError: error
      });
    }
  });

  app.post("/api/ioregister", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("ioregister")
        .insert([req.body])
        .select();
      if (error) {
        console.error("Supabase add ioregister error:", error);
        throw error;
      }
      if (!data || data.length === 0) {
        throw new Error("No data returned from ioregister insert");
      }
      res.json(data[0]);
    } catch (error: any) {
      console.error("Add ioregister error:", error);
      res.status(500).json({ 
        error: "Failed to add ioregister entry",
        details: error.message || String(error),
        supabaseError: error
      });
    }
  });

  // Work Allocation
  app.get("/api/allocatework", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("allocatework")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Supabase fetch allocatework error:", error);
        throw error;
      }
      res.json(data || []);
    } catch (error: any) {
      console.error("Fetch allocatework error:", error);
      res.status(500).json({ 
        error: "Failed to fetch work allocations",
        details: error.message || String(error),
        supabaseError: error
      });
    }
  });

  app.post("/api/allocatework", async (req, res) => {
    try {
      const payload = {
        ...req.body,
        status: req.body.status || 'Pending'
      };
      const { data, error } = await supabase
        .from("allocatework")
        .insert([payload])
        .select();
      if (error) {
        console.error("Supabase add allocatework error:", error);
        throw error;
      }
      if (!data || data.length === 0) {
        throw new Error("No data returned from allocatework insert");
      }
      res.json(data[0]);
    } catch (error: any) {
      console.error("Add allocatework error:", error);
      res.status(500).json({ 
        error: "Failed to allot work",
        details: error.message || String(error),
        supabaseError: error
      });
    }
  });

  // Master Routes
  app.get("/api/masters", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("masters")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Supabase fetch masters error:", error);
        throw error;
      }
      res.json(data || []);
    } catch (error: any) {
      console.error("Fetch masters error:", error);
      res.status(500).json({ 
        error: "Failed to fetch masters",
        details: error.message || String(error),
        supabaseError: error
      });
    }
  });

  app.post("/api/masters", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("masters")
        .insert([req.body])
        .select();
      if (error) {
        console.error("Supabase add master error:", error);
        throw error;
      }
      if (!data || data.length === 0) {
        throw new Error("No data returned from master insert");
      }
      res.json(data[0]);
    } catch (error: any) {
      console.error("Add master error:", error);
      res.status(500).json({ 
        error: "Failed to add master entry",
        details: error.message || String(error),
        supabaseError: error
      });
    }
  });

  app.patch("/api/allocatework/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from("allocatework")
        .update(req.body)
        .eq("id", id)
        .select();
      if (error) throw error;
      res.json(data[0]);
    } catch (error) {
      console.error("Update allocatework error:", error);
      res.status(500).json({ error: "Failed to update work allocation" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  
  return app;
}

export const appPromise = startServer();
export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
