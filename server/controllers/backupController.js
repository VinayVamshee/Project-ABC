import exceljs from "exceljs";
import Inventory from "../models/Inventory.js";
import Sold from "../models/Sold.js";
import Order from "../models/Order.js";
import BusinessContact from "../models/BusinessContact.js";
import LedgerTransaction from "../models/LedgerTransaction.js";
import LedgerObligation from "../models/LedgerObligation.js";

export const generateFullBackup = async (req, res) => {
  try {
    const workbook = new exceljs.Workbook();
    
    // 1. Inventory
    const invSheet = workbook.addWorksheet("Inventory");
    invSheet.columns = [
      { header: "Product ID", key: "productID", width: 15 },
      { header: "Name", key: "productName", width: 25 },
      { header: "Category", key: "category", width: 15 },
      { header: "Purity", key: "purity", width: 10 },
      { header: "Gross Wt (g)", key: "grossWeight", width: 15 },
      { header: "Net Wt (g)", key: "netWeight", width: 15 },
      { header: "Stone Wt (g)", key: "stoneWeight", width: 15 },
      { header: "Cost Price (₹)", key: "baseCostPrice", width: 15 },
      { header: "In Stock?", key: "inStock", width: 10 }
    ];
    const inventory = await Inventory.find().lean();
    inventory.forEach(i => invSheet.addRow({
      productID: i.productID,
      productName: i.productName,
      category: i.category,
      purity: i.purity,
      grossWeight: i.grossWeight,
      netWeight: i.netWeight,
      stoneWeight: i.stoneWeight,
      baseCostPrice: i.baseCostPrice,
      inStock: i.inStock ? "Yes" : "No (Sold)"
    }));

    // 2. Sales
    const salesSheet = workbook.addWorksheet("Sales");
    salesSheet.columns = [
      { header: "Billing ID", key: "billingID", width: 15 },
      { header: "Date", key: "soldAt", width: 15 },
      { header: "Product", key: "productName", width: 25 },
      { header: "Type", key: "transactionType", width: 15 },
      { header: "Sold Weight (g)", key: "soldWeight", width: 15 },
      { header: "Sale Rate (₹/g)", key: "saleRate", width: 15 },
      { header: "Making Charges (₹)", key: "makingCharges", width: 18 },
      { header: "Total Amount (₹)", key: "totalAmount", width: 18 },
      { header: "Paid Amount (₹)", key: "paidAmount", width: 18 },
      { header: "Status", key: "paymentStatus", width: 15 }
    ];
    const sales = await Sold.find().populate("productId", "productName").lean();
    sales.forEach(s => salesSheet.addRow({
      billingID: s.billingID,
      soldAt: new Date(s.soldAt).toLocaleDateString(),
      productName: s.productId?.productName || "Unknown",
      transactionType: s.transactionType,
      soldWeight: s.soldWeight,
      saleRate: s.saleRate,
      makingCharges: s.makingCharges,
      totalAmount: s.totalAmount,
      paidAmount: s.paidAmount,
      paymentStatus: s.paymentStatus
    }));

    // 3. Orders
    const ordersSheet = workbook.addWorksheet("Orders");
    ordersSheet.columns = [
      { header: "Order ID", key: "orderID", width: 15 },
      { header: "Date", key: "orderDate", width: 15 },
      { header: "Order For", key: "orderFor", width: 20 },
      { header: "Category", key: "category", width: 15 },
      { header: "Est. Weight (g)", key: "estimatedWeight", width: 18 },
      { header: "Est. Cost (₹)", key: "estimatedCost", width: 15 },
      { header: "Advance (₹)", key: "advancePayment", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Delivery Date", key: "deliveryDate", width: 15 }
    ];
    const orders = await Order.find().lean();
    orders.forEach(o => ordersSheet.addRow({
      orderID: o.orderID,
      orderDate: new Date(o.orderDate).toLocaleDateString(),
      orderFor: o.orderFor,
      category: o.category,
      estimatedWeight: o.estimatedWeight,
      estimatedCost: o.estimatedCost,
      advancePayment: o.advancePayment,
      status: o.status,
      deliveryDate: o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : ""
    }));

    // 4. Contacts (People)
    const contactsSheet = workbook.addWorksheet("People");
    contactsSheet.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Business Name", key: "businessName", width: 25 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Categories", key: "categories", width: 25 },
      { header: "City", key: "city", width: 15 },
      { header: "Status", key: "status", width: 10 }
    ];
    const contacts = await BusinessContact.find().lean();
    contacts.forEach(c => contactsSheet.addRow({
      name: c.name,
      businessName: c.businessName || "-",
      phone: c.phone || "-",
      categories: c.categories?.join(", ") || "-",
      city: c.address?.city || "-",
      status: c.status
    }));

    // 5. Personal Ledger
    const ledgerSheet = workbook.addWorksheet("Ledger Transactions");
    ledgerSheet.columns = [
      { header: "Txn ID", key: "txnId", width: 12 },
      { header: "Date", key: "date", width: 15 },
      { header: "Type", key: "type", width: 15 },
      { header: "Provider", key: "provider", width: 20 },
      { header: "Receiver", key: "receiver", width: 20 },
      { header: "Asset Type", key: "assetType", width: 12 },
      { header: "Money (₹)", key: "money", width: 15 },
      { header: "Gold (g)", key: "gold", width: 15 },
      { header: "Status", key: "status", width: 10 }
    ];
    const txns = await LedgerTransaction.find()
      .populate("providerId", "name")
      .populate("receiverId", "name")
      .lean();
    
    txns.forEach(t => ledgerSheet.addRow({
      txnId: t.txnId,
      date: new Date(t.transactionDate).toLocaleDateString(),
      type: t.transactionType,
      provider: t.providerId?.name || "OWNER",
      receiver: t.receiverId?.name || "OWNER",
      assetType: t.assetType,
      money: t.assetType === "money" ? t.money?.amount : 0,
      gold: t.assetType === "gold" ? t.gold?.weight : 0,
      status: t.status
    }));

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=ABC_Full_Database_Backup_${new Date().toISOString().slice(0,10)}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Backup Error:", error);
    res.status(500).json({ success: false, message: "Backup generation failed" });
  }
};
