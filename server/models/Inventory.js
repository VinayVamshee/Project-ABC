import mongoose from "mongoose";
import Counter from "./counterModel.js";
import "./BusinessContact.js";

const stoneSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 0,
    },
    weight: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      enum: ["ct", "g", "mg", "piece"],
      default: "ct",
    },
    quality: {
      type: String,
      trim: true,
    },
    shape: {
      type: String,
      trim: true,
    },
    certification: {
      type: String,
      trim: true,
    },
    value: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const inventorySchema = new mongoose.Schema(
  {
    // =========================================================
    // IDENTITY & BARCODE
    // =========================================================
    productID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    barcode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    // =========================================================
    // CLASSIFICATION
    // =========================================================
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    gender: {
      type: String,
      enum: ["Women", "Men", "Unisex", "Kids"],
      default: "Unisex",
    },

    occasion: {
      type: String,
      trim: true,
    },

    tags: {
      type: [String],
      default: [],
    },

    // =========================================================
    // METAL / GOLD INFORMATION
    // =========================================================
    metalType: {
      type: String,
      trim: true,
      default: "Gold",
    },

    purity: {
      type: mongoose.Schema.Types.Mixed,
      default: 91.6,
    },

    // =========================================================
    // WEIGHT INFORMATION (in grams)
    // =========================================================
    grossWeight: {
      type: Number,
      default: 0,
      min: 0,
    },

    stoneWeight: {
      type: Number,
      default: 0,
      min: 0,
    },

    otherWeight: {
      type: Number,
      default: 0,
      min: 0,
    },

    netWeight: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =========================================================
    // STONES
    // =========================================================
    stones: {
      type: [stoneSchema],
      default: [],
    },

    stoneComposition: {
      type: String,
      trim: true,
    },

    // =========================================================
    // PURCHASE & SUPPLIER DETAILS
    // =========================================================
    wholeSellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessContact",
      default: null,
      index: true,
    },

    purchaseDate: {
      type: Date,
      default: Date.now,
    },

    purchaseInvoiceNumber: {
      type: String,
      trim: true,
    },

    purchaseType: {
      type: String,
      enum: ["Cash", "Credit", "Gold Exchange", "Other"],
      default: "Cash",
    },

    purchaseGoldRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    goldValueAtPurchase: {
      type: Number,
      default: 0,
      min: 0,
    },

    purchaseMakingCharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    purchaseStoneCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    purchaseOtherCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =========================================================
    // COST
    // =========================================================
    baseCostPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    totalCostPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =========================================================
    // MEDIA (Primary & Multiple images only)
    // =========================================================
    productImage: {
      type: String,
      trim: true,
    },

    productImages: {
      type: [String],
      default: [],
    },

    // =========================================================
    // INVENTORY STATUS & NOTES (By default in stock)
    // =========================================================
    inStock: {
      type: Boolean,
      default: true,
      index: true,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// =============================================================
// INDEXES
// =============================================================
inventorySchema.index({ inStock: 1, createdAt: -1 });
inventorySchema.index({ category: 1, inStock: 1 });

// =============================================================
// AUTO-GENERATE PRODUCT ID & UNIQUE BARCODE
// =============================================================
inventorySchema.pre("validate", async function (next) {
  if (this.isNew) {
    try {
      if (!this.productID) {
        const counter = await Counter.findOneAndUpdate(
          { name: "inventory" },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );
        const nextNumber = counter.seq.toString().padStart(4, "0");
        this.productID = `PRD_${nextNumber}`;
      }

      if (!this.barcode) {
        const timestamp = Date.now().toString(36).toUpperCase();
        this.barcode = `BC_${this.productID}_${timestamp}`;
      }

      next();
    } catch (err) {
      console.error("❌ Error generating ProductID / Barcode:", err);
      next(err);
    }
  } else {
    if (!this.barcode && this.productID) {
      const timestamp = Date.now().toString(36).toUpperCase();
      this.barcode = `BC_${this.productID}_${timestamp}`;
    }
    next();
  }
});

export default mongoose.model("Inventory", inventorySchema);