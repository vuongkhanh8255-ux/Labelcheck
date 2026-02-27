export type LabelType = '>20ml' | '<20ml';

export type CheckStatus = 'pass' | 'fail' | 'warning' | 'pending';

export type CheckItemStatus = 'ok' | 'error' | 'warning' | 'skipped';

export interface Brand {
    id: string;
    name: string;
    logoUrl: string;
    qrCodeUrl: string;
    registeredCompanyName: string;
    address: string;
    phone: string;
    website: string;
    color: string;
}

export interface CheckItem {
    id: string;
    field: string;
    expected: string;
    found: string;
    status: CheckItemStatus;
    note: string;
    accepted?: boolean;
    acceptedBy?: string;
    acceptedAt?: string;
    region?: { x: number; y: number; w: number; h: number }; // % of image
}

export interface BarcodeCheckResult {
    scanability: number; // 0-100
    colorStatus: CheckItemStatus;
    colorNote: string;
    detectedColor: string;
    expectedColor: string;
    width: number; // cm
    height: number; // cm
    widthStatus: CheckItemStatus;
    heightStatus: CheckItemStatus;
    quietZoneStatus: CheckItemStatus;
    quietZoneNote: string;
    comparisonStatus: CheckItemStatus;
    comparisonNote: string;
}

export interface CheckSession {
    id: string;
    productName: string;
    brandId: string;
    brandName: string;
    labelType: LabelType;
    volume: string;
    volumeFormatted: string;
    status: CheckStatus;
    createdAt: string;
    checkedBy: string;
    labelFileUrl?: string;
    hscbFileUrl?: string;
    barcodeFileUrl?: string;
    barcodeResult?: BarcodeCheckResult;
    contentItems: CheckItem[];
    totalErrors: number;
    totalWarnings: number;
    totalOk: number;
}

export interface CheckFormData {
    labelType: LabelType | null;
    brandId: string;
    productName: string;
    volume: string;
    unit: 'ml' | 'g';
    labelFile: File | null;
    hscbFile: File | null;
    barcodeFile: File | null;
}
