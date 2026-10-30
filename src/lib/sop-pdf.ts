import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { SOP_CATEGORY_LABEL, type Sop } from "./sop";
import { USER_LABEL } from "./types";

/*
  SOP -> PDF, entirely in the browser. The editor's HTML is walked node by node
  into pdfmake's document model, so the PDF has real, selectable text and
  working links rather than a screenshot of the page. Only the formats the
  editor can produce are handled; anything else falls back to its text.
*/

const INK = "#111111";
const MUTED = "#6b6b6b";
const RULE = "#d9d9d9";
const WELL = "#f3f3f3";
const LINK = "#1a56db";

type Marks = { bold?: boolean; italics?: boolean; underline?: boolean; strike?: boolean; code?: boolean; link?: string };
type Run = Record<string, unknown> & { text: string };

function runs(node: Node, marks: Marks = {}): Run[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (!text) return [];
    const decoration = [marks.underline || marks.link ? "underline" : null, marks.strike ? "lineThrough" : null].filter(Boolean);
    return [{
      text,
      ...(marks.bold && { bold: true }),
      ...(marks.italics && { italics: true }),
      ...(decoration.length && { decoration }),
      ...(marks.code && { background: WELL, fontSize: 9.5 }),
      ...(marks.link && { link: marks.link, color: LINK }),
    }];
  }
  if (!(node instanceof Element)) return [];
  const tag = node.tagName.toLowerCase();
  if (tag === "br") return [{ text: "\n" }];
  const next: Marks = { ...marks };
  if (tag === "strong" || tag === "b") next.bold = true;
  if (tag === "em" || tag === "i") next.italics = true;
  if (tag === "u") next.underline = true;
  if (tag === "s" || tag === "del" || tag === "strike") next.strike = true;
  if (tag === "code") next.code = true;
  if (tag === "a") {
    const href = node.getAttribute("href") ?? "";
    if (/^(https?:|mailto:)/i.test(href)) next.link = href;
  }
  return [...node.childNodes].flatMap((child) => runs(child, next));
}

/** A paragraph-like element as one text block; never empty, or pdfmake collapses the line. */
function paragraph(element: Element, extra: Record<string, unknown> = {}): Content {
  const text = runs(element);
  return { text: text.length ? text : " ", ...extra } as Content;
}

function checkbox(checked: boolean): Content {
  const box = { type: "rect", x: 0, y: 2, w: 8, h: 8, r: 1.5, lineWidth: 0.8, lineColor: checked ? INK : MUTED };
  const tick = { type: "polyline", lineWidth: 1.1, lineColor: INK, points: [{ x: 1.8, y: 6 }, { x: 3.5, y: 8 }, { x: 6.5, y: 3.8 }] };
  return { canvas: checked ? [box, tick] : [box], width: 14 } as Content;
}

function listItem(item: Element): Content {
  const content = blocks(item);
  return content.length === 1 ? content[0] : { stack: content };
}

function block(element: Element): Content | null {
  const tag = element.tagName.toLowerCase();
  switch (tag) {
    case "p":
      return paragraph(element, { margin: [0, 0, 0, 6] });
    case "h1":
    case "h2":
    case "h3":
      return paragraph(element, { style: tag });
    case "ul":
      if (element.getAttribute("data-type") === "taskList") {
        return {
          stack: [...element.children].map((item) => {
            const checked = item.getAttribute("data-checked") === "true";
            const body = item.querySelector(":scope > div") ?? item;
            return {
              columns: [checkbox(checked), { stack: blocks(body), width: "*", ...(checked && { color: MUTED }) }],
              columnGap: 2,
            };
          }),
          margin: [0, 0, 0, 6],
        } as Content;
      }
      return { ul: [...element.children].map(listItem), markerColor: MUTED, margin: [0, 0, 0, 6] } as Content;
    case "ol":
      return {
        ol: [...element.children].map(listItem),
        start: Number(element.getAttribute("start")) || 1,
        markerColor: MUTED,
        margin: [0, 0, 0, 6],
      } as Content;
    case "blockquote":
      return {
        table: { widths: ["*"], body: [[{ stack: blocks(element), color: "#3d3d3d", italics: true }]] },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: (i: number) => (i === 0 ? 2 : 0),
          vLineColor: () => RULE,
          paddingLeft: () => 10,
          paddingTop: () => 2,
          paddingBottom: () => 0,
        },
        margin: [0, 2, 0, 8],
      } as Content;
    case "pre":
      return {
        table: { widths: ["*"], body: [[{ text: element.textContent ?? "", fontSize: 9.5, preserveLeadingSpaces: true }]] },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          fillColor: () => WELL,
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 2, 0, 8],
      } as Content;
    case "hr":
      return { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.6, lineColor: RULE }], margin: [0, 8, 0, 10] } as Content;
    default:
      return element.textContent?.trim() ? paragraph(element, { margin: [0, 0, 0, 6] }) : null;
  }
}

function blocks(parent: Element): Content[] {
  const out: Content[] = [];
  for (const child of parent.childNodes) {
    if (child instanceof Element) {
      const content = block(child);
      if (content) out.push(content);
    } else if (child.textContent?.trim()) {
      out.push({ text: child.textContent, margin: [0, 0, 0, 6] });
    }
  }
  return out;
}

export function sopDocument(sop: Sop): TDocumentDefinitions {
  const body = new DOMParser().parseFromString(sop.content, "text/html").body;
  const edited = new Date(sop.updated_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  const content = blocks(body);
  return {
    info: { title: sop.title, author: USER_LABEL[sop.owner], subject: "Standard operating procedure" },
    pageSize: "A4",
    pageMargins: [40, 48, 40, 52],
    defaultStyle: { font: "Roboto", fontSize: 10.5, lineHeight: 1.3, color: INK },
    styles: {
      title: { fontSize: 20, bold: true, lineHeight: 1.15 },
      meta: { fontSize: 9, color: MUTED },
      h1: { fontSize: 16, bold: true, margin: [0, 10, 0, 6] },
      h2: { fontSize: 13.5, bold: true, margin: [0, 8, 0, 5] },
      h3: { fontSize: 11.5, bold: true, margin: [0, 6, 0, 4] },
    },
    content: [
      { text: sop.title, style: "title" },
      {
        text: `${SOP_CATEGORY_LABEL[sop.category]}  ·  Last edited by ${USER_LABEL[sop.updated_by]} on ${edited}`,
        style: "meta",
        margin: [0, 4, 0, 10],
      },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.6, lineColor: RULE }], margin: [0, 0, 0, 14] },
      ...(content.length ? content : [{ text: "This SOP has no content yet.", color: MUTED }]),
    ],
    footer: (page, pages) => ({
      columns: [
        { text: sop.title, color: MUTED, fontSize: 8 },
        { text: `${page} / ${pages}`, alignment: "right", color: MUTED, fontSize: 8, width: "auto" },
      ],
      margin: [40, 16, 40, 0],
    }),
  };
}

export function sopFileName(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return `${slug || "sop"}.pdf`;
}

/** pdfmake and its fonts are ~1 MB, so they load on the first download, not with the page. */
export async function downloadSopPdf(sop: Sop): Promise<void> {
  const [pdfModule, fontModule] = await Promise.all([import("pdfmake/build/pdfmake"), import("pdfmake/build/vfs_fonts")]);
  const pdfMake = ((pdfModule as { default?: unknown }).default ?? pdfModule) as typeof import("pdfmake/build/pdfmake");
  const vfs = ((fontModule as { default?: unknown }).default ?? fontModule) as Parameters<typeof pdfMake.addVirtualFileSystem>[0];
  pdfMake.addVirtualFileSystem(vfs);
  await pdfMake.createPdf(sopDocument(sop)).download(sopFileName(sop.title));
}
