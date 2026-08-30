import Sold from "../models/Sold.js";
import Inventory from "../models/Inventory.js";
import Order from "../models/Order.js";
import BusinessContact from "../models/BusinessContact.js";
import mongoose from "mongoose";

// -----------------------------------------
// CREATE SOLD (Sell an item)
// -----------------------------------------
export const createSold = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      inventoryId,
      orderId,
      customerId,
      customerName,
      customerPhone,
      sellingPrice = 0,
      discount = 0,
      payments = [],
    } = req.body;

    let finalCustomerId = customerId;
    let basePrice = 0;

    // Validate Source
    if (inventoryId) {
      const invItem = await Inventory.findById(inventoryId).session(session);
      if (!invItem) {
        throw new Error("Inventory item not found");
      }
      basePrice = invItem.baseCostPrice || 0;
      invItem.inStock = false;
      await invItem.save({ session });
    } else if (orderId) {
      const order = await Order.findById(orderId).session(session);
      if (!order) {
        throw new Error("Order not found");
      }
      basePrice = order.buyingCostPrice || 0;
      order.status = "completed";
      await order.save({ session });
    } else {
      throw new Error("Sale must be linked to either Inventory or Order");
    }

    const finalPriceCalc = Math.max(Number(sellingPrice) - Number(discount), 0);
    const pointsEarned = Math.floor(finalPriceCalc * 0.001);

    // Handle Customer
    if (!finalCustomerId && (customerName || customerPhone)) {
      let customer = null;
      if (customerPhone) {
        customer = await BusinessContact.findOne({ phone: customerPhone }).session(session);
      }
      if (!customer && customerName) {
        customer = await BusinessContact.findOne({ name: customerName }).session(session);
      }
      if (customer) {
        finalCustomerId = customer._id;
        if (!customer.customerDetails) customer.customerDetails = {};
        if (!customer.categories.includes("Customer")) customer.categories.push("Customer");

        customer.customerDetails.loyaltyPoints = (customer.customerDetails.loyaltyPoints || 0) + pointsEarned;
        await customer.save({ session });
      } else {
        const newCustomer = new BusinessContact({
          name: customerName || "Unknown",
          phone: customerPhone || `UNKNOWN_${Date.now()}`,
          categories: ["Customer"],
          customerDetails: { loyaltyPoints: pointsEarned },
        });
        await newCustomer.save({ session });
        finalCustomerId = newCustomer._id;
      }
    } else if (finalCustomerId) {
       const customer = await BusinessContact.findById(finalCustomerId).session(session);
       if (customer) {
        if (!customer.customerDetails) customer.customerDetails = {};
        if (!customer.categories.includes("Customer")) customer.categories.push("Customer");

          customer.customerDetails.loyaltyPoints = (customer.customerDetails.loyaltyPoints || 0) + pointsEarned;
          await customer.save({ session });
       }
    }

    if (!finalCustomerId) {
      throw new Error("Customer information or ID is required");
    }

    const soldRecord = new Sold({
      inventoryId: inventoryId || null,
      orderId: orderId || null,
      customerId: finalCustomerId,
      inventoryPrice: basePrice,
      sellingPrice: Number(sellingPrice),
      discount: Number(discount),
      finalPrice: finalPriceCalc,
      payments: payments,
    });

    await soldRecord.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "Item sold successfully",
      data: soldRecord,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error selling item:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error while selling item",
    });
  }
};

// -----------------------------------------
// GET ALL SOLD ITEMS
// -----------------------------------------
export const getAllSoldItems = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    const skip = (page - 1) * limit;

    const { search, paymentStatus } = req.query;
    let filter = {};

    if (paymentStatus && paymentStatus !== "all") {
      filter.paymentStatus = paymentStatus;
    }
    if (search) {
      filter.billingID = { $regex: search, $options: "i" };
    }

    const items = await Sold.find(filter)
      .populate("inventoryId")
      .populate("orderId")
      .populate("customerId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Sold.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: items,
      pagination: { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching sold items:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -----------------------------------------
// GET SOLD ITEM BY ID
// -----------------------------------------
export const getSoldItemById = async (req, res) => {
  try {
    const item = await Sold.findById(req.params.id)
      .populate("inventoryId")
      .populate("orderId")
      .populate("customerId");

    if (!item) {
      return res.status(404).json({ success: false, message: "Sold record not found" });
    }
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error("Error fetching sold record:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -----------------------------------------
// ADD / UPDATE PAYMENT FOR SOLD ITEM
// -----------------------------------------
export const addPaymentToSold = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, mode, notes, reference, paidBy, recordedBy } = req.body;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ success: false, message: "Valid payment amount is required" });
    }

    const soldRecord = await Sold.findById(id);
    if (!soldRecord) {
      return res.status(404).json({ success: false, message: "Sold record not found" });
    }

    soldRecord.payments.push({
      amount: Number(amount),
      mode,
      notes,
      reference,
      paidBy,
      recordedBy,
      date: new Date(),
    });

    await soldRecord.save();

    res.status(200).json({
      success: true,
      message: "Payment recorded successfully",
      data: soldRecord,
    });
  } catch (error) {
    console.error("Error updating payment:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};