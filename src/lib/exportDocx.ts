import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  PageBreak,
} from "docx";
import { saveAs } from "file-saver";
import type { Plant } from "../types";
import { CATEGORY_LABELS, NON_PLANT_CATEGORIES } from "../types";
import { generateCareNotes, lightBandLabel, waterBandLabel } from "./careTips";
import { sdSuitability, SD_SUITABILITY_LABEL } from "./sanDiego";
import { metersToFeetLabel } from "./units";

interface DocMeta {
  clientName: string;
  propertyAddress: string;
  preparedBy: string;
  date: string;
}

function factRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        children: [new Paragraph(value)],
      }),
    ],
  });
}

const NO_BORDER = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

function plantSection(plant: Plant, isLast: boolean): (Paragraph | Table)[] {
  const isMaterial = NON_PLANT_CATEGORIES.has(plant.category);
  const nodes: (Paragraph | Table)[] = [];

  nodes.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 40 },
      children: [new TextRun({ text: plant.commonName, bold: true })],
    })
  );
  nodes.push(
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({ text: plant.botanicalName || "Botanical name not recorded", italics: true, color: "555555" }),
        new TextRun({ text: `   |   ${CATEGORY_LABELS[plant.category] ?? plant.category}`, color: "888888" }),
      ],
    })
  );

  if (isMaterial) {
    nodes.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: "Material / hardgood item -- included as a line item; no plant care requirements apply.",
            italics: true,
          }),
        ],
      })
    );
  } else {
    const rows: TableRow[] = [];
    rows.push(factRow("San Diego County Fit", SD_SUITABILITY_LABEL[sdSuitability(plant)]));
    rows.push(factRow("Light Needs", `${plant.lightText ?? "—"}${lightBandLabel(plant) ? ` (${lightBandLabel(plant)})` : ""}`));
    rows.push(factRow("Water Needs", `${plant.waterText ?? "—"}${waterBandLabel(plant) ? ` (${waterBandLabel(plant)})` : ""}`));
    rows.push(factRow("Mature Height", metersToFeetLabel(plant.heightMinM, plant.heightMaxM) ?? "—"));
    rows.push(factRow("Mature Width", metersToFeetLabel(plant.widthMinM, plant.widthMaxM) ?? "—"));
    if (plant.usdaZoneText) rows.push(factRow("USDA Zone", plant.usdaZoneText));
    if (plant.sunsetZoneText) rows.push(factRow("Sunset Zone", plant.sunsetZoneText));
    if (plant.caNative) rows.push(factRow("California Native", plant.caNative));
    if (plant.wucols) rows.push(factRow("WUCOLS Code", plant.wucols));

    nodes.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDER,
        rows,
      })
    );

    const notes = generateCareNotes(plant);
    if (notes.length) {
      nodes.push(
        new Paragraph({
          spacing: { before: 160, after: 40 },
          children: [new TextRun({ text: "Care Notes", bold: true })],
        })
      );
      notes.forEach((n) =>
        nodes.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [new TextRun(n)],
          })
        )
      );
    }

    if (plant.supplementalNotes) {
      nodes.push(
        new Paragraph({
          spacing: { before: 120 },
          children: [
            new TextRun({ text: "Notable uses: ", bold: true }),
            new TextRun(plant.supplementalNotes.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")),
          ],
        })
      );
    }
  }

  if (!isLast) {
    nodes.push(new Paragraph({ children: [new PageBreak()] }));
  }

  return nodes;
}

export async function exportCareDocumentDocx(plants: Plant[], meta: DocMeta) {
  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun("Plant Care Guide")],
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: "Prepared by KLR Build Teams", color: "666666" })],
    })
  );

  const metaRows: TableRow[] = [];
  if (meta.clientName) metaRows.push(factRow("Client", meta.clientName));
  if (meta.propertyAddress) metaRows.push(factRow("Property", meta.propertyAddress));
  if (meta.preparedBy) metaRows.push(factRow("Prepared By", meta.preparedBy));
  if (meta.date) metaRows.push(factRow("Date", meta.date));
  if (metaRows.length) {
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: NO_BORDER, rows: metaRows }));
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  plants.forEach((p, i) => {
    children.push(...plantSection(p, i === plants.length - 1));
  });

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  const fname = `${(meta.clientName || "KLR-Plant-Care-Guide").replace(/[^a-z0-9]+/gi, "-")}.docx`;
  saveAs(blob, fname);
}
