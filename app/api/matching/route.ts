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

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Header satırını atla

            let trendyolLink = String(row.getCell(1).value || '').trim();
            const ikasBarcode = String(row.getCell(2).value || '').trim();

            if (!trendyolLink) return;

            // ✅ Link temizleme: ? ve sonrasını sil
            trendyolLink = trendyolLink.split('?')[0];

            matchingData.push({
                trendyol_link: trendyolLink,
                ikas_barcode: ikasBarcode,
            });
        });

        if (matchingData.length === 0) {
            return NextResponse.json({ error: 'Dosyada geçerli veri bulunamadı' }, { status: 400 });
        }

        // Eski verileri sil
        await supabase
            .from('matching_data')
            .delete()
            .eq('user_id', user.id);

        // Yeni verileri ekle
        const insertData = matchingData.map(m => ({
            user_id: user.id,
            trendyol_link: m.trendyol_link,
            ikas_barcode: m.ikas_barcode,
        }));

        const { error: insertError } = await supabase
            .from('matching_data')
            .insert(insertData);

        if (insertError) {
            console.error('Insert error:', insertError);
            return NextResponse.json({ error: 'Veriler kaydedilirken hata oluştu' }, { status: 500 });
        }

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
            .order('uploaded_at', { ascending: false });

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
