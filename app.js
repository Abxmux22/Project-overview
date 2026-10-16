const FIELD_IDS = [
  "propertyName",
  "address",
  "cityState",
  "dealSponsor",
  "contactInformation",
  "numberOfUnits",
  "occupancy",
  "yearBuilt",
  "assetClass",
  "rentableSquareFeet",
  "landAcreage",
  "parkingStalls"
];

function numeric(value) {
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function formatNumericInput(input) {
  const digits = input.value.replace(/\D/g, "");
  input.value = digits ? Number(digits).toLocaleString("en-US") : "";
}

function valueOf(id) {
  return document.getElementById(id).value.trim();
}

function calculate() {
  const numberOfUnits = numeric(valueOf("numberOfUnits"));
  const parkingStalls = numeric(valueOf("parkingStalls"));
  const parkingRatio = numberOfUnits ? parkingStalls / numberOfUnits : 0;
  const formattedRatio = parkingRatio.toFixed(2);

  document.getElementById("parkingRatio").textContent = formattedRatio;
  document.getElementById("summaryProperty").textContent = valueOf("propertyName") || "Not provided";
  document.getElementById("summaryUnits").textContent = numberOfUnits.toLocaleString("en-US");
  document.getElementById("summaryParking").textContent = parkingStalls.toLocaleString("en-US");
  document.getElementById("summaryRatio").textContent = formattedRatio;

  return {
    propertyName: valueOf("propertyName"),
    address: valueOf("address"),
    cityState: valueOf("cityState"),
    dealSponsor: valueOf("dealSponsor"),
    contactInformation: valueOf("contactInformation"),
    numberOfUnits,
    occupancy: numeric(valueOf("occupancy")),
    yearBuilt: valueOf("yearBuilt"),
    assetClass: valueOf("assetClass"),
    rentableSquareFeet: numeric(valueOf("rentableSquareFeet")),
    landAcreage: numeric(valueOf("landAcreage")),
    parkingStalls,
    parkingRatio
  };
}

function pdfEscape(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7e]/g, "-");
}

function pdfText(value, x, y, size = 9, font = "F1") {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${pdfEscape(value)}) Tj ET\n`;
}

function fitText(value, maxLength = 70) {
  const text = String(value || "Not provided");
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

async function createPdf() {
  const data = calculate();
  const name = valueOf("fullName") || "Not provided";
  const email = valueOf("email") || "Not provided";
  const logoBinary = atob(REPORT_LOGO_BASE64);
  const logoBytes = Uint8Array.from(logoBinary, (character) => character.charCodeAt(0));
  const width = 612;
  const height = 792;
  const left = 42;
  const tableWidth = 528;
  const labelWidth = 220;
  const rowHeight = 31;
  const rows = [
    ["Property Name", fitText(data.propertyName)],
    ["Address", fitText(data.address)],
    ["City & State", fitText(data.cityState)],
    ["Deal Sponsor", fitText(data.dealSponsor)],
    ["Contact Information", fitText(data.contactInformation)],
    ["No. Units", data.numberOfUnits.toLocaleString("en-US")],
    ["Occupancy % Currently", `${data.occupancy.toFixed(1)}%`],
    ["Year Built", data.yearBuilt || "Not provided"],
    ["Asset Class (A, B, C, D)", data.assetClass || "Not provided"],
    ["Total SF of Rentable Units", data.rentableSquareFeet.toLocaleString("en-US")],
    ["Land Acreage of Purchase", data.landAcreage.toLocaleString("en-US", { maximumFractionDigits: 2 })],
    ["Parking Stalls", data.parkingStalls.toLocaleString("en-US")],
    ["Parking per Unit Ratio", data.parkingRatio.toFixed(2)]
  ];
  let stream = "";

  stream += "q 90 0 0 83.7 480 678 cm /Logo Do Q\n";
  stream += "0.06 0.09 0.16 rg\n" + pdfText("PROJECT OVERVIEW", left, 744, 22, "F2");
  stream += "0.39 0.45 0.55 rg\n" + pdfText(`Prepared for: ${fitText(name, 55)}`, left, 720, 9);
  stream += pdfText(`Email: ${fitText(email, 60)}`, left, 706, 9);
  stream += pdfText(`Generated: ${new Date().toLocaleDateString("en-US")}`, left, 692, 9);

  const tableTop = 645;
  const totalRows = rows.length + 1;
  stream += `0.95 0.96 0.98 rg\n${left} ${tableTop} ${tableWidth} ${rowHeight} re f\n`;
  stream += `0.86 0.92 0.84 rg\n${left} ${tableTop - rows.length * rowHeight} ${tableWidth} ${rowHeight} re f\n`;
  stream += "0.80 0.84 0.88 RG 0.6 w\n";
  for (let i = 0; i <= totalRows; i += 1) {
    const y = tableTop + rowHeight - i * rowHeight;
    stream += `${left} ${y} m ${left + tableWidth} ${y} l S\n`;
  }
  stream += `${left} ${tableTop + rowHeight} m ${left} ${tableTop + rowHeight - totalRows * rowHeight} l S\n`;
  stream += `${left + labelWidth} ${tableTop + rowHeight} m ${left + labelWidth} ${tableTop + rowHeight - totalRows * rowHeight} l S\n`;
  stream += `${left + tableWidth} ${tableTop + rowHeight} m ${left + tableWidth} ${tableTop + rowHeight - totalRows * rowHeight} l S\n`;

  stream += "0.06 0.09 0.16 rg\n";
  stream += pdfText("PROJECT INFORMATION", left + 7, tableTop + 10, 9, "F2");
  stream += pdfText("DETAILS", left + labelWidth + 7, tableTop + 10, 9, "F2");
  rows.forEach(([label, value], index) => {
    const y = tableTop - 20 - index * rowHeight;
    const isRatio = index === rows.length - 1;
    if (isRatio) stream += "0.16 0.26 0.18 rg\n";
    stream += pdfText(label, left + 7, y, 9, isRatio ? "F2" : "F1");
    stream += pdfText(value, left + labelWidth + 7, y, 9, isRatio ? "F2" : "F1");
    if (isRatio) stream += "0.06 0.09 0.16 rg\n";
  });

  stream += "0.39 0.45 0.55 rg\n" + pdfText("Parking per unit ratio = parking stalls divided by number of units.", left, 170, 8);

  const encoder = new TextEncoder();
  const objects = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objects[3] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> /XObject << /Logo 7 0 R >> >> /Contents 4 0 R >>`;
  objects[4] = `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}endstream`;
  objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[6] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  objects[7] = logoBytes;

  const chunks = [];
  let byteLength = 0;
  const appendText = (value) => {
    const bytes = encoder.encode(value);
    chunks.push(bytes);
    byteLength += bytes.length;
  };
  const appendBytes = (bytes) => {
    chunks.push(bytes);
    byteLength += bytes.length;
  };

  appendText("%PDF-1.4\n");
  const offsets = [0];
  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = byteLength;
    appendText(`${i} 0 obj\n`);
    if (i === 7) {
      appendText(`<< /Type /XObject /Subtype /Image /Width 371 /Height 345 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoBytes.length} >>\nstream\n`);
      appendBytes(logoBytes);
      appendText("\nendstream");
    } else {
      appendText(objects[i]);
    }
    appendText("\nendobj\n");
  }
  const xref = byteLength;
  appendText(`xref\n0 ${objects.length}\n0000000000 65535 f \n`);
  for (let i = 1; i < objects.length; i += 1) appendText(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  appendText(`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks, { type: "application/pdf" });
}

async function downloadPdf() {
  const button = document.getElementById("downloadPdf");
  const status = document.getElementById("downloadStatus");
  button.disabled = true;
  status.textContent = "Preparing PDF...";
  try {
    const url = URL.createObjectURL(await createPdf());
    const link = document.createElement("a");
    const fileName = valueOf("propertyName")
      .replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
    link.href = url;
    link.download = fileName ? `project-overview-${fileName}.pdf` : "project-overview.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = "PDF downloaded.";
    setTimeout(() => { status.textContent = ""; }, 3000);
  } catch (error) {
    status.textContent = "PDF could not be generated. Please try again.";
  } finally {
    button.disabled = false;
  }
}

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-numeric]")) formatNumericInput(event.target);
  if (FIELD_IDS.includes(event.target.id)) calculate();
});
document.addEventListener("focusin", (event) => {
  if (event.target.matches("[data-numeric]") && numeric(event.target.value) === 0) event.target.value = "";
});
document.addEventListener("focusout", (event) => {
  if (event.target.matches("[data-numeric]") && event.target.value.trim() === "") {
    event.target.value = "0";
    calculate();
  }
});
document.getElementById("downloadPdf").addEventListener("click", downloadPdf);
calculate();
