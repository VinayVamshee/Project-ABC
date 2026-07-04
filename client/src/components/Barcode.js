import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export default function Barcode({ value }) {
    const ref = useRef();

    useEffect(() => {
        if (value) {
            JsBarcode(ref.current, value, {
                format: "CODE128",
                width: 2,
                height: 40,
                displayValue: true,
            });
        }
    }, [value]);

    return <svg ref={ref}></svg>;
}