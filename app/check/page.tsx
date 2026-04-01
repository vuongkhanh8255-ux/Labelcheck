'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Brand, CheckFormData, LabelType } from '@/types';
import { formatVolumeLabel } from '@/lib/unit-converter';
import { ensureImageFile, compressImage } from '@/lib/pdf-to-image';
import { saveCheckSession } from '@/lib/check-history';
import { decodeBarcodeFromFile } from '@/lib/barcode-scanner';
import { ChevronRight, ChevronLeft, Upload, X, Check, Package, Building2, FileText, Barcode, Bot, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

const STEPS = ['Loại nhãn', 'Thương hiệu', 'Tải file & Nhập liệu', 'Xem lại'];

function StepIndicator({ current }: { current: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '40px' }}>
            {STEPS.map((label, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <div className={`step-dot ${i < current ? 'completed' : i === current ? 'active' : 'inactive'}`}>
                            {i < current ? <Check size={14} /> : i + 1}
                        </div>
                        <span style={{
                            fontSize: '11px',
                            color: i === current ? 'var(--accent-orange)' : i < current ? 'var(--accent-green)' : 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                        }}>
                            {label}
                        </span>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div style={{
                            flex: 1,
                            height: '1px',
                            background: i < current ? 'var(--accent-green)' : 'var(--border)',
                            margin: '0 8px',
                            marginBottom: '20px',
                            transition: 'background 0.3s ease',
                        }} />
                    )}
                </div>
            ))}
        </div>
    );
}

function FileUploadZone({
    label, accept, file, onFile, icon: Icon, hint
}: {
    label: string;
    accept: string;
    file: File | null;
    onFile: (f: File | null) => void;
    icon: React.ElementType;
    hint: string;
}) {
    const [drag, setDrag] = useState(false);

    return (
        <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                {label}
            </label>
            {file ? (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: 'var(--accent-green-glow)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '10px',
                }}>
                    <Check size={16} color="var(--accent-green)" />
                    <span style={{ flex: 1, fontSize: '13px', color: 'var(--accent-green)', fontWeight: 500 }}>{file.name}</span>
                    <button onClick={() => onFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <label
                    className={`upload-zone ${drag ? 'drag-over' : ''}`}
                    style={{ display: 'block', cursor: 'pointer' }}
                    onDragOver={e => { e.preventDefault(); setDrag(true); }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={e => {
                        e.preventDefault();
                        setDrag(false);
                        const f = e.dataTransfer.files[0];
                        if (f) onFile(f);
                    }}
                >
                    <input
                        type="file"
                        accept={accept}
                        style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
                    />
                    <Icon size={24} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Kéo thả hoặc click để chọn file
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{hint}</div>
                </label>
            )}
        </div>
    );
}

function AnalyzingOverlay({ productName }: { productName: string }) {
    const [currentStep, setCurrentStep] = useState(0);
    const analyzeSteps = [
        'Đang tải ảnh nhãn lên...',
        '🟠 GPT-4o đang nhận diện văn bản...',
        '🔵 Gemini đang nhận diện văn bản...',
        'Đối chiếu thông tin với HSCB...',
        'Kiểm tra từ ngữ cấm và chính tả...',
        'Phân tích mã vạch và hình ảnh...',
        '🟠🔵 Hai AI đang dò chéo kết quả...',
        'Tổng hợp kết quả kiểm tra...',
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentStep(s => (s + 1) % analyzeSteps.length);
        }, 2500);
        return () => clearInterval(interval);
    }, [analyzeSteps.length]);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
        }}>
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '24px',
                padding: '48px',
                maxWidth: '480px',
                width: '90%',
                textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border)',
            }}>
                {/* Scanning animation */}
                <div className="scanning-animation" style={{
                    width: '80px',
                    height: '80px',
                    margin: '0 auto 24px',
                    position: 'relative',
                }}>
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #F97316, #EA580C)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'pulse-glow 2s ease-in-out infinite',
                    }}>
                        <Bot size={36} color="white" />
                    </div>
                    <div style={{
                        position: 'absolute',
                        inset: '-8px',
                        borderRadius: '50%',
                        border: '3px solid transparent',
                        borderTopColor: '#F97316',
                        animation: 'spin 1.5s linear infinite',
                    }} />
                    <div style={{
                        position: 'absolute',
                        inset: '-16px',
                        borderRadius: '50%',
                        border: '2px solid transparent',
                        borderBottomColor: '#EA580C',
                        animation: 'spin-reverse 2s linear infinite',
                    }} />
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    🔍 AI đang phân tích nhãn
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    {productName}
                </p>

                {/* Progress steps */}
                <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                    {analyzeSteps.map((stepText, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '6px 0',
                            opacity: i <= currentStep ? 1 : 0.3,
                            transition: 'opacity 0.3s ease',
                        }}>
                            <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                flexShrink: 0,
                                background: i < currentStep
                                    ? 'var(--accent-green)'
                                    : i === currentStep
                                        ? 'var(--accent-orange)'
                                        : 'var(--border)',
                                color: i <= currentStep ? 'white' : 'var(--text-muted)',
                            }}>
                                {i < currentStep ? <Check size={10} /> : i === currentStep ? <Loader2 size={10} className="spin" /> : (i + 1)}
                            </div>
                            <span style={{
                                fontSize: '13px',
                                color: i === currentStep ? 'var(--accent-orange)' : i < currentStep ? 'var(--accent-green)' : 'var(--text-muted)',
                                fontWeight: i === currentStep ? 600 : 400,
                            }}>
                                {stepText}
                            </span>
                        </div>
                    ))}
                </div>

                <div style={{
                    padding: '10px 16px',
                    background: 'var(--accent-orange-glow)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--accent-orange)',
                    fontWeight: 500,
                }}>
                    ⏳ Quá trình phân tích mất khoảng 15-30 giây...
                </div>
            </div>
        </div>
    );
}

export default function CheckPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [form, setForm] = useState<CheckFormData>({
        labelType: null,
        brandId: '',
        productName: '',
        volume: '',
        unit: 'ml',
        labelFile: null,
        hscbFile: null,
        barcodeFile: null,
        barcodeRef: '',
    });
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loadingBrands, setLoadingBrands] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Barcode scanning states
    const [labelBarcodeNumber, setLabelBarcodeNumber] = useState<string | null>(null);
    const [refBarcodeNumber, setRefBarcodeNumber] = useState<string | null>(null);
    const [scanningLabelBarcode, setScanningLabelBarcode] = useState(false);
    const [scanningRefBarcode, setScanningRefBarcode] = useState(false);

    const [labelBarcodeManual, setLabelBarcodeManual] = useState(''); // Manual fallback when ZXing fails

    // HSCB extraction states
    const [extractingHscb, setExtractingHscb] = useState(false);
    const [hscbExtracted, setHscbExtracted] = useState<{ productName: string; volume: string; volumeUnit: string; intendedUse?: string; ingredients?: string; confidence: string } | null>(null);
    const [hscbExtractError, setHscbExtractError] = useState<string | null>(null);

    // Label extraction states (OCR from label image)
    const [extractingLabel, setExtractingLabel] = useState(false);
    const [labelExtracted, setLabelExtracted] = useState<{ productName: string; volume: string; volumeUnit: string; intendedUse?: string; ingredients?: string; confidence: string } | null>(null);
    const [labelExtractError, setLabelExtractError] = useState<string | null>(null);

    // Auto-scan barcode + extract text when label image is uploaded
    const handleLabelFileChange = async (f: File | null) => {
        setForm(x => ({ ...x, labelFile: f }));
        setLabelBarcodeNumber(null);
        setLabelExtracted(null);
        setLabelExtractError(null);
        if (f) {
            // Scan barcode
            setScanningLabelBarcode(true);
            try {
                const imageFile = await ensureImageFile(f);
                const detected = await decodeBarcodeFromFile(imageFile);
                setLabelBarcodeNumber(detected);
            } catch (err) {
                console.warn('Label barcode scan failed:', err);
            } finally {
                setScanningLabelBarcode(false);
            }

            // Extract product name & volume from label via OCR
            setExtractingLabel(true);
            try {
                // Convert PDF to separate page images for better OCR quality
                const { pdfToPages, isPdf } = await import('@/lib/pdf-to-image');
                const fd = new FormData();
                if (isPdf(f)) {
                    const pages = await pdfToPages(f, 2);
                    for (let i = 0; i < pages.length; i++) {
                        const compressed = await compressImage(pages[i], 2000, 0.8);
                        fd.append('labelPages', compressed);
                    }
                } else {
                    const compressed = await compressImage(f, 2000, 0.8);
                    fd.append('labelPages', compressed);
                }
                const res = await fetch('/api/extract-label', { method: 'POST', body: fd });
                const contentType = res.headers.get('content-type') || '';
                if (!contentType.includes('application/json')) {
                    throw new Error('Server trả về format không hợp lệ');
                }
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Lỗi trích xuất');
                if (data.success && data.data) {
                    setLabelExtracted(data.data);
                    // If ZXing failed but GPT read barcode number → use it
                    if (!labelBarcodeNumber && data.data.barcodeNumber) {
                        setLabelBarcodeNumber(data.data.barcodeNumber);
                        console.log('✅ [GPT OCR] Barcode from label:', data.data.barcodeNumber);
                    }
                    // Auto-fill volume from label if form is empty
                    if (data.data.volume && !form.volume) {
                        setForm(x => ({
                            ...x,
                            volume: data.data.volume,
                            unit: (data.data.volumeUnit === 'g' ? 'g' : 'ml') as 'ml' | 'g',
                        }));
                    }
                }
            } catch (err) {
                console.warn('Label extraction failed:', err);
                setLabelExtractError(err instanceof Error ? err.message : 'Lỗi trích xuất nhãn');
            } finally {
                setExtractingLabel(false);
            }
        }
    };

    // Auto-scan barcode when barcode reference file is uploaded
    const handleBarcodeFileChange = async (f: File | null) => {
        setForm(x => ({ ...x, barcodeFile: f }));
        setRefBarcodeNumber(null);
        if (f) {
            setScanningRefBarcode(true);
            try {
                const imageFile = await ensureImageFile(f);
                const detected = await decodeBarcodeFromFile(imageFile);
                setRefBarcodeNumber(detected);
                // Also set barcodeRef text for API
                if (detected) {
                    setForm(x => ({ ...x, barcodeRef: detected }));
                }
            } catch (err) {
                console.warn('Ref barcode scan failed:', err);
            } finally {
                setScanningRefBarcode(false);
            }
        }
    };

    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const { data, error } = await supabase.from('brands').select('*');
                if (error) throw error;
                if (data && data.length > 0) {
                    setBrands(data.map(item => ({
                        id: item.id,
                        name: item.name,
                        logoUrl: item.logo_url || '',
                        qrCodeUrl: item.qr_code_url || '',
                        registeredCompanyName: item.registered_company_name,
                        address: item.address || '',
                        phone: item.phone || '',
                        website: item.website || '',
                        color: item.color || '#EA580C',
                    })));
                } else {
                    const { MOCK_BRANDS } = await import('@/lib/mock-data');
                    setBrands(MOCK_BRANDS);
                }
            } catch {
                // Supabase unreachable — fallback to mock data
                console.warn('Supabase unreachable, using mock brands');
                const { MOCK_BRANDS } = await import('@/lib/mock-data');
                setBrands(MOCK_BRANDS);
            }
            setLoadingBrands(false);
        };
        fetchBrands();
    }, []);

    const selectedBrand = brands.find(b => b.id === form.brandId);
    const volumeFormatted = form.volume ? formatVolumeLabel(form.volume, form.unit) : '';

    const canNext = () => {
        if (step === 0) return form.labelType !== null;
        if (step === 1) return form.brandId !== '';
        if (step === 2) return form.productName && form.volume && form.labelFile;
        return true;
    };

    const handleSubmit = async () => {
        if (!form.labelFile || !form.labelType) return;

        setIsAnalyzing(true);
        setError(null);

        try {
            // Convert all files to compressed images for GPT-4o Vision
            // Target ~1MB each (3 files × ~1MB = ~3MB, well under Vercel's 4.5MB limit)
            let labelImage = await ensureImageFile(form.labelFile);
            labelImage = await compressImage(labelImage, 1000, 0.6);

            const formData = new FormData();
            formData.append('labelFile', labelImage);

            // Also compress & send HSCB and barcode for cross-referencing
            if (form.hscbFile) {
                let hscbImage = await ensureImageFile(form.hscbFile);
                hscbImage = await compressImage(hscbImage, 1000, 0.6);
                formData.append('hscbFile', hscbImage);
            }
            if (form.barcodeFile) {
                let barcodeImage = await ensureImageFile(form.barcodeFile);
                barcodeImage = await compressImage(barcodeImage, 1000, 0.6);
                formData.append('barcodeFile', barcodeImage);
            }

            formData.append('productName', form.productName);
            formData.append('brandName', selectedBrand?.name || '');
            formData.append('volume', volumeFormatted);
            formData.append('labelType', form.labelType);
            formData.append('brandInfo', JSON.stringify(selectedBrand || {}));
            // Send barcode numbers detected by ZXing scanner
            const effectiveBarcodeRef = form.barcodeRef || refBarcodeNumber || '';
            if (effectiveBarcodeRef) {
                formData.append('barcodeRef', effectiveBarcodeRef);
            }
            // Use ZXing result, or manual input as fallback
            const effectiveLabelBarcode = labelBarcodeNumber || labelBarcodeManual || '';
            if (effectiveLabelBarcode) {
                formData.append('labelBarcodeScanned', effectiveLabelBarcode);
            }
            // Send extracted label text (OCR) so GPT compares text-to-text
            if (labelExtracted?.productName) {
                formData.append('labelProductName', labelExtracted.productName);
            }
            if (labelExtracted?.volume) {
                formData.append('labelVolume', `${labelExtracted.volume} ${labelExtracted.volumeUnit || 'ml'}`);
            }
            if (labelExtracted?.intendedUse) {
                formData.append('labelIntendedUse', labelExtracted.intendedUse);
            }
            if (labelExtracted?.ingredients) {
                formData.append('labelIngredients', labelExtracted.ingredients);
            }
            // Send extracted HSCB text for comparison
            if (hscbExtracted?.intendedUse) {
                formData.append('hscbIntendedUse', hscbExtracted.intendedUse);
            }
            if (hscbExtracted?.ingredients) {
                formData.append('hscbIngredients', hscbExtracted.ingredients);
            }

            // === DUAL AI: Clone FormData cho Gemini (vì FormData có thể chỉ đọc 1 lần) ===
            const formData2 = new FormData();
            for (const [key, value] of formData.entries()) {
                formData2.append(key, value);
            }

            const [gptResponse, geminiResponse] = await Promise.allSettled([
                fetch('/api/analyze-label', { method: 'POST', body: formData }),
                fetch('/api/analyze-label-gemini', { method: 'POST', body: formData2 }),
            ]);

            // Parse GPT result
            let gptData: Record<string, unknown> | null = null;
            let gptErrorMsg = '';
            if (gptResponse.status === 'fulfilled') {
                const res = gptResponse.value;
                try {
                    const ct = res.headers.get('content-type') || '';
                    if (ct.includes('application/json')) {
                        const json = await res.json();
                        if (res.ok && json.result) {
                            gptData = json;
                        } else {
                            gptErrorMsg = json.error || `HTTP ${res.status}`;
                        }
                    } else {
                        const text = await res.text();
                        gptErrorMsg = `Non-JSON response: ${text.substring(0, 100)}`;
                    }
                } catch (e) {
                    gptErrorMsg = e instanceof Error ? e.message : 'Parse error';
                }
            } else {
                gptErrorMsg = gptResponse.reason?.message || 'Network error';
            }

            // Parse Gemini result
            let geminiData: Record<string, unknown> | null = null;
            let geminiErrorMsg = '';
            if (geminiResponse.status === 'fulfilled') {
                const res = geminiResponse.value;
                try {
                    const ct = res.headers.get('content-type') || '';
                    if (ct.includes('application/json')) {
                        const json = await res.json();
                        if (res.ok && json.result) {
                            geminiData = json;
                        } else {
                            geminiErrorMsg = json.error || `HTTP ${res.status}`;
                        }
                    } else {
                        const text = await res.text();
                        geminiErrorMsg = `Non-JSON response: ${text.substring(0, 100)}`;
                    }
                } catch (e) {
                    geminiErrorMsg = e instanceof Error ? e.message : 'Parse error';
                }
            } else {
                geminiErrorMsg = geminiResponse.reason?.message || 'Network error';
            }

            // At least one must succeed
            const primaryData = gptData || geminiData;
            if (!primaryData) {
                throw new Error(`Cả 2 AI đều thất bại.\nGPT: ${gptErrorMsg}\nGemini: ${geminiErrorMsg}`);
            }

            const data = primaryData;

            // Store result and form info in sessionStorage
            const sessionId = `check_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const aiItems = (data.result as { items?: Array<{ status: string }> })?.items || [];
            const totalErrors = aiItems.filter((i: { status: string }) => i.status === 'error').length;
            const totalWarnings = aiItems.filter((i: { status: string }) => i.status === 'warning').length;
            const totalOk = aiItems.filter((i: { status: string }) => i.status === 'ok').length;
            const overallStatus = totalErrors > 0 ? 'fail' : totalWarnings > 0 ? 'warning' : 'pass';

            const resultPayload: Record<string, unknown> = {
                aiResult: (gptData?.result || null),
                geminiResult: (geminiData?.result || null),
                productName: form.productName,
                brandName: selectedBrand?.name || '',
                brandId: form.brandId,
                labelType: form.labelType,
                volume: form.volume,
                volumeFormatted,
                labelFileUrl: form.labelFile ? URL.createObjectURL(form.labelFile) : null,
                createdAt: new Date().toISOString(),
                usage: data.usage,
            };

            // Save to localStorage for dashboard history
            saveCheckSession({
                id: sessionId,
                productName: form.productName,
                brandId: form.brandId,
                brandName: selectedBrand?.name || '',
                labelType: form.labelType,
                volume: form.volume,
                volumeFormatted,
                status: overallStatus as 'pass' | 'fail' | 'warning',
                createdAt: new Date().toISOString(),
                checkedBy: 'GPT-4o + Gemini',
                totalErrors,
                totalWarnings,
                totalOk,
                aiResult: data.result as Record<string, unknown>,
                labelFileUrl: form.labelFile?.name,
                hscbFileUrl: form.hscbFile?.name,
                barcodeFileUrl: form.barcodeFile?.name,
            });

            // Store label + HSCB as base64 for result page display
            const fileToPreviewBase64 = async (file: File): Promise<string> => {
                let imgFile = await ensureImageFile(file);
                imgFile = await compressImage(imgFile, 800, 0.5);
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(imgFile);
                });
            };

            const [labelBase64, hscbBase64] = await Promise.all([
                form.labelFile ? fileToPreviewBase64(form.labelFile) : Promise.resolve(null),
                form.hscbFile ? fileToPreviewBase64(form.hscbFile) : Promise.resolve(null),
            ]);

            if (labelBase64) resultPayload.labelFileUrl = labelBase64;
            resultPayload.hscbFileUrl = hscbBase64;

            sessionStorage.setItem('labelcheck_result', JSON.stringify(resultPayload));
            router.push('/check/result');

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Lỗi không xác định';
            setError(message);
            setIsAnalyzing(false);
        }
    };

    return (
        <>
            {isAnalyzing && <AnalyzingOverlay productName={form.productName} />}

            <div style={{ padding: '32px', maxWidth: '760px', margin: '0 auto' }}>
                <div style={{ marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                        Tạo Check Mới
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Kiểm tra nhãn mỹ phẩm theo quy định pháp luật — Powered by GPT-4o + Gemini
                    </p>
                </div>

                <StepIndicator current={step} />

                {error && (
                    <div style={{
                        padding: '14px 16px',
                        background: 'var(--accent-red-glow)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '10px',
                        marginBottom: '16px',
                        fontSize: '13px',
                        color: 'var(--accent-red)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        ❌ {error}
                        <button
                            onClick={() => setError(null)}
                            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)' }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                <div className="card animate-slide-in" style={{ padding: '32px' }}>
                    {/* Step 0: Label Type */}
                    {step === 0 && (
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Chọn loại nhãn</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                Phân loại theo dung tích/khối lượng sản phẩm
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                {(['>20ml', '<20ml'] as LabelType[]).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setForm(f => ({ ...f, labelType: type }))}
                                        style={{
                                            padding: '28px 24px',
                                            borderRadius: '12px',
                                            border: '2px solid',
                                            borderColor: form.labelType === type ? 'var(--accent-orange)' : 'var(--border)',
                                            background: form.labelType === type ? 'var(--accent-orange-glow)' : 'var(--bg-card)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        <Package size={28} color={form.labelType === type ? 'var(--accent-orange)' : 'var(--text-muted)'} />
                                        <div style={{ fontSize: '20px', fontWeight: 800, color: form.labelType === type ? 'var(--accent-orange)' : 'var(--text-primary)', marginTop: '12px' }}>
                                            {type}
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                                            {type === '>20ml'
                                                ? 'Nhãn đầy đủ — Kiểm tra toàn bộ thông tin bắt buộc'
                                                : 'Nhãn tinh gọn — Chỉ bắt buộc Tên SP & Số lô trên bao bì trực tiếp'}
                                        </div>
                                        {type === '<20ml' && (
                                            <div style={{
                                                marginTop: '10px',
                                                fontSize: '12px',
                                                color: 'var(--accent-yellow)',
                                                background: 'var(--accent-yellow-glow)',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                display: 'inline-block',
                                            }}>
                                                ⚠ Thông tin còn lại cần có trên nhãn phụ
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 1: Brand */}
                    {step === 1 && (
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Chọn thương hiệu</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                Hệ thống sẽ tự động load thông tin cố định của brand
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {loadingBrands ? (
                                    <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Đang tải danh sách thương hiệu...</div>
                                ) : brands.map(brand => (
                                    <button
                                        key={brand.id}
                                        onClick={() => setForm(f => ({ ...f, brandId: brand.id }))}
                                        style={{
                                            padding: '20px',
                                            borderRadius: '12px',
                                            border: '2px solid',
                                            borderColor: form.brandId === brand.id ? brand.color : 'var(--border)',
                                            background: form.brandId === brand.id ? `${brand.color}15` : 'var(--bg-card)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '8px',
                                                background: brand.logoUrl ? 'transparent' : brand.color,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '14px',
                                                fontWeight: 800,
                                                color: 'white',
                                                overflow: 'hidden',
                                            }}>
                                                {brand.logoUrl
                                                    ? <img src={brand.logoUrl} alt={brand.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    : brand.name[0]
                                                }
                                            </div>
                                            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{brand.name}</span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                            <div>{brand.registeredCompanyName}</div>
                                            <div style={{ color: 'var(--accent-orange)', marginTop: '2px' }}>{brand.website || <span style={{ opacity: 0.5 }}>Chưa cập nhật website</span>}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {selectedBrand && (
                                <div style={{
                                    marginTop: '20px',
                                    padding: '16px',
                                    background: 'var(--bg-card)',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Thông tin cố định sẽ được load
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        {[
                                            ['Công ty', selectedBrand.registeredCompanyName],
                                            ['Logo', selectedBrand.logoUrl ? 'Đã có (' + selectedBrand.logoUrl + ')' : 'Chưa có'],
                                            ['Mã QR', selectedBrand.qrCodeUrl ? 'Đã có (' + selectedBrand.qrCodeUrl + ')' : 'Chưa có'],
                                            ['Địa chỉ', selectedBrand.address],
                                            ['SĐT', selectedBrand.phone],
                                            ['Website', selectedBrand.website],
                                        ].map(([k, v]) => (
                                            <div key={k}>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{k}</div>
                                                <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px' }}>{v}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Files & Input */}
                    {step === 2 && (
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Tải file & Nhập liệu</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                Upload các tài liệu cần thiết và nhập thông tin sản phẩm
                            </p>

                            <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                                <FileUploadZone
                                    label="📄 File thiết kế nhãn (bắt buộc)"
                                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                                    file={form.labelFile}
                                    onFile={handleLabelFileChange}
                                    icon={FileText}
                                    hint="Chấp nhận PDF, PNG, JPG, WEBP"
                                />
                                {/* Show detected barcode from label */}
                                {form.labelFile && (
                                    <div style={{
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        background: scanningLabelBarcode ? 'var(--bg-secondary)' :
                                            labelBarcodeNumber ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                                        border: `1px solid ${scanningLabelBarcode ? 'var(--border)' :
                                            labelBarcodeNumber ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginTop: '-8px',
                                    }}>
                                        {scanningLabelBarcode ? (
                                            <>
                                                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Đang quét mã vạch trên nhãn...</span>
                                            </>
                                        ) : labelBarcodeNumber ? (
                                            <>
                                                <CheckCircle size={14} color="var(--accent-green)" />
                                                <span style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: 600 }}>
                                                    Mã vạch nhãn: <span style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>{labelBarcodeNumber}</span>
                                                </span>
                                            </>
                                        ) : (
                                            <div style={{ width: '100%' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                    <AlertTriangle size={14} color="rgb(245, 158, 11)" />
                                                    <span style={{ fontSize: '12px', color: 'rgb(245, 158, 11)' }}>Không quét được mã vạch tự động — nhập số mã vạch in trên nhãn:</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={labelBarcodeManual}
                                                    onChange={e => setLabelBarcodeManual(e.target.value.replace(/\D/g, ''))}
                                                    placeholder="Nhập số in dưới mã vạch trên nhãn (VD: 8936237960201)"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 12px',
                                                        background: 'var(--bg-primary)',
                                                        border: '1px solid var(--border-light)',
                                                        borderRadius: '6px',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '13px',
                                                        fontFamily: 'monospace',
                                                        letterSpacing: '1px',
                                                        outline: 'none',
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* Label text extraction status */}
                                {form.labelFile && (
                                    <div style={{
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        background: extractingLabel ? 'var(--bg-secondary)' :
                                            labelExtracted ? 'rgba(16, 185, 129, 0.08)' :
                                            labelExtractError ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                                        border: `1px solid ${extractingLabel ? 'var(--border)' :
                                            labelExtracted ? 'rgba(16, 185, 129, 0.3)' :
                                            labelExtractError ? 'rgba(239, 68, 68, 0.3)' : 'transparent'}`,
                                        marginTop: '-8px',
                                    }}>
                                        {extractingLabel ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>AI đang đọc tên SP & dung tích từ nhãn...</span>
                                            </div>
                                        ) : labelExtracted ? (
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <CheckCircle size={14} color="var(--accent-green)" />
                                                    <span style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: 600 }}>
                                                        Đã trích xuất từ nhãn (Độ tin cậy: {labelExtracted.confidence === 'high' ? 'Cao' : labelExtracted.confidence === 'medium' ? 'Trung bình' : 'Thấp'})
                                                    </span>
                                                </div>
                                                {labelExtracted.productName && (
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '22px', marginTop: '2px' }}>
                                                        Tên SP trên nhãn: <strong>{labelExtracted.productName}</strong>
                                                    </div>
                                                )}
                                                {labelExtracted.volume && (
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '22px', marginTop: '2px' }}>
                                                        Dung tích trên nhãn: <strong>{labelExtracted.volume} {labelExtracted.volumeUnit}</strong>
                                                    </div>
                                                )}
                                                {labelExtracted.intendedUse && (
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '22px', marginTop: '2px' }}>
                                                        Công dụng: <strong>{labelExtracted.intendedUse}</strong>
                                                    </div>
                                                )}
                                                {labelExtracted.ingredients && (
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '22px', marginTop: '2px', maxHeight: '60px', overflow: 'auto' }}>
                                                        Thành phần: <strong>{labelExtracted.ingredients}</strong>
                                                    </div>
                                                )}
                                            </div>
                                        ) : labelExtractError ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <AlertTriangle size={14} color="var(--accent-red)" />
                                                <span style={{ fontSize: '12px', color: 'var(--accent-red)' }}>
                                                    Không trích xuất được từ nhãn: {labelExtractError} — AI sẽ đọc trực tiếp từ ảnh
                                                </span>
                                            </div>
                                        ) : null}
                                    </div>
                                )}

                                <FileUploadZone
                                    label="📋 File HSCB — Hồ sơ công bố"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    file={form.hscbFile}
                                    onFile={async (f) => {
                                        setForm(x => ({ ...x, hscbFile: f }));
                                        setHscbExtracted(null);
                                        setHscbExtractError(null);
                                        if (f) {
                                            setExtractingHscb(true);
                                            try {
                                                // Convert PDF to separate page images for better OCR quality
                                                const { pdfToPages, isPdf } = await import('@/lib/pdf-to-image');
                                                const fd = new FormData();
                                                if (isPdf(f)) {
                                                    const pages = await pdfToPages(f, 1.5);
                                                    for (let i = 0; i < pages.length; i++) {
                                                        const compressed = await compressImage(pages[i], 1600, 0.7);
                                                        fd.append('hscbPages', compressed);
                                                    }
                                                } else {
                                                    const compressed = await compressImage(f, 1600, 0.7);
                                                    fd.append('hscbPages', compressed);
                                                }
                                                const res = await fetch('/api/extract-hscb', { method: 'POST', body: fd });
                                                const contentType = res.headers.get('content-type') || '';
                                                if (!contentType.includes('application/json')) {
                                                    throw new Error('Server trả về format không hợp lệ');
                                                }
                                                const data = await res.json();
                                                if (!res.ok) throw new Error(data.error || 'Lỗi trích xuất');
                                                if (data.success && data.data) {
                                                    setHscbExtracted(data.data);
                                                    // Auto-fill product name if field is empty or user confirms
                                                    if (data.data.productName) {
                                                        setForm(x => ({
                                                            ...x,
                                                            productName: data.data.productName,
                                                        }));
                                                    }
                                                    // Auto-fill volume if field is empty
                                                    if (data.data.volume) {
                                                        setForm(x => ({
                                                            ...x,
                                                            volume: data.data.volume,
                                                            unit: (data.data.volumeUnit === 'g' ? 'g' : 'ml') as 'ml' | 'g',
                                                        }));
                                                    }
                                                }
                                            } catch (err) {
                                                console.warn('HSCB extraction failed:', err);
                                                setHscbExtractError(err instanceof Error ? err.message : 'Lỗi trích xuất HSCB');
                                            } finally {
                                                setExtractingHscb(false);
                                            }
                                        }
                                    }}
                                    icon={FileText}
                                    hint="Chấp nhận PDF, PNG, JPG — AI sẽ tự đọc tên SP & dung tích"
                                />
                                {/* HSCB extraction status */}
                                {form.hscbFile && (
                                    <div style={{
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        background: extractingHscb ? 'var(--bg-secondary)' :
                                            hscbExtracted ? 'rgba(16, 185, 129, 0.08)' :
                                            hscbExtractError ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                                        border: `1px solid ${extractingHscb ? 'var(--border)' :
                                            hscbExtracted ? 'rgba(16, 185, 129, 0.3)' :
                                            hscbExtractError ? 'rgba(239, 68, 68, 0.3)' : 'transparent'}`,
                                        marginTop: '-8px',
                                    }}>
                                        {extractingHscb ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>AI đang đọc HSCB để trích xuất tên SP & dung tích...</span>
                                            </div>
                                        ) : hscbExtracted ? (
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <CheckCircle size={14} color="var(--accent-green)" />
                                                    <span style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: 600 }}>
                                                        Đã tự động điền từ HSCB (Độ tin cậy: {hscbExtracted.confidence === 'high' ? 'Cao' : hscbExtracted.confidence === 'medium' ? 'Trung bình' : 'Thấp'})
                                                    </span>
                                                </div>
                                                {hscbExtracted.productName && (
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '22px', marginTop: '2px' }}>
                                                        Tên SP: <strong>{hscbExtracted.productName}</strong>
                                                    </div>
                                                )}
                                                {hscbExtracted.volume && (
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '22px', marginTop: '2px' }}>
                                                        Dung tích: <strong>{hscbExtracted.volume} {hscbExtracted.volumeUnit}</strong>
                                                    </div>
                                                )}
                                                {hscbExtracted.intendedUse && (
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '22px', marginTop: '2px' }}>
                                                        Công dụng: <strong>{hscbExtracted.intendedUse}</strong>
                                                    </div>
                                                )}
                                                {hscbExtracted.ingredients && (
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '22px', marginTop: '2px', maxHeight: '60px', overflow: 'auto' }}>
                                                        Thành phần: <strong>{hscbExtracted.ingredients}</strong>
                                                    </div>
                                                )}
                                            </div>
                                        ) : hscbExtractError ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <AlertTriangle size={14} color="var(--accent-red)" />
                                                <span style={{ fontSize: '12px', color: 'var(--accent-red)' }}>
                                                    Không trích xuất được: {hscbExtractError} — vui lòng nhập thủ công
                                                </span>
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                                <FileUploadZone
                                    label="🔲 File mã vạch gốc (dùng để so khớp số + kiểm tra chất lượng in)"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    file={form.barcodeFile}
                                    onFile={handleBarcodeFileChange}
                                    icon={Barcode}
                                    hint="Chấp nhận PDF, PNG, JPG"
                                />
                                {/* Show detected barcode from reference + comparison */}
                                {form.barcodeFile && (
                                    <div style={{
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        background: scanningRefBarcode ? 'var(--bg-secondary)' :
                                            refBarcodeNumber ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                                        border: `1px solid ${scanningRefBarcode ? 'var(--border)' :
                                            refBarcodeNumber ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                                        marginTop: '-8px',
                                    }}>
                                        {scanningRefBarcode ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Đang quét mã vạch gốc...</span>
                                            </div>
                                        ) : refBarcodeNumber ? (
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <CheckCircle size={14} color="var(--accent-green)" />
                                                    <span style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: 600 }}>
                                                        Mã vạch gốc: <span style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>{refBarcodeNumber}</span>
                                                    </span>
                                                </div>
                                                {/* Inline comparison if both detected */}
                                                {labelBarcodeNumber && (
                                                    <div style={{
                                                        marginTop: '6px',
                                                        padding: '6px 10px',
                                                        borderRadius: '6px',
                                                        background: labelBarcodeNumber === refBarcodeNumber ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                    }}>
                                                        {labelBarcodeNumber === refBarcodeNumber ? (
                                                            <>
                                                                <CheckCircle size={14} color="var(--accent-green)" />
                                                                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-green)' }}>
                                                                    ✓ Hai mã vạch KHỚP: {labelBarcodeNumber}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <X size={14} color="var(--accent-red)" />
                                                                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-red)' }}>
                                                                    ✗ KHÔNG KHỚP — Nhãn: {labelBarcodeNumber} | Gốc: {refBarcodeNumber}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                    <AlertTriangle size={14} color="rgb(245, 158, 11)" />
                                                    <span style={{ fontSize: '12px', color: 'rgb(245, 158, 11)' }}>Không quét được — nhập số mã vạch gốc thủ công:</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={form.barcodeRef}
                                                    onChange={e => setForm(f => ({ ...f, barcodeRef: e.target.value.trim() }))}
                                                    placeholder="VD: 8936089073500"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 12px',
                                                        background: 'var(--bg-primary)',
                                                        border: '1px solid var(--border-light)',
                                                        borderRadius: '6px',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '13px',
                                                        fontFamily: 'monospace',
                                                        letterSpacing: '1px',
                                                        outline: 'none',
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ height: '1px', background: 'var(--border)', margin: '24px 0' }} />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                        Tên sản phẩm trên Hồ sơ công bố (bắt buộc)
                                    </label>
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                        Nhập chính xác tên sản phẩm từ HSCB — AI sẽ đối chiếu từng ký tự với nhãn
                                    </p>
                                    <input
                                        type="text"
                                        value={form.productName}
                                        onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
                                        placeholder="VD: Moisturizing & Protecting Hair Serum – Sachi Oil, Argan Oil, EHMC"
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            background: 'var(--bg-primary)',
                                            border: '1px solid var(--border-light)',
                                            borderRadius: '8px',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px',
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                                        Dung tích / Khối lượng (bắt buộc)
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="number"
                                            value={form.volume}
                                            onChange={e => setForm(f => ({ ...f, volume: e.target.value }))}
                                            placeholder="VD: 150"
                                            style={{
                                                flex: 1,
                                                padding: '10px 14px',
                                                background: 'var(--bg-primary)',
                                                border: '1px solid var(--border-light)',
                                                borderRadius: '8px',
                                                color: 'var(--text-primary)',
                                                fontSize: '14px',
                                                outline: 'none',
                                            }}
                                        />
                                        <select
                                            value={form.unit}
                                            onChange={e => setForm(f => ({ ...f, unit: e.target.value as 'ml' | 'g' }))}
                                            style={{
                                                padding: '10px 14px',
                                                background: 'var(--bg-primary)',
                                                border: '1px solid var(--border-light)',
                                                borderRadius: '8px',
                                                color: 'var(--text-primary)',
                                                fontSize: '14px',
                                                outline: 'none',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <option value="ml">ml</option>
                                            <option value="g">g</option>
                                        </select>
                                    </div>
                                    {volumeFormatted && (
                                        <div style={{
                                            marginTop: '8px',
                                            padding: '8px 12px',
                                            background: 'var(--accent-green-glow)',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            color: 'var(--accent-green)',
                                            fontFamily: 'monospace',
                                        }}>
                                            ✅ Format chuẩn: <strong>{volumeFormatted}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review */}
                    {step === 3 && (
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Xem lại trước khi gửi</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                Kiểm tra thông tin trước khi hệ thống bắt đầu phân tích
                            </p>

                            <div style={{ display: 'grid', gap: '12px' }}>
                                {[
                                    { label: 'Loại nhãn', value: form.labelType },
                                    { label: 'Thương hiệu', value: selectedBrand?.name },
                                    { label: 'Tên sản phẩm', value: form.productName },
                                    { label: 'Định lượng', value: volumeFormatted },
                                    { label: 'File nhãn', value: form.labelFile?.name || '—' },
                                    { label: 'File HSCB', value: form.hscbFile?.name || 'Chưa tải (tùy chọn)' },
                                    { label: 'File mã vạch', value: form.barcodeFile?.name || 'Chưa tải (tùy chọn)' },
                                    { label: 'Số mã vạch gốc', value: form.barcodeRef || 'Chưa nhập (tùy chọn)' },
                                ].map(({ label, value }) => (
                                    <div key={label} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '12px 16px',
                                        background: 'var(--bg-primary)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                    }}>
                                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{label}</span>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
                                    </div>
                                ))}
                            </div>

                            <div style={{
                                marginTop: '20px',
                                padding: '14px 16px',
                                background: 'var(--accent-orange-glow)',
                                borderRadius: '10px',
                                border: '1px solid rgba(234, 88, 12, 0.3)',
                                fontSize: '13px',
                                color: 'var(--accent-orange)',
                            }}>
                                🤖 Hệ thống sẽ sử dụng <strong>GPT-4o Vision</strong> để phân tích nhãn và trả kết quả trong vài giây.
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
                        <button
                            onClick={() => setStep(s => s - 1)}
                            disabled={step === 0}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 20px',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: step === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
                                fontSize: '14px',
                                cursor: step === 0 ? 'not-allowed' : 'pointer',
                                opacity: step === 0 ? 0.5 : 1,
                            }}
                        >
                            <ChevronLeft size={16} /> Quay lại
                        </button>

                        {step < STEPS.length - 1 ? (
                            <button
                                onClick={() => setStep(s => s + 1)}
                                disabled={!canNext()}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '10px 24px',
                                    background: canNext() ? 'linear-gradient(135deg, #F97316, #EA580C)' : 'var(--border)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: canNext() ? 'white' : 'var(--text-muted)',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: canNext() ? 'pointer' : 'not-allowed',
                                    boxShadow: canNext() ? '0 4px 16px rgba(234, 88, 12, 0.3)' : 'none',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                Tiếp theo <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isAnalyzing}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '10px 28px',
                                    background: 'linear-gradient(135deg, #10B981, #F97316)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                                }}
                            >
                                🚀 Bắt đầu kiểm tra
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
