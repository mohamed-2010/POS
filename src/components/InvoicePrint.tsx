import { Invoice, Product } from "@/lib/indexedDB";
import { useSettingsContext } from "@/contexts/SettingsContext";

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
    <>
      {/* زر الطباعة - يظهر فقط على الشاشة */}
      <div className="print:hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-bold mb-4 text-center">
            معاينة الفاتورة
          </h2>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              طباعة
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>

      {/* محتوى الفاتورة للطباعة */}
      <div
        className="fixed inset-0 bg-white flex items-center justify-center print:block print:static"
        dir="rtl"
      >
        <style>
          {`
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              
              body {
                margin: 0 !important;
                padding: 0 !important;
                font-family: 'Cairo', 'Arial', sans-serif;
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
              }
              
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
            
            @media screen {
              .invoice-print-container {
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                border-radius: 8px;
                overflow: hidden;
              }
            }
          `}
        </style>

        <div
          className="invoice-print-container"
          style={{
            width: "80mm",
            padding: "10mm 5mm",
            margin: "0 auto",
            fontSize: "11px",
            lineHeight: "1.4",
            backgroundColor: "white",
          }}
        >
          {/* Header */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "10px",
              borderBottom: "2px solid #000",
              paddingBottom: "8px",
              backgroundColor: "#f8f9fa",
              padding: "8px",
              borderRadius: "4px 4px 0 0",
            }}
          >
            <h1
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                margin: "0 0 6px 0",
                color: "#1a1a1a",
              }}
            >
              {storeName}
            </h1>
            {storeAddress && (
              <p style={{ margin: "2px 0", fontSize: "10px", color: "#666" }}>
                📍 {storeAddress}
              </p>
            )}
            {storePhone && (
              <p style={{ margin: "2px 0", fontSize: "10px", color: "#666" }}>
                📞 {storePhone}
              </p>
            )}
            {taxNumber && (
              <p style={{ margin: "2px 0", fontSize: "9px", color: "#888" }}>
                الرقم الضريبي: {taxNumber}
              </p>
            )}
          </div>

          {/* Invoice Info */}
          <div
            style={{
              marginBottom: "8px",
              fontSize: "10px",
              backgroundColor: "#000000",
              padding: "6px",
              borderRadius: "4px",
              border: "1px dashed #daa520",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "3px",
                alignItems: "center",
              }}
            >
              <span style={{ color: "#ffffff" }}>رقم الفاتورة:</span>
              <strong style={{ fontSize: "12px", color: "#ffffff" }}>
                #{invoice.id}
              </strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "3px",
              }}
            >
              <span style={{ color: "#ffffff" }}>التاريخ:</span>
              <span style={{ fontSize: "9px", color: "#ffffff" }}>
                {new Date(invoice.createdAt).toLocaleString("ar-EG")}
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
                <span style={{ color: "#ffffff" }}>العميل:</span>
                <span style={{ fontWeight: "600", color: "#ffffff" }}>
                  {invoice.customerName}
                </span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "3px",
              }}
            >
              <span style={{ color: "#ffffff" }}>الموظف:</span>
              <span style={{ color: "#ffffff" }}>{invoice.userName}</span>
            </div>
          </div>

          {/* Items Table */}
          <div
            style={{
              marginBottom: "8px",
              borderTop: "2px solid #000",
              paddingTop: "8px",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "10px",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "2px solid #000000",
                    backgroundColor: "#000000",
                    color: "#ffffff",
                  }}
                >
                  <th
                    style={{
                      textAlign: "right",
                      padding: "5px 2px",
                      fontWeight: "bold",
                    }}
                  >
                    المنتج
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "5px 2px",
                      width: "15%",
                      fontWeight: "bold",
                    }}
                  >
                    الكمية
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "5px 2px",
                      width: "20%",
                      fontWeight: "bold",
                    }}
                  >
                    السعر
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "5px 2px",
                      width: "20%",
                      fontWeight: "bold",
                    }}
                  >
                    المجموع
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom: "1px dotted #ddd",
                      backgroundColor: index % 2 === 0 ? "#000000" : "#1a1a1a",
                      color: "#ffffff",
                    }}
                  >
                    <td style={{ padding: "6px 2px", textAlign: "right" }}>
                      <span style={{ fontWeight: "500" }}>
                        {item.productName}
                      </span>
                      {item.unitName && (
                        <span
                          style={{
                            fontSize: "9px",
                            color: "#999999",
                            fontStyle: "italic",
                          }}
                        >
                          {" "}
                          ({item.unitName})
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "6px 2px",
                        textAlign: "center",
                        fontWeight: "600",
                        color: "#ffffff",
                      }}
                    >
                      {item.quantity}
                    </td>
                    <td
                      style={{
                        padding: "6px 2px",
                        textAlign: "center",
                        fontSize: "9px",
                      }}
                    >
                      {item.price.toFixed(2)}
                    </td>
                    <td
                      style={{
                        padding: "6px 2px",
                        textAlign: "left",
                        fontWeight: "bold",
                        color: "#ffffff",
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
              marginBottom: "8px",
              backgroundColor: "#000000",
              padding: "8px",
              borderRadius: "4px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
                fontSize: "11px",
              }}
            >
              <span style={{ color: "#ffffff" }}>المجموع الفرعي:</span>
              <span style={{ fontWeight: "600", color: "#ffffff" }}>
                {invoice.subtotal.toFixed(2)} {currency}
              </span>
            </div>

            {invoice.tax > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                  fontSize: "10px",
                }}
              >
                <span style={{ color: "#ffffff" }}>الضريبة:</span>
                <span style={{ fontWeight: "600", color: "#ffffff" }}>
                  {invoice.tax.toFixed(2)} {currency}
                </span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "6px",
                paddingTop: "6px",
                borderTop: "2px solid #000",
                fontSize: "15px",
                fontWeight: "bold",
                backgroundColor: "#1f2937",
                color: "white",
                padding: "6px 8px",
                borderRadius: "4px",
              }}
            >
              <span>الإجمالي:</span>
              <span>
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
                    fontSize: "11px",
                    backgroundColor: "#000000",
                    padding: "4px 6px",
                    borderRadius: "3px",
                  }}
                >
                  <span style={{ fontWeight: "600", color: "#ffffff" }}>
                    المدفوع:
                  </span>
                  <span style={{ color: "#ffffff", fontWeight: "bold" }}>
                    {invoice.paidAmount.toFixed(2)} {currency}
                  </span>
                </div>

                {invoice.remainingAmount > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "4px",
                      fontSize: "11px",
                      backgroundColor: "#fee2e2",
                      padding: "4px 6px",
                      borderRadius: "3px",
                    }}
                  >
                    <span style={{ fontWeight: "600" }}>المتبقي:</span>
                    <span style={{ color: "#ffffff", fontWeight: "bold" }}>
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
                      fontSize: "11px",
                      backgroundColor: "#dbeafe",
                      padding: "4px 6px",
                      borderRadius: "3px",
                    }}
                  >
                    <span style={{ fontWeight: "600" }}>الباقي للعميل:</span>
                    <span style={{ color: "#2563eb", fontWeight: "bold" }}>
                      {(invoice.paidAmount - invoice.total).toFixed(2)}{" "}
                      {currency}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Payment Methods */}
          {invoice.paymentMethodIds && invoice.paymentMethodIds.length > 1 && (
            <div
              style={{
                marginBottom: "8px",
                fontSize: "10px",
                backgroundColor: "#000000",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #000000",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  marginBottom: "6px",
                  color: "#000000",
                  fontSize: "11px",
                }}
              >
                💳 طرق الدفع المستخدمة:
              </div>
              {invoice.paymentMethodIds.map((methodId, index) => {
                const amount = invoice.paymentMethodAmounts?.[methodId] || 0;
                return (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "3px",
                      paddingBottom: "3px",
                      borderBottom: "1px dashed #000000",
                      backgroundColor: "#000000",
                    }}
                  >
                    <span style={{ color: "#ffffff" }}>
                      • طريقة {index + 1}
                    </span>
                    <span style={{ fontWeight: "600", color: "#ffffff" }}>
                      {amount.toFixed(2)} {currency}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Payment Status */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "10px",
              fontSize: "11px",
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "6px 16px",
                borderRadius: "20px",
                backgroundColor: "#000000",
                color: "white",
                fontWeight: "bold",
                fontSize: "12px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              {invoice.paymentStatus === "paid"
                ? "✓ مدفوعة بالكامل"
                : invoice.paymentStatus === "partial"
                ? "⊙ مدفوعة جزئياً"
                : "✗ غير مدفوعة"}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              marginTop: "12px",
              paddingTop: "10px",
              borderTop: "2px solid #000",
              fontSize: "11px",
              backgroundColor: "#f8f9fa",
              padding: "10px",
              borderRadius: "0 0 4px 4px",
            }}
          >
            <p
              style={{
                margin: "0 0 6px 0",
                fontWeight: "600",
                fontSize: "12px",
                color: "#1a1a1a",
              }}
            >
              ✨ شكراً لتعاملكم معنا ✨
            </p>
            <p style={{ margin: "0 0 4px 0", fontSize: "10px", color: "#666" }}>
              نتمنى أن نكون عند حسن ظنكم دائماً
            </p>
            <div
              style={{
                marginTop: "6px",
                paddingTop: "6px",
                borderTop: "1px dashed #ccc",
              }}
            >
              <p style={{ margin: "0", fontSize: "9px", color: "#999" }}>
                📅 تم الطباعة: {new Date().toLocaleString("ar-EG")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
