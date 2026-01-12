import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'exceljs';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// POST - Excel dosyasını yükle ve parse et
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 });
        }

        // Parse Excel
        const buffer = await file.arrayBuffer();
        const workbook = new XLSX.Workbook();
        await workbook.xlsx.load(buffer);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            return NextResponse.json({ error: 'Excel dosyasında sayfa bulunamadı' }, { status: 400 });
        }

        const matchingData: { trendyol_link: string; ikas_barcode: string }[] = [];

        // Header satırından kolon indexlerini bul
        let barkodIndex = -1;
        let trendyolLinkIndex = -1;

        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
            const value = String(cell.value || '').trim().toLowerCase();
            if (value === 'barkod') {
                barkodIndex = colNumber;
            }
            if (value === 'trendyol.com linki') {
                trendyolLinkIndex = colNumber;
            }
        });

        console.log(`📊 Kolon indexleri - Barkod: ${barkodIndex}, Trendyol Link: ${trendyolLinkIndex}`);
        console.log(`📊 Toplam satır sayısı: ${worksheet.rowCount}`);

        if (barkodIndex === -1 || trendyolLinkIndex === -1) {
            return NextResponse.json({
                error: 'Excel dosyasında "Barkod" veya "Trendyol.com Linki" kolonları bulunamadı'
            }, { status: 400 });
        }

        // Helper: Excel hücre değerini string'e çevir (hyperlink objeleri dahil)
        function getCellString(cellValue: any): string {
            if (cellValue === null || cellValue === undefined) {
                return '';
            }
            // Excel hyperlink objesi: { text: 'görünen metin', hyperlink: 'url' }
            if (typeof cellValue === 'object') {
                // Hyperlink objesi
                if (cellValue.hyperlink) {
                    return String(cellValue.hyperlink).trim();
                }
                // RichText objesi
                if (cellValue.richText) {
                    return cellValue.richText.map((rt: any) => rt.text).join('').trim();
                }
                // Text property varsa
                if (cellValue.text) {
                    return String(cellValue.text).trim();
                }
                // Result property (formül sonucu)
                if (cellValue.result !== undefined) {
                    return String(cellValue.result).trim();
                }
                return '';
            }
            return String(cellValue).trim();
        }

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Header satırını atla

            const ikasBarcode = getCellString(row.getCell(barkodIndex).value);
            let trendyolLink = getCellString(row.getCell(trendyolLinkIndex).value);

            if (!trendyolLink || !ikasBarcode) return;

            // ✅ Link temizleme: ? ve sonrasını sil
            trendyolLink = trendyolLink.split('?')[0];

            matchingData.push({
                trendyol_link: trendyolLink,
                ikas_barcode: ikasBarcode,
            });
        });

        console.log(`✅ Geçerli satır sayısı: ${matchingData.length}`);

        if (matchingData.length === 0) {
            return NextResponse.json({ error: 'Dosyada geçerli veri bulunamadı' }, { status: 400 });
        }

        // Eski verileri sil
        await supabase
            .from('matching_data')
            .delete()
            .eq('user_id', user.id);

        // Yeni verileri hazırla
        const insertData = matchingData.map(m => ({
            user_id: user.id,
            trendyol_link: m.trendyol_link,
            ikas_barcode: m.ikas_barcode,
        }));

        // Batch insert - 500'lük parçalar halinde ekle
        const BATCH_SIZE = 500;
        for (let i = 0; i < insertData.length; i += BATCH_SIZE) {
            const batch = insertData.slice(i, i + BATCH_SIZE);
            const { error: insertError } = await supabase
                .from('matching_data')
                .insert(batch);

            if (insertError) {
                console.error(`Batch ${i / BATCH_SIZE + 1} insert error:`, insertError);
                return NextResponse.json({ error: 'Veriler kaydedilirken hata oluştu' }, { status: 500 });
            }
        }

        console.log(`✅ Toplam ${insertData.length} eşleştirme verisi kaydedildi`);

        return NextResponse.json({
            success: true,
            count: matchingData.length,
            message: `${matchingData.length} satır başarıyla yüklendi`,
        });
    } catch (error: any) {
        console.error('Matching file upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Dosya yüklenirken hata oluştu' },
            { status: 500 }
        );
    }
}

// GET - Mevcut eşleştirme verilerini getir
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('matching_data')
            .select('*')
            .eq('user_id', user.id)
            .order('uploaded_at', { ascending: false })
            .range(0, 9999); // Supabase varsayılan 1000 limitini aş

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            data: data || [],
            count: data?.length || 0,
        });
    } catch (error: any) {
        console.error('Get matching data error:', error);
        return NextResponse.json(
            { error: error.message || 'Veriler alınırken hata oluştu' },
            { status: 500 }
        );
    }
}

// DELETE - Tüm eşleştirme verilerini sil
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { error } = await supabase
            .from('matching_data')
            .delete()
            .eq('user_id', user.id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Tüm eşleştirme verileri silindi' });
    } catch (error: any) {
        console.error('Delete matching data error:', error);
        return NextResponse.json(
            { error: error.message || 'Veriler silinirken hata oluştu' },
            { status: 500 }
        );
    }
}
