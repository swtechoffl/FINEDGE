import zlib from "node:zlib";

const INDEX_SYMBOLS = new Set(["NIFTY", "BANKNIFTY", "FINNIFTY", "NIFTYNXT50"]);
const ARCHIVE_HOSTS = ["https://nsearchives.nseindia.com", "https://archives.nseindia.com"];

function yyyymmdd(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

// The UDiFF archive contains one CSV. Read it directly with Node's zlib so
// the service does not need a general-purpose ZIP dependency for one file.
function extractFirstCsv(zip) {
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i -= 1) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("invalid NSE bhavcopy ZIP");

  const entries = zip.readUInt16LE(eocd + 10);
  let cursor = zip.readUInt32LE(eocd + 16);
  for (let i = 0; i < entries; i += 1) {
    if (zip.readUInt32LE(cursor) !== 0x02014b50) throw new Error("invalid NSE ZIP directory");
    const method = zip.readUInt16LE(cursor + 10);
    const compressedSize = zip.readUInt32LE(cursor + 20);
    const nameLength = zip.readUInt16LE(cursor + 28);
    const extraLength = zip.readUInt16LE(cursor + 30);
    const commentLength = zip.readUInt16LE(cursor + 32);
    const localOffset = zip.readUInt32LE(cursor + 42);
    const name = zip.subarray(cursor + 46, cursor + 46 + nameLength).toString();

    if (name.toLowerCase().endsWith(".csv")) {
      if (zip.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("invalid NSE ZIP entry");
      const localNameLength = zip.readUInt16LE(localOffset + 26);
      const localExtraLength = zip.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = zip.subarray(start, start + compressedSize);
      if (method === 0) return compressed.toString();
      if (method === 8) return zlib.inflateRawSync(compressed).toString();
      throw new Error(`unsupported NSE ZIP compression method ${method}`);
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error("NSE bhavcopy ZIP has no CSV");
}

function parseIndexFutures(csv) {
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines.shift().split(",");
  const column = Object.fromEntries(headers.map((name, index) => [name, index]));
  for (const required of ["FinInstrmTp", "TckrSymb", "OpnIntrst", "ChngInOpnIntrst"]) {
    if (column[required] === undefined) throw new Error(`missing ${required} in NSE bhavcopy`);
  }

  const totals = new Map();
  for (const line of lines) {
    const cells = line.split(",");
    const symbol = cells[column.TckrSymb];
    if (cells[column.FinInstrmTp] !== "IDF" || !INDEX_SYMBOLS.has(symbol)) continue;
    const latestOI = Number(cells[column.OpnIntrst]);
    const changeInOI = Number(cells[column.ChngInOpnIntrst]);
    if (!Number.isFinite(latestOI) || !Number.isFinite(changeInOI)) continue;
    const current = totals.get(symbol) || { latestOI: 0, changeInOI: 0 };
    current.latestOI += latestOI;
    current.changeInOI += changeInOI;
    totals.set(symbol, current);
  }

  return [...totals].map(([symbol, values]) => {
    const prevOI = values.latestOI - values.changeInOI;
    return {
      symbol,
      latestOI: values.latestOI,
      prevOI,
      changeInOI: values.changeInOI,
      oiChangePct: prevOI ? +((values.changeInOI / prevOI) * 100).toFixed(2) : 0,
    };
  });
}

export async function fetchArchivedIndexFuturesOi() {
  // The final file is published after market close and may not exist yet for
  // the current day. Walk back across weekends, holidays and publication lag.
  for (let daysBack = 0; daysBack < 10; daysBack += 1) {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    const filename = `BhavCopy_NSE_FO_0_0_0_${yyyymmdd(date)}_F_0000.csv.zip`;
    for (const host of ARCHIVE_HOSTS) {
      const res = await fetch(`${host}/content/fo/${filename}`);
      if (res.status === 404) continue;
      if (!res.ok) continue;
      const rows = parseIndexFutures(extractFirstCsv(Buffer.from(await res.arrayBuffer())));
      if (rows.length) return rows;
    }
  }
  throw new Error("no recent NSE F&O bhavcopy available");
}
