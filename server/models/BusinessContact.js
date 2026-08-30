import mongoose from "mongoose";

const businessContactSchema = new mongoose.Schema(
  {
    // =========================================================
    // IDENTITY
    // =========================================================
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    businessName: {
      type: String,
      trim: true,
      index: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },

    // =========================================================
    // CONTACT
    // =========================================================
    phone: {
      type: String,
      trim: true,
      index: true, // sparse unique index handled carefully below if needed, but going with plain index to allow missing
    },
    alternatePhone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    // =========================================================
    // ADDRESS
    // =========================================================
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },

    // =========================================================
    // CATEGORIES (Enum array)
    // =========================================================
    categories: [
      {
        type: String,
        enum: [
          "Customer",
          "Wholeseller",
          "Supplier",
          "Worker",
          "Financier",
          "Businessman",
          "Other",
        ],
      },
    ],

    // =========================================================
    // CUSTOMER DETAILS
    // =========================================================
    customerDetails: {
      dateOfBirth: { type: Date },
      anniversary: { type: Date },
      referralSource: { type: String, trim: true },
      customerSince: { type: Date, default: Date.now },
      loyaltyPoints: { type: Number, default: 0 }, // Preserving logic if needed
    },

    // =========================================================
    // WORKER DETAILS
    // =========================================================
    workerDetails: {
      workerType: {
        type: String,
        enum: [
          "Goldsmith",
          "Karigar",
          "Stone Setter",
          "Polisher",
          "Designer",
          "Helper",
          "Other",
        ],
      },
      specialization: { type: String, trim: true },
      joiningDate: { type: Date },
      paymentType: {
        type: String,
        enum: ["Per Piece", "Per Gram", "Daily", "Monthly", "Custom"],
      },
      defaultRate: { type: Number, min: 0 },
      status: { type: String, trim: true },
    },

    // =========================================================
    // SUPPLIER / WHOLESELLER DETAILS
    // =========================================================
    supplierDetails: {
      supplierType: {
        type: String,
        enum: [
          "Gold Supplier",
          "Jewellery Supplier",
          "Stone Supplier",
          "Mixed",
          "Other",
        ],
      },
      supplierCode: { type: String, trim: true },
      preferredPaymentMethod: {
        type: String,
        enum: ["Cash", "UPI", "Bank", "Gold Settlement", "Other"],
      },
      paymentTerms: {
        type: String,
        enum: ["Immediate", "Credit", "Custom"],
      },
    },

    // =========================================================
    // FINANCIER DETAILS
    // =========================================================
    financierDetails: {
      paymentMethod: { type: String, trim: true },
      interestArrangement: { type: String, trim: true },
      settlementTerms: { type: String, trim: true },
    },

    // =========================================================
    // GOVERNMENT / GENERAL
    // =========================================================
    gstNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    profileImage: { type: String, trim: true },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for fast searching and filtering
businessContactSchema.index({ categories: 1, status: 1 });

export default mongoose.model("BusinessContact", businessContactSchema);
