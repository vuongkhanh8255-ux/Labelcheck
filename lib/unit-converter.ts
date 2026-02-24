/**
 * Unit converter for cosmetics label compliance
 * Format: [value] [unit] ℮ [converted] [converted_unit]
 */

export function mlToFlOz(ml: number): number {
    return Math.round(ml * 0.033814 * 10) / 10;
}

export function gToOz(g: number): number {
    return Math.round(g * 0.035274 * 10) / 10;
}

export function formatVolumeLabel(value: string, unit: 'ml' | 'g'): string {
    const num = parseFloat(value);
    if (isNaN(num)) return '';

    if (unit === 'ml') {
        const flOz = mlToFlOz(num);
        return `${num} ml ℮ ${flOz} fl.oz`;
    } else {
        const oz = gToOz(num);
        return `${num} g ℮ ${oz} oz`;
    }
}

export function validateVolumeFormat(text: string): {
    valid: boolean;
    issue?: string;
} {
    // Check for space between number and unit
    const noSpacePattern = /\d(ml|g|fl\.oz|oz)(?!\w)/i;
    if (noSpacePattern.test(text)) {
        return { valid: false, issue: 'Thiếu khoảng cách giữa số và đơn vị (VD: "500 g" thay vì "500g")' };
    }

    // Check for ℮ symbol
    if (!text.includes('℮')) {
        return { valid: false, issue: 'Thiếu ký hiệu ℮ và giá trị quy đổi' };
    }

    return { valid: true };
}
