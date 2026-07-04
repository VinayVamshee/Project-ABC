import mongoose from "mongoose";
import Order from "../models/Order.js";
import Inventory from "../models/Inventory.js";

/**
 * Create an order from inventory
 * Body expects:
 * {
 *   inventoryId: "<inventoryObjectId>",
 *   productFields: [{ fieldRef, value }, ...], // editable product values
 *   orderFields: [{ fieldRef, value }, ...] // order/customer fields
 * }
 */
export const createOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            inventoryId,
            productFields = [],
            orderFields = [],
            buyingCostPrice = 0,   // ✅ READ IT
        } = req.body;

        const newOrder = new Order({
            productFields,
            orderFields,
            buyingCostPrice: Number(buyingCostPrice || 0), // ✅ SAVE IT
        });

        await newOrder.save({ session }); // IMPORTANT

        // Delete inventory item if coming from inventory
        if (inventoryId) {
            await Inventory.findByIdAndDelete(inventoryId, { session });
        }

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({ success: true, data: newOrder });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error creating order:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while creating order",
        });
    }
};

export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("productFields.fieldRef")
            .populate("orderFields.fieldRef")
            .sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: orders });
    } catch (error) {
        console.error("Error fetching orders:", error);
        return res.status(500).json({ success: false, message: "Server error while fetching orders" });
    }
};

export const getOrderById = async (req, res) => {
    try {
        const id = req.params.id;
        const order = await Order.findById(id)
            .populate("productFields.fieldRef")
            .populate("orderFields.fieldRef");
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });
        return res.status(200).json({ success: true, data: order });
    } catch (error) {
        console.error("Error fetching order:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export const updateOrder = async (req, res) => {
    try {
        const id = req.params.id;
        const updated = await Order.findByIdAndUpdate(id, req.body, { new: true })
            .populate("productFields.fieldRef")
            .populate("orderFields.fieldRef");
        if (!updated) return res.status(404).json({ success: false, message: "Order not found" });
        return res.status(200).json({ success: true, data: updated });
    } catch (error) {
        console.error("Error updating order:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export const deleteOrder = async (req, res) => {
    try {
        const id = req.params.id;
        await Order.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: "Order deleted" });
    } catch (error) {
        console.error("Error deleting order:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// export const sellOrder = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { sellingPrice, discount = 0, payments = [] } = req.body;

//     const order = await Order.findById(id);
//     if (!order) {
//       return res.status(404).json({ success: false, message: "Order not found" });
//     }

//     order.status = "sold";
//     order.sellingPrice = Number(sellingPrice);
//     order.discount = Number(discount);
//     order.payments = payments;

//     await order.save();

//     res.json({ success: true, order });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };