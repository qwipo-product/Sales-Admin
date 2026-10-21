// Reconstructed from common.89677fd41d0b0854.js (webpack chunk 592, module 4249, export "U").
// Thin wrapper over SheetJS (chunk 574 = xlsx@0.18.5 ESM build; exports used: utils (P6), writeFile (NC), read (ij)).
// Consumers: TaskListComponent, InteractionListComponent, InteractionSummaryDialogComponent (this feature) and
// the Attendance chunk 205. (PerformanceModule chunk 41 imports xlsx directly instead.)
import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root',
})
export class ExcelService {
  constructor() {}

  /** Writes `${fileName}.xlsx` with a single sheet built from an array of flat objects (keys = header row). */
  exportToExcel(data: any[], sheetName: string, fileName = 'exported-data') {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }

  /** NOTE: argument order is (sheetName, data) and the file name falls back to "exported-data". */
  downloadSampleUploadFile(sheetName: string, data: any[]) {
    this.exportToExcel(data, sheetName);
  }

  exportToExcelWithOptions(data: any[], options: { header: string[]; sheetName: string; fileName: string }) {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data, { header: options.header });
    XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName);
    XLSX.writeFile(workbook, `${options.fileName}.xlsx`);
  }

  exportToMultipleSheets(sheets: { sheetName: string; data: any[] }[], fileName = 'exported-data') {
    const workbook = XLSX.utils.book_new();
    sheets.forEach((sheet) => {
      const { sheetName, data } = sheet;
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }

  /** Reads the first sheet of an uploaded .xlsx/.xls/.csv File into JSON rows. */
  async readExcelData(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array', raw: true, cellFormula: false });
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
          resolve(rows);
        };
        reader.readAsArrayBuffer(file);
      } catch (error) {
        reject(error);
      }
    });
  }
}
