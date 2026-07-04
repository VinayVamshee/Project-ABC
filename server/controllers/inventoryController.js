import Inventory from "../models/Inventory.js";
import bwipjs from "bwip-js";

/* -----------------------------------------------------
   🆕 CREATE Inventory Item
----------------------------------------------------- */
export const createInventoryItem = async (req, res) => {
  try {
    const { fields, baseCostPrice } = req.body;

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required.",
      });
    }

    if (baseCostPrice == null || isNaN(baseCostPrice)) {
      return res.status(400).json({
        success: false,
        message: "Product Cost Price (baseCostPrice) is required.",
      });
    }

    const newItem = new Inventory({
      fields,
      baseCostPrice
    });

    await newItem.save();

    res.status(201).json({
      success: true,
      message: "Inventory item created successfully",
      data: newItem,
    });
  } catch (error) {
    console.error("Error creating inventory item:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating inventory item",
      error: error.message,
    });
  }
};

/* -----------------------------------------------------
   📋 GET ALL Inventory Items (with populate)
----------------------------------------------------- */
export const getAllInventoryItems = async (req, res) => {
  try {
    const items = await Inventory.find({ inStock: true })
      .populate("fields.fieldRef")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, items: items });
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching inventory items",
    });
  }
};

/* -----------------------------------------------------
   🔍 GET Single Inventory Item by ID
----------------------------------------------------- */
export const getInventoryItemById = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id).populate(
      "fields.fieldRef"
    );

    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Inventory item not found" });

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching inventory item",
    });
  }
};

/* -----------------------------------------------------
   ✏️ UPDATE Inventory Item
----------------------------------------------------- */
export const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { fields, baseCostPrice } = req.body;

    const updated = await Inventory.findByIdAndUpdate(
      id,
      { fields, ...(baseCostPrice != null && { baseCostPrice }) },
      { new: true }
    ).populate("fields.fieldRef");

    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "Inventory item not found" });

    res.status(200).json({
      success: true,
      message: "Inventory item updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating inventory item:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating inventory item",
    });
  }
};

/* -----------------------------------------------------
   ❌ DELETE Inventory Item
----------------------------------------------------- */
export const deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Inventory.findByIdAndUpdate(
      id,
      { inStock: false },
      { new: true }
    );

    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "Inventory item not found" });

    res.status(200).json({
      success: true,
      message: "Item marked as out of stock",
    });
  } catch (error) {
    console.error("Error marking item out of stock:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating inventory stock state",
    });
  }
};

export const getBarcodeImage = async (req, res) => {
  const { productID } = req.params;

  try {
    const png = await bwipjs.toBuffer({
      bcid: "code128",
      text: productID,
      scale: 4,        // 🔥 higher = sharper print
      height: 15,
      includetext: true,
      textxalign: "center",
    });

    res.set("Content-Type", "image/png");
    res.send(png);
  } catch (err) {
    res.status(500).json({ message: "Failed to generate barcode" });
  }
};