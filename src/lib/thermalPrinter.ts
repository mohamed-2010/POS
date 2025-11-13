export interface PrinterInfo {
  name: string;
  displayName: string;
  description?: string;
  status: number;
  isDefault: boolean;
  options?: Record<string, any>;
}

export interface ThermalPrintOptions {
  printer?: string;
  copies?: number;
  paperWidth?: number; // 80mm default
  preview?: boolean;
}

export class ThermalPrinter {
  private static instance: ThermalPrinter;
  private selectedPrinter: string | null = null;

  private constructor() {}

  public static getInstance(): ThermalPrinter {
    if (!ThermalPrinter.instance) {
      ThermalPrinter.instance = new ThermalPrinter();
    }
    return ThermalPrinter.instance;
  }

  /**
   * Check if running in Electron
   */
  private isElectron(): boolean {
    return !!(window as any).electronAPI?.printer;
  }

  /**
   * Get list of available printers
   */
  public async getPrinters(): Promise<PrinterInfo[]> {
    if (this.isElectron()) {
      return await (window as any).electronAPI.printer.getPrinters();
    }
    return [];
  }

  /**
   * Set default printer
   */
  public setDefaultPrinter(printerName: string): void {
    this.selectedPrinter = printerName;
    localStorage.setItem("selectedPrinter", printerName);
  }

  /**
   * Get current selected printer
   */
  public getDefaultPrinter(): string | null {
    if (!this.selectedPrinter) {
      this.selectedPrinter = localStorage.getItem("selectedPrinter");
    }
    return this.selectedPrinter;
  }

  /**
   * Print thermal receipt
   */
  public async print(
    htmlContent: string,
    options: ThermalPrintOptions = {}
  ): Promise<void> {
    const printer = options.printer || this.getDefaultPrinter();

    if (!printer) {
      throw new Error("لم يتم تحديد طابعة. الرجاء اختيار طابعة من الإعدادات.");
    }

    const printOptions = {
      printer: printer,
      copies: options.copies || 1,
      paperWidth: options.paperWidth || 80,
    };

    if (this.isElectron()) {
      await (window as any).electronAPI.printer.print(
        htmlContent,
        printOptions
      );
    } else {
      // Fallback to browser print
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  }

  /**
   * Test printer connection
   */
  public async testPrint(printerName: string): Promise<boolean> {
    try {
      const testContent = this.generateTestReceipt();
      await this.print(testContent, { printer: printerName });
      return true;
    } catch (error) {
      console.error("Test print failed:", error);
      return false;
    }
  }

  /**
   * Generate test receipt
   */
  private generateTestReceipt(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { margin: 0; size: 80mm 297mm; }
          body { 
            margin: 0; 
            padding: 10px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 80mm;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          hr { border: 1px dashed #000; margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="center bold">اختبار الطابعة</div>
        <div class="center">MASR POS Pro</div>
        <hr>
        <div class="center">تم الاختبار بنجاح ✓</div>
        <div class="center">${new Date().toLocaleString("ar-EG")}</div>
        <hr>
        <div class="center">Test Print Successful</div>
      </body>
      </html>
    `;
  }
}

export const thermalPrinter = ThermalPrinter.getInstance();
