import Inventory from "../models/Inventory.js";
import BusinessContact from "../models/BusinessContact.js";
import bwipjs from "bwip-js";
import ExcelJS from "exceljs";

/* -----------------------------------------------------
   🆕 CREATE Inventory Item
----------------------------------------------------- */
export const createInventoryItem = async (req, res) => {
  try {
    const itemData = { ...req.body };

    if (itemData.baseCostPrice == null || isNaN(itemData.baseCostPrice)) {
      return res.status(400).json({
        success: false,
        message: "Product Cost Price (baseCostPrice) is required.",
      });
    }

    const newItem = new Inventory({
      ...itemData,
      inStock: itemData.inStock !== false,
      status: itemData.status || "in_stock",
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
   📥 BULK CREATE Inventory Items
----------------------------------------------------- */
export const createBulkInventoryItems = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items provided for bulk insertion.",
      });
    }

    const createdItems = [];
    for (const itemData of items) {
      const newItem = new Inventory({
        ...itemData,
        baseCostPrice: Number(itemData.baseCostPrice || 0),
        inStock: itemData.inStock !== false,
        status: itemData.status || "in_stock",
      });
      await newItem.save();
      createdItems.push(newItem);
    }

    res.status(201).json({
      success: true,
      message: `Successfully imported ${createdItems.length} inventory items.`,
      count: createdItems.length,
      items: createdItems,
    });
  } catch (error) {
    console.error("Error bulk creating inventory items:", error);
    res.status(500).json({
      success: false,
      message: "Server error during bulk inventory import",
      error: error.message,
    });
  }
};

/* -----------------------------------------------------
   📋 GET ALL Inventory Items
----------------------------------------------------- */
export const getAllInventoryItems = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    const skip = (page - 1) * limit;
    
    const search = req.query.search || "";
    const stockStatus = req.query.stockStatus;
    const category = req.query.category;
    const purity = req.query.purity;
    const minWeight = req.query.minWeight;
    const maxWeight = req.query.maxWeight;
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;
    
    // Sort
    const sortBy = req.query.sortBy || "recent";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    const sortOptions = {};
    if (sortBy === "netWeight") sortOptions.netWeight = sortOrder;
    else if (sortBy === "price") sortOptions.baseCostPrice = sortOrder;
    else if (sortBy === "name") sortOptions.productName = sortOrder;
    else sortOptions.createdAt = sortOrder; // recent

    const filter = {};
    
    // Stock Status
    if (stockStatus === "out_of_stock") filter.inStock = false;
    else if (stockStatus !== "all") filter.inStock = true;

    // Category
    if (category && category !== "All") filter.category = category;

    // Purity
    if (purity && purity !== "all") filter.purity = Number(purity);

    // Weights
    if (minWeight || maxWeight) {
      filter.netWeight = {};
      if (minWeight) filter.netWeight.$gte = Number(minWeight);
      if (maxWeight) filter.netWeight.$lte = Number(maxWeight);
    }

    // Price
    if (minPrice || maxPrice) {
      filter.baseCostPrice = {};
      if (minPrice) filter.baseCostPrice.$gte = Number(minPrice);
      if (maxPrice) filter.baseCostPrice.$lte = Number(maxPrice);
    }

    // Search
    if (search) {
      filter.$or = [
        { productID: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
        { productName: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } }
      ];
    }

    // Fetch Paginated Data & Aggregated Totals concurrently
    const [items, totalResult] = await Promise.all([
      Inventory.find(filter)
        .populate("wholeSellerId")
        .collation({ locale: "en", strength: 2 }) // For case-insensitive sorting by name
        .sort(sortOptions)
        .skip(skip)
        .limit(limit),
      
      Inventory.aggregate([
        { $match: filter },
        { 
          $group: { 
            _id: null, 
            totalGross: { $sum: "$grossWeight" }, 
            totalNet: { $sum: "$netWeight" }, 
            totalStone: { $sum: "$stoneWeight" }, 
            totalCost: { $sum: "$baseCostPrice" }, 
            count: { $sum: 1 },
            categories: { $addToSet: "$category" }
          } 
        }
      ])
    ]);

    const aggregates = totalResult[0] || { totalGross: 0, totalNet: 0, totalStone: 0, totalCost: 0, count: 0, categories: [] };
    const total = aggregates.count;

    res.status(200).json({ 
      success: true, 
      items,
      totals: {
        totalGross: aggregates.totalGross,
        totalNet: aggregates.totalNet,
        totalStone: aggregates.totalStone,
        totalCost: aggregates.totalCost
      },
      categories: aggregates.categories || [],
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching inventory items",
    });
  }
};

/* -----------------------------------------------------
   🔍 GET Single Inventory Item
----------------------------------------------------- */
export const getInventoryItemById = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id)
      .populate("wholeSellerId");

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
    
    // Using explicit properties
    const updateData = { ...req.body };
    delete updateData.productID; // prevent changing ID
    delete updateData._id;

    const updated = await Inventory.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).populate("wholeSellerId");

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

export const getQRCodeImage = async (req, res) => {
  const { productID } = req.params;

  try {
    const png = await bwipjs.toBuffer({
      bcid: "qrcode",
      text: productID,
      scale: 5,
    });

    res.set("Content-Type", "image/png");
    res.send(png);
  } catch (err) {
    res.status(500).json({ message: "Failed to generate QR code" });
  }
};

export const getBarcodeImage = getQRCodeImage;

/* -----------------------------------------------------
   📥 DOWNLOAD BULK IMPORT EXCEL TEMPLATE WITH DROPDOWNS
----------------------------------------------------- */
export const downloadBulkImportTemplate = async (req, res) => {
  try {
    const contacts = await BusinessContact.find({ categories: "Wholeseller" }).sort({ name: 1 });
    const wholesalerNames = contacts.map((c) => c.name).filter(Boolean);


    const categories = [
      "Necklace / హారం (Haram)",
      "Kasulaperu / కాసుల పేరు",
      "Guttapusalu / గుట్టపూసలు",
      "Kante / కంటె (Choker)",
      "Mangalsutra / నల్లపూసలు (Nallapusalu / పుస్తెల తాడు)",
      "Chain / గొలుసు (Golusu)",
      "Pendant / లాకెట్ (Locket / డాలర్)",
      "Earrings / బుట్టలు (Buttalu / Jhumkas)",
      "Champaswaralu / చెవి మాటీలు (Ear Chains)",
      "Bangles / గాజులు (Gajulu / Kadas)",
      "Vanki / వంకీ (Armlet / Bajuband)",
      "Waist Belt / వడ్డాణం (Vaddanam)",
      "Pattilu / పట్టీలు (Anklets / Payal)",
      "Mettelu / మెట్టెలు (Toe Rings)",
      "Mukkupudaka / ముక్కుపుడక (Nose Pin)",
      "Ring / ఉంగరం (Ungaram)",
      "Bracelet / బ్రాస్‌లెట్",
      "Gold Coin / Bar (బంగారు నాణెం / బిస్కెట్)",
      "Pooja Articles & Silver / వెండి పూజ సామాగ్రి",
      "Baby Jewellery / పిల్లల దిష్టి గాజులు / ఉయ్యాలలు",
      "Other Jewellery / ఇతర ఆభరణాలు",
    ];

    const metalTypes = ["Gold", "Rose Gold", "White Gold", "Dual Tone Gold", "Platinum", "Silver"];
    const purities = ["91.6 (22K)", "99.9 (24K)", "75.0 (18K)", "58.5 (14K)", "92.5 (Silver)"];
    const genders = ["Women", "Men", "Unisex", "Kids"];
    const occasions = [
      "Bridal / Wedding",
      "Daily & Traditional",
      "Festive",
      "Party / Evening",
      "Engagement",
      "Investment & Gifting",
    ];
    const purchaseTypes = ["Cash", "Credit", "Gold Exchange", "Other"];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ABC Business Console";
    workbook.created = new Date();

    // 1. MASTER LISTS SHEET
    const listSheet = workbook.addWorksheet("Lists_Data");
    listSheet.state = "hidden"; // Hide reference sheet for clean UX

    listSheet.getRow(1).values = [
      "Categories",
      "Wholesalers",
      "MetalTypes",
      "Purities",
      "Genders",
      "Occasions",
      "PurchaseTypes",
    ];

    const maxRows = Math.max(
      categories.length,
      wholesalerNames.length,
      metalTypes.length,
      purities.length,
      genders.length,
      occasions.length,
      purchaseTypes.length
    );

    for (let i = 0; i < maxRows; i++) {
      listSheet.addRow([
        categories[i] || "",
        wholesalerNames[i] || "",
        metalTypes[i] || "",
        purities[i] || "",
        genders[i] || "",
        occasions[i] || "",
        purchaseTypes[i] || "",
      ]);
    }

    // 2. MAIN TEMPLATE SHEET
    const ws = workbook.addWorksheet("Inventory_Import", {
      views: [{ showGridLines: true }],
    });

    ws.columns = [
      { header: "Product Name *", key: "productName", width: 38 },
      { header: "Category *", key: "category", width: 34 },
      { header: "Wholesaler / Supplier", key: "wholesaler", width: 28 },
      { header: "Metal Type", key: "metalType", width: 16 },
      { header: "Purity (%)", key: "purity", width: 15 },
      { header: "Gross Weight (g) *", key: "grossWeight", width: 18 },
      { header: "Stone Weight (g)", key: "stoneWeight", width: 16 },
      { header: "Other Weight (g)", key: "otherWeight", width: 16 },
      { header: "Net Weight (g)", key: "netWeight", width: 16 },
      { header: "Base Cost Price (₹) *", key: "baseCostPrice", width: 22 },
      { header: "Total Cost Price (₹)", key: "totalCostPrice", width: 22 },
      { header: "Purchase Type", key: "purchaseType", width: 16 },
      { header: "Gender", key: "gender", width: 14 },
      { header: "Occasion", key: "occasion", width: 22 },
      { header: "Stone Composition", key: "stoneComposition", width: 32 },
      { header: "Primary Image URL", key: "productImage", width: 36 },
      { header: "Notes", key: "notes", width: 34 },
    ];

    // Format Header Row
    const headerRow = ws.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" }, // Luxury Dark Slate
      };
      cell.font = {
        name: "Calibri",
        size: 11,
        bold: true,
        color: { argb: "FFF8FAFC" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF475569" } },
        bottom: { style: "medium", color: { argb: "FFC8A14B" } }, // Gold underline
      };
    });

    // Data Validation Rules for 500 rows
    const catRange = `Lists_Data!$A$2:$A$${categories.length + 1}`;
    const wsRange = wholesalerNames.length > 0 ? `Lists_Data!$B$2:$B$${wholesalerNames.length + 1}` : null;
    const metalRange = `Lists_Data!$C$2:$C$${metalTypes.length + 1}`;
    const purityRange = `Lists_Data!$D$2:$D$${purities.length + 1}`;
    const genderRange = `Lists_Data!$E$2:$E$${genders.length + 1}`;
    const occRange = `Lists_Data!$F$2:$F$${occasions.length + 1}`;
    const ptRange = `Lists_Data!$G$2:$G$${purchaseTypes.length + 1}`;

    for (let r = 2; r <= 500; r++) {
      const row = ws.getRow(r);
      row.height = 20;

      // Category Dropdown (Column B)
      ws.getCell(`B${r}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [catRange],
        errorStyle: "warning",
        errorTitle: "Invalid Category",
        error: "Please select a valid category from the dropdown list.",
      };

      // Wholesaler Dropdown (Column C)
      if (wsRange) {
        ws.getCell(`C${r}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [wsRange],
          errorStyle: "information",
          errorTitle: "Select Wholesaler",
          error: "Select a wholesaler from your ledger contacts.",
        };
      }

      // Metal Type Dropdown (Column D)
      ws.getCell(`D${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [metalRange],
      };

      // Purity Dropdown (Column E)
      ws.getCell(`E${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [purityRange],
      };

      // Purchase Type Dropdown (Column L)
      ws.getCell(`L${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [ptRange],
      };

      // Gender Dropdown (Column M)
      ws.getCell(`M${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [genderRange],
      };

      // Occasion Dropdown (Column N)
      ws.getCell(`N${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [occRange],
      };

      // Net Weight Formula (Column I): =IF(F{r}="","",MAX(0,F{r}-G{r}-H{r}))
      if (r > 6) {
        ws.getCell(`I${r}`).value = { formula: `IF(F${r}="","",MAX(0,F${r}-G${r}-H${r}))` };
      }
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="ABC_Inventory_Bulk_Import_Template.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate Excel template",
      error: error.message,
    });
  }
};