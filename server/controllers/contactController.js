import mongoose from "mongoose";
import BusinessContact from "../models/BusinessContact.js";

// ==========================================
// CREATE CONTACT
// ==========================================
export const createContact = async (req, res) => {
  try {
    const {
      name,
      businessName,
      contactPerson,
      phone,
      alternatePhone,
      email,
      address,
      city,
      state,
      pincode,
      categories,
      customerDetails,
      workerDetails,
      supplierDetails,
      financierDetails,
      gstNumber,
      panNumber,
      notes,
      tags,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const contact = new BusinessContact({
      name,
      businessName,
      contactPerson,
      phone,
      alternatePhone,
      email,
      address,
      city,
      state,
      pincode,
      categories: categories || ["Other"],
      customerDetails,
      workerDetails,
      supplierDetails,
      financierDetails,
      gstNumber,
      panNumber,
      notes,
      tags,
    });

    await contact.save();
    return res.status(201).json({ success: true, contact });
  } catch (error) {
    console.error("Error creating contact:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// GET ALL CONTACTS (with filters & pagination)
// ==========================================
export const getContacts = async (req, res) => {
  try {
    const { category, status, search, page = 1, limit = 50 } = req.query;

    const query = {};
    
    if (category && category !== "All") {
      query.categories = category;
    }
    
    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { businessName: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const contacts = await BusinessContact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    const total = await BusinessContact.countDocuments(query);

    return res.status(200).json({
      success: true,
      contacts,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==========================================
// SEARCH CONTACTS (Optimized for Dropdowns)
// ==========================================
export const searchContacts = async (req, res) => {
  try {
    const { q, category } = req.query;
    if (!q || q.length < 2) {
      return res.status(200).json({ success: true, contacts: [] });
    }

    const query = {
      $or: [
        { name: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
        { businessName: { $regex: q, $options: "i" } },
      ],
      status: "Active"
    };

    if (category) {
      query.categories = category;
    }

    const contacts = await BusinessContact.find(query)
      .select("_id name businessName phone categories")
      .limit(10)
      .lean();

    return res.status(200).json({ success: true, contacts });
  } catch (error) {
    console.error("Error searching contacts:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==========================================
// GET ONE CONTACT BY ID
// ==========================================
export const getContactById = async (req, res) => {
  try {
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid contact ID" });
    }
    const contact = await BusinessContact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }
    return res.status(200).json({ success: true, contact });
  } catch (error) {
    console.error("Error fetching contact:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==========================================
// UPDATE CONTACT
// ==========================================
export const updateContact = async (req, res) => {
  try {
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid contact ID" });
    }
    const updatedContact = await BusinessContact.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedContact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }

    return res.status(200).json({ success: true, contact: updatedContact });
  } catch (error) {
    console.error("Error updating contact:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// DELETE / DEACTIVATE CONTACT
// ==========================================
export const deleteContact = async (req, res) => {
  try {
    // Soft delete implementation
    const contact = await BusinessContact.findByIdAndUpdate(
      req.params.id,
      { status: "Inactive" },
      { new: true }
    );
    
    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }

    return res.status(200).json({ success: true, message: "Contact marked as Inactive", contact });
  } catch (error) {
    console.error("Error deleting contact:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
