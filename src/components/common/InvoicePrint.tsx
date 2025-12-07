import { Invoice } from "@/shared/lib/indexedDB";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

interface InvoicePrintProps {
  invoice: Invoice;
  onClose: () => void;
}

export const InvoicePrint = ({ invoice, onClose }: InvoicePrintProps) => {
  const { getSetting } = useSettingsContext();
  const storeName = getSetting("storeName") || "نظام نقاط البيع";
  const storeAddress = getSetting("storeAddress") || "";
  const storePhone = getSetting("storePhone") || "";
  const currency = getSetting("currency") || "EGP";
  const taxNumber = getSetting("taxNumber") || "";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6" dir="rtl">
      <style>
        {`
          @media print {
            @page {
              size: 90mm auto;
              margin: 0;
            }
            
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }
            
            body * {
              visibility: hidden;
            }
            
            .invoice-print-container,
            .invoice-print-container * {
              visibility: visible !important;
            }
            
            .invoice-print-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 90mm;
              background: white !important;
            }
            
            .print-hide {
              display: none !important;
            }
            
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color: black !important;
              background: white !important;
            }
          }
        `}
      </style>

      <div className="max-w-md mx-auto">
        {/* Action Buttons - Hidden on Print */}
        <div className="print-hide flex justify-center gap-3 mb-6">
          <Button onClick={handlePrint} size="lg" className="gap-2">
            <Printer className="h-5 w-5" />
            طباعة
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <X className="h-5 w-5" />
            إغلاق
          </Button>
        </div>

        {/* Invoice Container */}
        <div
          className="invoice-print-container bg-white"
          style={{
            width: "90mm",
            margin: "0 auto",
            padding: "5mm",
            fontFamily: "Arial, sans-serif",
            fontSize: "12px",
            lineHeight: "1.4",
            color: "#000",
          }}
        >
          {/* Header */}
          <div
            style={{
              textAlign: "center",
              borderBottom: "2px solid #000",
              paddingBottom: "8px",
              marginBottom: "10px",
            }}
          >
            <h1
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                margin: "0 0 5px 0",
                color: "#000",
              }}
            >
              {storeName}
            </h1>
            {storeAddress && (
              <p style={{ margin: "2px 0", fontSize: "11px", color: "#000" }}>
                {storeAddress}
              </p>
            )}
            {storePhone && (
              <p style={{ margin: "2px 0", fontSize: "11px", color: "#000" }}>
                ت: {storePhone}
              </p>
            )}
            {taxNumber && (
              <p style={{ margin: "2px 0", fontSize: "10px", color: "#000" }}>
                الرقم الضريبي: {taxNumber}
              </p>
            )}
          </div>

          {/* Invoice Info */}
          <div
            style={{
              marginBottom: "10px",
              fontSize: "11px",
              borderBottom: "1px dashed #000",
              paddingBottom: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "3px",
              }}
            >
              <span style={{ fontWeight: "600", color: "#000" }}>
                رقم الفاتورة:
              </span>
              <span style={{ fontWeight: "bold", color: "#000" }}>
                #{invoice.id}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "3px",
              }}
            >
              <span style={{ color: "#000" }}>التاريخ:</span>
              <span style={{ color: "#000" }}>
                {new Date(invoice.createdAt).toLocaleDateString("ar-EG")}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "3px",
              }}
            >
              <span style={{ color: "#000" }}>الوقت:</span>
              <span style={{ color: "#000" }}>
                {new Date(invoice.createdAt).toLocaleTimeString("ar-EG")}
              </span>
            </div>
            {invoice.customerName && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "3px",
                }}
              >
                <span style={{ color: "#000" }}>العميل:</span>
                <span style={{ fontWeight: "600", color: "#000" }}>
                  {invoice.customerName}
                </span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ color: "#000" }}>الموظف:</span>
              <span style={{ color: "#000" }}>{invoice.userName}</span>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ marginBottom: "10px" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "11px",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderTop: "2px solid #000",
                    borderBottom: "2px solid #000",
                    backgroundColor: "#fff",
                  }}
                >
                  <th
                    style={{
                      textAlign: "right",
                      padding: "5px 2px",
                      fontWeight: "bold",
                      color: "#000",
                    }}
                  >
                    الصنف
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "5px 2px",
                      width: "15%",
                      fontWeight: "bold",
                      color: "#000",
                    }}
                  >
                    الكمية
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "5px 2px",
                      width: "25%",
                      fontWeight: "bold",
                      color: "#000",
                    }}
                  >
                    السعر
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "5px 2px",
                      width: "25%",
                      fontWeight: "bold",
                      color: "#000",
                    }}
                  >
                    الإجمالي
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom: "1px dashed #ccc",
                    }}
                  >
                    <td
                      style={{
                        padding: "5px 2px",
                        textAlign: "right",
                        color: "#000",
                      }}
                    >
                      <div style={{ fontWeight: "500", color: "#000" }}>
                        {item.productName}
                      </div>
                      {item.unitName && (
                        <div
                          style={{
                            fontSize: "9px",
                            color: "#666",
                            fontStyle: "italic",
                          }}
                        >
                          ({item.unitName})
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "5px 2px",
                        textAlign: "center",
                        fontWeight: "600",
                        color: "#000",
                      }}
                    >
                      {item.quantity}
                    </td>
                    <td
                      style={{
                        padding: "5px 2px",
                        textAlign: "center",
                        fontSize: "10px",
                        color: "#000",
                      }}
                    >
                      {item.price.toFixed(2)}
                    </td>
                    <td
                      style={{
                        padding: "5px 2px",
                        textAlign: "left",
                        fontWeight: "bold",
                        color: "#000",
                      }}
                    >
                      {item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div
            style={{
              borderTop: "2px solid #000",
              paddingTop: "8px",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
                fontSize: "12px",
              }}
            >
              <span style={{ color: "#000" }}>المجموع الفرعي:</span>
              <span style={{ fontWeight: "600", color: "#000" }}>
                {invoice.subtotal.toFixed(2)} {currency}
              </span>
            </div>

            {invoice.discount > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                  fontSize: "11px",
                }}
              >
                <span style={{ color: "#000" }}>الخصم:</span>
                <span style={{ fontWeight: "600", color: "#000" }}>
                  - {invoice.discount.toFixed(2)} {currency}
                </span>
              </div>
            )}

            {invoice.tax > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                  fontSize: "11px",
                }}
              >
                <span style={{ color: "#000" }}>الضريبة:</span>
                <span style={{ fontWeight: "600", color: "#000" }}>
                  {invoice.tax.toFixed(2)} {currency}
                </span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "8px",
                paddingTop: "8px",
                borderTop: "2px solid #000",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              <span style={{ color: "#000" }}>الإجمالي:</span>
              <span style={{ color: "#000" }}>
                {invoice.total.toFixed(2)} {currency}
              </span>
            </div>

            {invoice.paidAmount > 0 && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "6px",
                    fontSize: "12px",
                    paddingTop: "6px",
                    borderTop: "1px dashed #000",
                  }}
                >
                  <span style={{ fontWeight: "600", color: "#000" }}>
                    المدفوع:
                  </span>
                  <span style={{ fontWeight: "bold", color: "#000" }}>
                    {invoice.paidAmount.toFixed(2)} {currency}
                  </span>
                </div>

                {invoice.remainingAmount > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "4px",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ fontWeight: "600", color: "#000" }}>
                      المتبقي:
                    </span>
                    <span style={{ fontWeight: "bold", color: "#000" }}>
                      {invoice.remainingAmount.toFixed(2)} {currency}
                    </span>
                  </div>
                )}

                {invoice.paidAmount > invoice.total && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "4px",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ fontWeight: "600", color: "#000" }}>
                      الباقي للعميل:
                    </span>
                    <span style={{ fontWeight: "bold", color: "#000" }}>
                      {(invoice.paidAmount - invoice.total).toFixed(2)}{" "}
                      {currency}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Payment Status */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "10px",
              paddingBottom: "10px",
              borderBottom: "1px dashed #000",
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "5px 15px",
                border: "2px solid #000",
                borderRadius: "5px",
                fontSize: "12px",
                fontWeight: "bold",
                color: "#000",
              }}
            >
              {invoice.paymentStatus === "paid"
                ? "مدفوعة بالكامل"
                : invoice.paymentStatus === "partial"
                ? "مدفوعة جزئياً"
                : "غير مدفوعة"}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              paddingTop: "10px",
              borderTop: "2px solid #000",
              fontSize: "11px",
            }}
          >
            <p
              style={{
                margin: "0 0 5px 0",
                fontWeight: "bold",
                fontSize: "13px",
                color: "#000",
              }}
            >
              شكراً لتعاملكم معنا
            </p>
            <p
              style={{
                margin: "0 0 5px 0",
                fontSize: "10px",
                color: "#000",
              }}
            >
              نتمنى أن نكون عند حسن ظنكم دائماً
            </p>
            <div
              style={{
                marginTop: "8px",
                paddingTop: "5px",
                borderTop: "1px dashed #000",
              }}
            >
              <p
                style={{
                  margin: "0",
                  fontSize: "9px",
                  color: "#666",
                }}
              >
                {new Date().toLocaleString("ar-EG")}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Below Invoice */}
        <div className="print-hide flex justify-center gap-4 mt-8">
          <Button onClick={handlePrint} size="lg" className="gap-2 px-8">
            <Printer className="h-5 w-5" />
            طباعة
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            size="lg"
            className="gap-2 px-8"
          >
            <X className="h-5 w-5" />
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
};
