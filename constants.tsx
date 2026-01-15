import React from "react";

export const UNITS = [
    { label: "Kg", value: "Kg", factor: 1000 }, // to grams
    { label: "Lb", value: "Lb", factor: 453.59 }, // to grams
    { label: "Lt", value: "Lt", factor: 1000 }, // to ml
    { label: "Und", value: "Und", factor: 1 },
    { label: "Gr", value: "Gr", factor: 1 },
    { label: "Ml", value: "Ml", factor: 1 },
    { label: "Oz", value: "Oz", factor: 29.57 }, // to ml
];

// Helper to calculate cost
export const calculateItemCost = (
    boughtPrice: number,
    boughtQty: number,
    boughtUnit: string,
    useQty: number,
    useUnit: string
): number => {
    if (!boughtQty || !boughtPrice || !useQty) return 0;

    const bUnit = UNITS.find(u => u.value === boughtUnit);
    const uUnit = UNITS.find(u => u.value === useUnit);

    if (!bUnit || !uUnit) return 0;

    // Normalize to base unit (grams/ml/unit)
    const boughtBase = boughtQty * bUnit.factor;
    const useBase = useQty * uUnit.factor;

    // Avoid division by zero
    if (boughtBase === 0) return 0;

    const costPerBaseUnit = boughtPrice / boughtBase;
    return costPerBaseUnit * useBase;
};

// Formatter
export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(amount);
};
