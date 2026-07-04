import Sold from "../models/Sold.js";
import Inventory from "../models/Inventory.js";
import Order from "../models/Order.js";
// -----------------------------------------
// CREATE SOLD (Sell an item)
// -----------------------------------------
export const createSold = async (req, res) => {
  try {
    const {
      inventoryId,
      productFields = [],
      soldFields = [],
      sellingPrice = 0,
      discount = 0,
      payments = [],
    } = req.body;

    const invItem = await Inventory.findById(inventoryId);
    if (!invItem) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    // ✅ cost = baseCostPrice from Inventory
    const inventoryPrice = Number(invItem.baseCostPrice || 0);

    const sold = new Sold({
      inventoryId,                // 🔗 connect
      productID: invItem.productID, // optional but useful
      productFields,
      soldFields,
      sellingPrice: Number(sellingPrice || 0),
      discount: Number(discount || 0),
      inventoryPrice,
      payments,
      // finalPrice, profit, paymentStatus → pre-save hook
    });

    await sold.save();

    // OPTIONAL: mark inventory item out of stock
    invItem.inStock = false;
    await invItem.save();

    return res.json({
      success: true,
      message: "Item sold successfully",
      sold,
    });
  } catch (error) {
    console.error("CREATE SOLD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create sold item",
      error: error.message,
    });
  }
};

// -----------------------------------------
// GET ALL SOLD ITEMS
// -----------------------------------------
export const getAllSold = async (req, res) => {
  try {
    const soldItems = await Sold.find()
      // 🔥 inventory product fields
      .populate("productFields.fieldRef")

      // 🔥 customer / sold fields
      .populate("soldFields.fieldRef")

      // 🔥 ORDER → bring orderFields also
      .populate({
        path: "orderId",
        populate: {
          path: "orderFields.fieldRef",
          model: "InputField",
        },
      })

      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      items: soldItems,
    });

  } catch (error) {
    console.error("GET ALL SOLD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sold items",
      error: error.message,
    });
  }
};

// -----------------------------------------
// GET SINGLE SOLD ITEM
// -----------------------------------------
export const getSoldById = async (req, res) => {
  try {
    const item = await Sold.findById(req.params.id)
      .populate("productFields.fieldRef")
      .populate("soldFields.fieldRef")
      .populate({
        path: "orderId",
        populate: {
          path: "orderFields.fieldRef",
          model: "InputField",
        },
      });

    if (!item) {
      return res.status(404).json({ success: false, message: "Sold not found" });
    }

    res.json({ success: true, item });

  } catch (error) {
    console.error("GET SOLD BY ID ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sold item",
    });
  }
};

export const addPaymentToSold = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, mode, reference, paidBy } = req.body;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const soldItem = await Sold.findById(id);
    if (!soldItem) {
      return res.status(404).json({
        success: false,
        message: "Sold item not found",
      });
    }

    soldItem.payments.push({
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      mode: mode || "cash",
      reference: reference || "",
      paidBy: paidBy || "customer",
    });

    await soldItem.save(); // 🔥 recalculates paymentStatus + profit in pre('save')

    res.status(200).json({
      success: true,
      message: "Payment added successfully",
      item: soldItem,
    });
  } catch (error) {
    console.error("Error adding payment to sold item:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding payment",
    });
  }
};

export const createSoldFromOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { sellingPrice, discount = 0, payments = [], soldFields = [] } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const sold = new Sold({
      orderId: order._id,                 // ✅ LINK ORDER
      inventoryId: null,

      productFields: [],                  // orders have no productFields
      soldFields,                         // ✅ REAL SOLD INPUTS

      sellingPrice: Number(sellingPrice || 0),
      discount: Number(discount || 0),
      inventoryPrice: Number(order.buyingCostPrice || 0),
      payments,
    });

    await sold.save();

    res.json({ success: true, sold });
  } catch (err) {
    console.error("SELL ORDER ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};