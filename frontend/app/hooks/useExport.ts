import { useCallback } from 'react';
import * as XLSX from 'xlsx';

export interface ExportColumn {
  label: string;
  key: string;
}

export function useExport() {
  // Export to CSV
  const exportCSV = useCallback((data: any[], columns: ExportColumn[], filename = 'export.csv') => {
    const header = columns.map(col => col.label).join(',');
    const rows = data.map(row => columns.map(col => row[col.key]).join(','));
    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Export to Excel
  const exportExcel = useCallback((data: any[], columns: ExportColumn[], filename = 'export.xlsx') => {
    const ws = XLSX.utils.json_to_sheet(data.map(row => {
      const obj: any = {};
      columns.forEach(col => { obj[col.label] = row[col.key]; });
      return obj;
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, filename);
  }, []);

  // Enhanced styles for Word and PDF
  const tableStyle = `
    <style>
      table.export-table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px; }
      .export-table th, .export-table td { border: 1px solid #888; padding: 8px 12px; text-align: left; }
      .export-table th { background: #2563eb; color: #fff; font-weight: bold; }
      .export-table tr:nth-child(even) { background: #f3f4f6; }
    </style>
  `;

  // Export to Word (styled table)
  const exportWord = useCallback((data: any[], columns: ExportColumn[], filename = 'export.doc') => {
    let html = tableStyle + '<table class="export-table"><tr>' + columns.map(col => `<th>${col.label}</th>`).join('') + '</tr>';
    data.forEach(row => {
      html += '<tr>' + columns.map(col => `<td>${row[col.key] ?? ''}</td>`).join('') + '</tr>';
    });
    html += '</table>';
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Export to PDF (styled table, print dialog)
  const exportPDF = useCallback((data: any[], columns: ExportColumn[], filename = 'export.pdf') => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    let html = `<html><head><title>Export PDF</title>${tableStyle}</head><body>`;
    html += '<table class="export-table"><tr>' + columns.map(col => `<th>${col.label}</th>`).join('') + '</tr>';
    data.forEach(row => {
      html += '<tr>' + columns.map(col => `<td>${row[col.key] ?? ''}</td>`).join('') + '</tr>';
    });
    html += '</table></body></html>';
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    // Optionally, save as PDF using browser's print to PDF
  }, []);

  return { exportCSV, exportExcel, exportWord, exportPDF };
} 