import { Invoice } from "@/shared/lib/indexedDB";

export interface InvoiceReceiptOptions {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeTaxNumber?: string;
  headerText?: string;
  footerText?: string;
  showLogo?: boolean;
  logoUrl?: string;
}

export class InvoiceReceiptGenerator {
  private static readonly PAPER_WIDTH = "80mm";
  private static readonly FONT_SIZE = "11px";

  /**
   * Generate thermal receipt HTML for invoice
   */
  public static generate(
    invoice: Invoice,
    options: InvoiceReceiptOptions = {}
  ): string {
    const {
      storeName = "MASR POS Pro",
      storeAddress = "",
      storePhone = "",
      storeTaxNumber = "",
      headerText = "",
      footerText = "شكراً لزيارتكم",
      showLogo = false,
      logoUrl = "",
    } = options;

    return `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          @page { 
            margin: 0; 
            size: ${this.PAPER_WIDTH} 297mm; 
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body { 
            margin: 0; 
            padding: 8px;
            font-family: 'Courier New', monospace;
            font-size: ${this.FONT_SIZE};
            width: ${this.PAPER_WIDTH};
            color: #000;
            background: #fff;
            direction: rtl;
          }
          
          .center { text-align: center; }
          .right { text-align: right; }
          .left { text-align: left; }
          .bold { font-weight: bold; }
          .large { font-size: 14px; }
          .xlarge { font-size: 16px; }
          
          .logo {
            text-align: center;
            margin-bottom: 8px;
          }
          
          .logo img {
            max-width: 120px;
            max-height: 60px;
          }
          
          .header {
            text-align: center;
            margin-bottom: 10px;
          }
          
          .header .store-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 4px;
          }
          
          .header .store-info {
            font-size: 10px;
            line-height: 1.4;
          }
          
          .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          
          .divider-solid {
            border-top: 1px solid #000;
            margin: 8px 0;
          }
          
          .divider-double {
            border-top: 3px double #000;
            margin: 8px 0;
          }
          
          .invoice-info {
            margin: 8px 0;
            font-size: 10px;
          }
          
          .invoice-info .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
            font-size: 10px;
          }
          
          .items-table th {
            border-bottom: 1px solid #000;
            padding: 4px 2px;
            text-align: center;
            font-weight: bold;
          }
          
          .items-table td {
            padding: 4px 2px;
            text-align: center;
          }
          
          .items-table .item-name {
            text-align: right;
          }
          
          .items-table .item-total {
            text-align: left;
          }
          
          .totals {
            margin: 8px 0;
            font-size: 11px;
          }
          
          .totals .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          
          .totals .total-row {
            font-size: 13px;
            font-weight: bold;
            margin-top: 4px;
            padding-top: 4px;
            border-top: 1px solid #000;
          }
          
          .payment-info {
            margin: 8px 0;
            font-size: 10px;
          }
          
          .payment-info .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          
          .footer {
            text-align: center;
            margin-top: 12px;
            font-size: 10px;
          }
          
          .qr-code {
            text-align: center;
            margin: 10px 0;
          }
          
          @media print {
            body { 
              padding: 8px;
            }
          }
        </style>
      </head>
      <body>
        ${
          showLogo && logoUrl
            ? `
          <div class="logo">
            <img src="${logoUrl}" alt="Logo">
          </div>
        `
            : ""
        }
        
        <div class="header">
          <div class="store-name">${storeName}</div>
          ${storeAddress ? `<div class="store-info">${storeAddress}</div>` : ""}
          ${
            storePhone
              ? `<div class="store-info">هاتف: ${storePhone}</div>`
              : ""
          }
          ${
            storeTaxNumber
              ? `<div class="store-info">الرقم الضريبي: ${storeTaxNumber}</div>`
              : ""
          }
          ${headerText ? `<div class="store-info">${headerText}</div>` : ""}
        </div>
        
        <div class="divider-solid"></div>
        
        <div class="center bold large">فاتورة ${
          invoice.paymentType === "cash"
            ? "نقدية"
            : invoice.paymentType === "credit"
            ? "آجلة"
            : "تقسيط"
        }</div>
        
        <div class="divider"></div>
        
        <div class="invoice-info">
          <div class="row">
            <span>رقم الفاتورة:</span>
            <span class="bold">${invoice.id}</span>
          </div>
          <div class="row">
            <span>التاريخ:</span>
            <span>${this.formatDate(invoice.createdAt)}</span>
          </div>
          <div class="row">
            <span>الوقت:</span>
            <span>${this.formatTime(invoice.createdAt)}</span>
          </div>
          ${
            invoice.customerName
              ? `
          <div class="row">
            <span>العميل:</span>
            <span class="bold">${invoice.customerName}</span>
          </div>
          `
              : ""
          }
          ${
            invoice.userName
              ? `
          <div class="row">
            <span>البائع:</span>
            <span>${invoice.userName}</span>
          </div>
          `
              : ""
          }
        </div>
        
        <div class="divider-solid"></div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 40%;">الصنف</th>
              <th style="width: 15%;">الكمية</th>
              <th style="width: 20%;">السعر</th>
              <th style="width: 25%;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items
              .map(
                (item) => `
              <tr>
                <td class="item-name">${item.productName}</td>
                <td>${item.quantity}${
                  item.unitName ? ` ${item.unitName}` : ""
                }</td>
                <td>${item.price.toFixed(2)}</td>
                <td class="item-total">${item.total.toFixed(2)}</td>
              </tr>
              ${
                item.priceTypeName
                  ? `
              <tr>
                <td colspan="4" class="item-name" style="font-size: 9px;">
                  نوع السعر: ${item.priceTypeName}
                </td>
              </tr>
              `
                  : ""
              }
            `
              )
              .join("")}
          </tbody>
        </table>
        
        <div class="divider-solid"></div>
        
        <div class="totals">
          <div class="row">
            <span>المجموع الفرعي:</span>
            <span>${invoice.subtotal.toFixed(2)} جنيه</span>
          </div>
          ${
            invoice.discount > 0
              ? `
          <div class="row" style="color: #000;">
            <span>الخصم:</span>
            <span>-${invoice.discount.toFixed(2)} جنيه</span>
          </div>
          `
              : ""
          }
          ${
            invoice.tax > 0
              ? `
          <div class="row">
            <span>ضريبة القيمة المضافة:</span>
            <span>${invoice.tax.toFixed(2)} جنيه</span>
          </div>
          `
              : ""
          }
          <div class="row total-row">
            <span>الإجمالي:</span>
            <span>${invoice.total.toFixed(2)} جنيه</span>
          </div>
        </div>
        
        <div class="divider-solid"></div>
        
        <div class="payment-info">
          ${
            invoice.paymentMethodIds && invoice.paymentMethodIds.length > 0
              ? `
            <div class="row bold">
              <span>طرق الدفع:</span>
              <span></span>
            </div>
            ${invoice.paymentMethodIds
              .map((pmId) => {
                const amount = invoice.paymentMethodAmounts?.[pmId] || 0;
                return `
                <div class="row">
                  <span>• طريقة الدفع</span>
                  <span>${amount.toFixed(2)} جنيه</span>
                </div>
              `;
              })
              .join("")}
          `
              : ""
          }
          <div class="row">
            <span>المدفوع:</span>
            <span class="bold">${invoice.paidAmount.toFixed(2)} جنيه</span>
          </div>
          ${
            invoice.remainingAmount > 0
              ? `
          <div class="row">
            <span>المتبقي:</span>
            <span class="bold">${invoice.remainingAmount.toFixed(2)} جنيه</span>
          </div>
          `
              : invoice.paidAmount > invoice.total
              ? `
          <div class="row">
            <span>الباقي للعميل:</span>
            <span class="bold">${(invoice.paidAmount - invoice.total).toFixed(
              2
            )} جنيه</span>
          </div>
          `
              : ""
          }
        </div>
        
        <div class="divider-double"></div>
        
        <div class="footer">
          <div class="bold">${footerText}</div>
          <div style="margin-top: 4px;">نتشرف بزيارتكم مرة أخرى</div>
        </div>
        
        <div style="height: 20px;"></div>
      </body>
      </html>
    `;
  }

  private static formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  private static formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }
}
