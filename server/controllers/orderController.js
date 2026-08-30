import mongoose from "mongoose";
import Order from "../models/Order.js";
import Inventory from "../models/Inventory.js";

/**
 * Create an order from inventory
 */
export const createOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            inventoryId,
            customerId,
            orderFor,
            orderedTo,
            orderedAddress,
            homeDelivery,
            modelImage,
            workerId,
            goldGivenToWorker,
            goldPurity,
            buyingCostPrice
        } = req.body;

        const newOrder = new Order({
            customerId,
            orderFor,
            orderedTo,
            orderedAddress,
            homeDelivery,
            modelImage,
            workerId,
            goldGivenToWorker: Number(goldGivenToWorker || 0),
            goldPurity: Number(goldPurity || 0),
            buyingCostPrice: Number(buyingCostPrice || 0),
            sourceInventoryId: inventoryId || null
        });

        await newOrder.save({ session });

        // Soft-delete inventory item if coming from inventory
        if (inventoryId) {
            await Inventory.findByIdAndUpdate(inventoryId, { inStock: false }, { session });
        }

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: newOrder
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error creating order:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

export const getAllOrders = async (req, res) => {
    try {
        const { status, search } = req.query;
        let filter = {};
        if (status && status !== 'all') {
            filter.status = status;
        }
        
        if (search) {
            filter.$or = [
                { orderID: { $regex: search, $options: "i" } },
                { orderFor: { $regex: search, $options: "i" } },
                { orderedTo: { $regex: search, $options: "i" } }
            ];
        }

        const orders = await Order.find(filter)
            .populate("customerId")
            .populate("workerId")
            .populate("sourceInventoryId")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("customerId")
            .populate("workerId")
            .populate("sourceInventoryId");

        if (!order) return res.status(404).json({ success: false, message: "Order not found" });
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updated = await Order.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        ).populate("customerId").populate("workerId");

        if (!updated) return res.status(404).json({ success: false, message: "Order not found" });

        res.status(200).json({ success: true, message: "Order status updated", data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const deleteOrder = async (req, res) => {
    try {
        const deleted = await Order.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: "Order not found" });
        res.status(200).json({ success: true, message: "Order deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};