import InputField from "../models/InputField.js";

// ✅ Create new input field
export const createInputField = async (req, res) => {
  try {
    const { label, type, numberSubType, fileType, selectOptions, showIn } = req.body;

    // Check if label already exists
    const exists = await InputField.findOne({ label: label.trim() });
    if (exists) {
      return res.status(400).json({ success: false, message: "Field label already exists" });
    }

    const newField = new InputField({
      label: label.trim(),
      type,
      numberSubType,
      fileType,
      selectOptions,
      showIn,
    });

    await newField.save();

    return res.status(201).json({ success: true, data: newField });
  } catch (error) {
    console.error("Error creating input field:", error);
    res.status(500).json({ success: false, message: "Server error while creating field" });
  }
};

// ✅ Get all input fields
export const getAllInputFields = async (req, res) => {
  try {
    const fields = await InputField.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, fields });
  } catch (error) {
    console.error("Error fetching input fields:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching fields",
    });
  }
};

// ✅ Update existing input field
export const updateInputField = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedField = await InputField.findByIdAndUpdate(id, req.body, {
      new: true, // return the updated doc
      runValidators: true,
    });

    if (!updatedField) {
      return res.status(404).json({
        success: false,
        message: "Input field not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Field updated successfully",
      field: updatedField,
    });
  } catch (error) {
    console.error("Error updating field:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating input field",
    });
  }
};

// ✅ Update select options (add, edit, delete)
export const updateSelectOptions = async (req, res) => {
  try {
    const { fieldId } = req.params;
    const { options } = req.body;

    const field = await InputField.findById(fieldId);
    if (!field) {
      return res.status(404).json({ success: false, message: "Field not found" });
    }

    if (field.type !== "select") {
      return res.status(400).json({ success: false, message: "Not a select field" });
    }

    field.selectOptions = options;
    await field.save();

    res.status(200).json({ success: true, data: field });
  } catch (error) {
    console.error("Error updating select options:", error);
    res.status(500).json({ success: false, message: "Error updating select options" });
  }
};

// ✅ Delete input field
export const deleteInputField = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await InputField.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Field not found" });
    }

    res.status(200).json({ success: true, message: "Field deleted successfully" });
  } catch (error) {
    console.error("Error deleting field:", error);
    res.status(500).json({ success: false, message: "Error deleting field" });
  }
};
