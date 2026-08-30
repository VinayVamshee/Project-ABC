import jsPDF from "jspdf";
import "jspdf-autotable";

export const generateInvoice = (soldItem) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(200, 161, 75); // Gold color
  doc.text("Aneesh Business Console", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Luxury Gold & Jewellery", 14, 28);
  doc.text(`Date: ${new Date(soldItem.soldAt || soldItem.createdAt).toLocaleDateString()}`, 14, 34);
  doc.text(`Invoice #: ${soldItem.billingID}`, 14, 40);

  // Line
  doc.setDrawColor(200, 161, 75);
  doc.setLineWidth(0.5);
  doc.line(14, 45, 196, 45);

  // Helper to get field labels
  const getLabel = (fieldRef) => {
    if (fieldRef && typeof fieldRef === 'object' && fieldRef.label) {
      return fieldRef.label;
    }
    return "Unknown";
  };

  // Product Details Table
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Product Details", 14, 55);

  const productData = (soldItem.productFields || []).map(f => [
    getLabel(f.fieldRef), 
    f.value || "N/A"
  ]);
  
  if (soldItem.productID) {
    productData.unshift(["Product ID", soldItem.productID]);
  }

  doc.autoTable({
    startY: 60,
    head: [["Detail", "Value"]],
    body: productData,
    theme: "striped",
    headStyles: { fillColor: [200, 161, 75] },
    styles: { cellPadding: 3, fontSize: 10 },
  });

  // Customer / Sold Details Table
  const nextY = doc.lastAutoTable.finalY + 15;
  doc.text("Customer & Sale Information", 14, nextY);

  const soldData = (soldItem.soldFields || []).map(f => [
    getLabel(f.fieldRef), 
    f.value || "N/A"
  ]);

  doc.autoTable({
    startY: nextY + 5,
    head: [["Detail", "Value"]],
    body: soldData,
    theme: "striped",
    headStyles: { fillColor: [200, 161, 75] },
    styles: { cellPadding: 3, fontSize: 10 },
  });

  // Financial Summary
  const finalY = doc.lastAutoTable.finalY + 15;
  doc.text("Financial Summary", 14, finalY);

  const financialData = [
    ["Selling Price", `Rs. ${soldItem.sellingPrice}`],
    ["Discount", `Rs. ${soldItem.discount}`],
    ["Final Price", `Rs. ${soldItem.finalPrice}`],
    ["Amount Paid", `Rs. ${soldItem.payments?.reduce((t, p) => t + Number(p.amount||0), 0) || 0}`],
    ["Payment Status", soldItem.paymentStatus.toUpperCase()],
  ];

  doc.autoTable({
    startY: finalY + 5,
    head: [["Description", "Amount"]],
    body: financialData,
    theme: "plain",
    headStyles: { fillColor: [245, 245, 245], textColor: [0,0,0] },
    styles: { cellPadding: 3, fontSize: 11, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { halign: 'right' }
    }
  });

  // Footer
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text("Thank you for your business!", 105, 280, { align: "center" });

  // Save the PDF
  doc.save(`Invoice_${soldItem.billingID}.pdf`);
};
