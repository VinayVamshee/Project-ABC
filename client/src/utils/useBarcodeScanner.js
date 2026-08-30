import { useEffect } from "react";

export function useBarcodeScanner(onScan) {
    useEffect(() => {
        let barcode = "";
        let timeout = null;

        const handleKeyDown = (e) => {
            // Ignore if typing in an input field or textarea
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
                return;
            }

            if (timeout) {
                clearTimeout(timeout);
            }

            if (e.key === "Enter") {
                if (barcode.length > 3) {
                    onScan(barcode);
                }
                barcode = "";
                return;
            }

            // Only accept alphanumeric characters for the barcode
            if (e.key.length === 1 && /[a-zA-Z0-9_-]/.test(e.key)) {
                barcode += e.key;
            }

            // If the user types slowly, reset the string. Scanners are very fast (<50ms per stroke)
            timeout = setTimeout(() => {
                barcode = "";
            }, 100);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onScan]);
}
