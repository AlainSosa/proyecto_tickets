import { Download, FileText, Printer, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export interface QuickReportColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

interface QuickReportButtonProps<T> {
  title: string;
  rows: T[];
  columns: QuickReportColumn<T>[];
  disabled?: boolean;
}

export function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildReportTable<T>(rows: T[], columns: QuickReportColumn<T>[]) {
  if (!rows.length) {
    return '<p class="empty">No hay datos disponibles para este reporte.</p>';
  }

  return `
    <table>
      <thead>
        <tr>${columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                ${columns.map((column) => `<td>${escapeHtml(column.value(row))}</td>`).join('')}
              </tr>
            `,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

export function buildReportHeader(title: string, generatedAt = new Date().toLocaleString(), generatedBy?: string) {
  return `
    <header class="report-header">
      <div class="report-brand">
        <div class="report-mark">
          <span></span>
        </div>
        <div>
          <p class="report-kicker">Sistema de Gestión de Soporte Técnico</p>
          <h1>${escapeHtml(title)}</h1>
          <p class="report-subtitle">Embaixada do Brasil</p>
        </div>
      </div>
      <div class="report-meta">
        <span>Generado el</span>
        <strong>${escapeHtml(generatedAt)}</strong>
        ${generatedBy ? `<span class="report-user-label">Generado por</span><strong>${escapeHtml(generatedBy)}</strong>` : ''}
      </div>
    </header>
  `;
}

export function buildPrintableReportDocument(title: string, body: string, generatedBy?: string) {
  const generatedAt = new Date().toLocaleString();
  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 32px;
            color: #0f172a;
            font-family: Arial, Helvetica, sans-serif;
            background: #f8fafc;
          }
          .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 18mm;
            border-top: 6px solid #009739;
            background: #ffffff;
            box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
          }
          .report-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 30px;
            padding: 0 0 20px;
            border-bottom: 2px solid #e2e8f0;
          }
          .report-brand { display: flex; align-items: center; gap: 16px; min-width: 0; }
          .report-mark {
            display: flex;
            height: 46px;
            width: 46px;
            flex: 0 0 auto;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            background: linear-gradient(135deg, #009739, #002776);
          }
          .report-mark span {
            display: block;
            height: 18px;
            width: 18px;
            border-radius: 999px;
            background: #ffdf00;
            box-shadow: 0 0 0 5px rgba(255, 223, 0, 0.18);
          }
          .report-kicker {
            margin: 0 0 4px;
            color: #009739;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: .04em;
            text-transform: uppercase;
          }
          .report-subtitle { margin: 6px 0 0; color: #475569; font-size: 13px; }
          .report-meta {
            min-width: 145px;
            border-left: 4px solid #ffdf00;
            border-radius: 8px;
            background: #f8fafc;
            padding: 10px 12px;
            text-align: right;
          }
          .report-meta span { display: block; color: #64748b; font-size: 11px; text-transform: uppercase; }
          .report-meta strong { display: block; margin-top: 4px; color: #0f172a; font-size: 12px; line-height: 1.35; }
          .report-user-label { margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
          h1 { margin: 0 0 8px; font-size: 26px; color: #002776; }
          h2 { margin: 28px 0 12px; font-size: 18px; color: #002776; }
          p { margin: 0; line-height: 1.5; }
          .report-context {
            margin: 0 0 18px;
            border-left: 4px solid #002776;
            border-radius: 8px;
            background: #eff6ff;
            padding: 14px 16px;
            color: #334155;
            font-size: 13px;
          }
          .report-context p + p { margin-top: 6px; }
          .report-findings {
            margin: 18px 0 24px;
            border: 1px solid #dbeafe;
            border-radius: 8px;
            padding: 0 16px 14px;
            background: #ffffff;
          }
          .report-findings h2 { margin-top: 16px; }
          .report-findings ul { margin: 0; padding-left: 20px; color: #334155; }
          .report-findings li { margin: 7px 0; line-height: 1.45; }
          .meta { color: #475569; font-size: 13px; text-align: right; }
          .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            margin: 16px 0 24px;
          }
          .metric {
            border: 1px solid #e2e8f0;
            border-left: 4px solid #009739;
            border-radius: 8px;
            padding: 14px;
            background: #f8fafc;
          }
          .metric strong { display: block; font-size: 24px; color: #002776; }
          .metric span { color: #475569; font-size: 13px; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }
          th {
            background: #f1f5f9;
            color: #0f172a;
            font-size: 12px;
            text-align: left;
            text-transform: uppercase;
          }
          th, td { padding: 11px 12px; border-bottom: 1px solid #e2e8f0; overflow-wrap: anywhere; vertical-align: top; }
          td { font-size: 13px; color: #1e293b; }
          .empty {
            padding: 18px;
            border: 1px dashed #cbd5e1;
            border-radius: 8px;
            color: #64748b;
            background: #f8fafc;
          }
          .actions { margin-top: 28px; display: flex; gap: 10px; }
          button {
            border: 0;
            border-radius: 8px;
            padding: 10px 16px;
            color: #fff;
            background: #009739;
            cursor: pointer;
            font-weight: 700;
          }
          @media print {
            body { padding: 0; background: #fff; }
            .page { width: auto; min-height: auto; box-shadow: none; }
            .actions { display: none; }
            @page { size: A4; margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <main class="page">
          ${buildReportHeader(title, generatedAt, generatedBy)}
          ${body}
          <div class="actions">
            <button onclick="window.print()">Imprimir / Guardar PDF</button>
          </div>
        </main>
      </body>
    </html>
  `;
}

export function openPrintableReport(title: string, body: string, generatedBy?: string) {
  const reportHtml = buildPrintableReportDocument(title, body, generatedBy);

  const reportWindow = window.open('', '_blank');
  if (!reportWindow) return;

  reportWindow.document.open();
  reportWindow.document.write(reportHtml);
  reportWindow.document.close();
  reportWindow.focus();
}

export function QuickReportButton<T>({
  title,
  rows,
  columns,
  disabled,
}: QuickReportButtonProps<T>) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { user } = useAuth();
  const body = buildReportTable(rows, columns);
  const generatedBy = user ? `${user.name} (${user.email})` : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsPreviewOpen(true)}
        disabled={disabled}
        className="btn-secondary gap-2"
      >
        <FileText className="h-4 w-4" />
        Exportar PDF
      </button>
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4">
            <div className="flex w-[210mm] max-w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Vista previa</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{title}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => openPrintableReport(title, body, generatedBy)} className="btn-secondary gap-2">
                  <Download className="h-4 w-4" />
                  Descargar PDF
                </button>
                <button type="button" onClick={() => openPrintableReport(title, body, generatedBy)} className="btn-primary gap-2">
                  <Printer className="h-4 w-4" />
                  Imprimir
                </button>
                <button type="button" onClick={() => setIsPreviewOpen(false)} className="btn-secondary p-2">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mx-auto min-h-[297mm] w-[210mm] max-w-full overflow-hidden bg-white p-[18mm] text-slate-900 shadow-2xl">
              <ReportPreviewStyles />
              <div className="border-t-[6px] border-brand-600 pt-6">
                <div dangerouslySetInnerHTML={{ __html: buildReportHeader(title, undefined, generatedBy) }} />
                <div className="report-preview-content" dangerouslySetInnerHTML={{ __html: body }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ReportPreviewStyles() {
  return (
    <style>
      {`
        .report-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
        .report-brand { display: flex; align-items: center; gap: 16px; min-width: 0; }
        .report-mark { display: flex; height: 46px; width: 46px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 12px; background: linear-gradient(135deg, #009739, #002776); }
        .report-mark span { display: block; height: 18px; width: 18px; border-radius: 999px; background: #ffdf00; box-shadow: 0 0 0 5px rgba(255, 223, 0, 0.18); }
        .report-kicker { margin: 0 0 4px; color: #009739; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
        .report-header h1 { margin: 0; color: #002776; font-size: 26px; font-weight: 800; line-height: 1.15; }
        .report-subtitle { margin: 6px 0 0; color: #475569; font-size: 13px; }
        .report-meta { min-width: 145px; border-left: 4px solid #ffdf00; border-radius: 8px; background: #f8fafc; padding: 10px 12px; text-align: right; }
        .report-meta span { display: block; color: #64748b; font-size: 11px; text-transform: uppercase; }
        .report-meta strong { display: block; margin-top: 4px; color: #0f172a; font-size: 12px; line-height: 1.35; }
        .report-user-label { margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
        .report-preview-content h2 { margin: 28px 0 12px; color: #002776; font-size: 18px; font-weight: 700; }
        .report-preview-content p { margin: 0; line-height: 1.5; }
        .report-preview-content .report-context { margin-bottom: 18px; border-left: 4px solid #002776; border-radius: 8px; background: #eff6ff; padding: 14px 16px; color: #334155; font-size: 13px; }
        .report-preview-content .report-context p + p { margin-top: 6px; }
        .report-preview-content .report-findings { margin: 18px 0 24px; border: 1px solid #dbeafe; border-radius: 8px; padding: 0 16px 14px; }
        .report-preview-content .report-findings h2 { margin-top: 16px; }
        .report-preview-content .report-findings ul { margin: 0; padding-left: 20px; color: #334155; }
        .report-preview-content .report-findings li { margin: 7px 0; line-height: 1.45; }
        .report-preview-content .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 16px 0 24px; }
        .report-preview-content .metric { border: 1px solid #e2e8f0; border-left: 4px solid #009739; border-radius: 8px; padding: 14px; background: #f8fafc; }
        .report-preview-content .metric strong { display: block; color: #002776; font-size: 24px; font-weight: 700; }
        .report-preview-content .metric span { color: #475569; font-size: 13px; }
        .report-preview-content table { width: 100%; margin-top: 10px; border-collapse: collapse; border: 1px solid #e2e8f0; }
        .report-preview-content th { background: #f1f5f9; color: #0f172a; font-size: 12px; text-align: left; text-transform: uppercase; }
        .report-preview-content th, .report-preview-content td { padding: 11px 12px; border-bottom: 1px solid #e2e8f0; overflow-wrap: anywhere; vertical-align: top; }
        .report-preview-content td { color: #1e293b; font-size: 13px; }
        .report-preview-content .empty { padding: 18px; border: 1px dashed #cbd5e1; border-radius: 8px; color: #64748b; background: #f8fafc; }
      `}
    </style>
  );
}
