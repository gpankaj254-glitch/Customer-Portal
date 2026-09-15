/* eslint-disable no-await-in-loop */
const XLSX = require("xlsx");
const mongoose = require("mongoose");
const logger = require("../config/logger");
const config = require("../config/config");
const { Circuit, User, Ticket } = require("../models");

const IMPORT_USER = {
  name: "Historical Data Import",
  email: "import@scloudx.com",
  password: "ImportUser123",
  role: "scloudxAdmin",
};

// Parses "0 days 11:03:00" into total minutes
function parseDownTimeToMinutes(text) {
  if (!text) return null;
  const match = String(text).match(/(\d+)\s*days?\s*(\d+):(\d+):(\d+)/);
  if (!match) return null;
  const [, days, hours, mins, secs] = match.map(Number);
  return days * 24 * 60 + hours * 60 + mins + Math.round(secs / 60);
}

async function getOrCreateImportUser() {
  let user = await User.findOne({ email: IMPORT_USER.email });
  if (!user) {
    user = await User.create(IMPORT_USER);
    logger.info(`Created import user: ${user._id}`);
  }
  return user;
}

async function importRow(sNo, row, importUser) {
  try {
    const circuitId = row["Circuit ID"];

    const existing = await Ticket.findOne({ vendorTicketId: String(row["Supplier Ticket No."]) });
    if (existing) {
      console.error(`Row ${sNo}: ticket already imported (vendorTicketId ${row["Supplier Ticket No."]}), skipping`);
      return;
    }

    const escaped = circuitId.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const circuit = await Circuit.findOne({
      vendorCircuitId: new RegExp(`^\\s*${escaped}\\s*$`),
    });

    if (!circuit) {
    console.error(`Row ${sNo}: no circuit found for Circuit ID "${circuitId}", skipping`);
    return;
    }

    const userRef = {
      id: importUser._id.toString(),
      name: importUser.name,
      email: importUser.email,
      role: importUser.role,
    };

    const resolvedAt = row["Issue reported resolved to Aryaka"];
    const reportedAt = row["Issue Reporetd to Supplier"];
    const startedAt = row["Issue start Date & Time (IST)"];

    const history = [
      startedAt && { status: "Issue Started", timestamp: startedAt, user: userRef },
      reportedAt && { status: "Reported to Supplier", timestamp: reportedAt, user: userRef },
      resolvedAt && { status: row.Status || "Resolved", timestamp: resolvedAt, user: userRef },
    ].filter(Boolean);

    const status = row.Status || "Closed";

    const ticketToCreate = {
      site: circuit.site,
      region: circuit.region,
      customer: circuit.customer,
      circuit: {
        id: circuit._id.toString(),
        name: circuit.vendorCircuitId,
        code: circuit.code,
      },
      customerTicketId: row["Customer ticket No."] ? String(row["Customer ticket No."]) : "",
      vendorTicketId: row["Supplier Ticket No."] ? String(row["Supplier Ticket No."]) : "",
      source: "xlsx-import",
      vendor: row["Supplier Name"] || "",
      subject: `Circuit fault — ${circuitId}`,
      description: row.Reason || "",
      active: true,
      closed: status.toLowerCase() === "closed",
      downTime: parseDownTimeToMinutes(row["Overall Down Time"]),
      latestUpdate: {
        status,
        comment: row.Reason || "",
        user: userRef,
        updatedAt: resolvedAt ? String(resolvedAt) : String(startedAt),
      },
      history,
    };

    await Ticket.create(ticketToCreate);
  } catch (err) {
     console.error(`ERROR importing row ${sNo}: ${err.message}`);
  }
}

mongoose.connect(config.mongoose.url, config.mongoose.options).then(async () => {
  logger.info("Connected to MongoDB");
  const importUser = await getOrCreateImportUser();

  const workbook = XLSX.readFile("src/files/Sample Ticket Data 3Jan23.xlsx");
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { range: 1 }); // header is on the 2nd row

  let i = 0;
  for (const row of rows) {
    i += 1;
    await importRow(i, row, importUser);
  }

  logger.info(`Import complete — processed ${rows.length} rows`);
  process.exit(0);
});