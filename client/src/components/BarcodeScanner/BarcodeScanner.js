import { useBarcodeScanner } from "../../utils/useBarcodeScanner";
import { notify } from "../Toast/toast";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function BarcodeScanner() {
    const navigate = useNavigate();

    useBarcodeScanner(async (barcode) => {
        try {
            notify.info(`Scanned Barcode: ${barcode}. Searching...`);
            
            // Check if it's an inventory item
            const res = await api.get(`/inventory?search=${barcode}&limit=1`);
            
            if (res.data.success && res.data.items && res.data.items.length > 0) {
                const item = res.data.items[0];
                if (item.productID === barcode) {
                    notify.success(`Found item ${barcode}! Redirecting to sell...`);
                    // Redirect to inventory page with instruction to sell this item
                    navigate(`/inventory?action=sell&id=${item._id}`);
                    return;
                }
            }

            notify.error(`Item with barcode ${barcode} not found in inventory.`);
        } catch (error) {
            console.error("Barcode search error:", error);
            notify.error("Error searching for barcode");
        }
    });

    return null; // This component doesn't render anything visually
}
