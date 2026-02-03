import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'

interface ProductRow {
    urunGrupId: string
    isim: string
    varyantDeger1: string
    resimUrl: string
    stok: number
    stokKodu: string
}

interface GroupedProduct {
    urunGrupId: string
    urunIsmi: string
    varyantDegerler: string
    resimUrlleri: string
    toplamStok: number
    stokKodu: string
}

export async function POST(request: NextRequest) {
    try {
        // Get user session
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })
        }

        // Read Excel file
        const buffer = await file.arrayBuffer()
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(buffer)

        const worksheet = workbook.worksheets[0]
        if (!worksheet) {
            return NextResponse.json({ error: 'Excel sayfası bulunamadı' }, { status: 400 })
        }

        // Get headers
        const headerRow = worksheet.getRow(1)
        const headers: string[] = []
        headerRow.eachCell((cell, colNumber) => {
            headers[colNumber - 1] = cell.value?.toString().trim() || ''
        })

        // Find column indices
        const urunGrupIdIndex = headers.findIndex(h => h === 'Ürün Grup ID')
        const isimIndex = headers.findIndex(h => h === 'İsim')
        const varyantDeger1Index = headers.findIndex(h => h === 'Varyant Değer 1')
        const resimUrlIndex = headers.findIndex(h => h === 'Resim URL')
        const stokIndex = headers.findIndex(h => h === 'Stok:Merter Depo')
        const skuIndex = headers.findIndex(h => h === 'SKU')

        if (urunGrupIdIndex === -1 || isimIndex === -1 || stokIndex === -1) {
            return NextResponse.json(
                { error: 'Gerekli kolonlar bulunamadı: Ürün Grup ID, İsim, Stok:Merter Depo' },
                { status: 400 }
            )
        }

        // Parse products
        const products: ProductRow[] = []
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return // Skip header

            const stokValue = row.getCell(stokIndex + 1).value
            const stok = typeof stokValue === 'number' ? stokValue : parseFloat(stokValue?.toString() || '0') || 0

            // Extract stock code from SKU (before first hyphen)
            // Example: SWS9072-Pembe Desenli-S -> SWS9072
            let stokKodu = ''
            if (skuIndex !== -1) {
                const skuValue = row.getCell(skuIndex + 1).value?.toString() || ''
                const hyphenIndex = skuValue.indexOf('-')
                stokKodu = hyphenIndex > 0 ? skuValue.substring(0, hyphenIndex) : skuValue
            }

            // Only include products with stock > 0
            if (stok > 0) {
                products.push({
                    urunGrupId: row.getCell(urunGrupIdIndex + 1).value?.toString() || '',
                    isim: row.getCell(isimIndex + 1).value?.toString() || '',
                    varyantDeger1: varyantDeger1Index !== -1 ? (row.getCell(varyantDeger1Index + 1).value?.toString() || '') : '',
                    resimUrl: resimUrlIndex !== -1 ? (row.getCell(resimUrlIndex + 1).value?.toString() || '') : '',
                    stok: stok,
                    stokKodu: stokKodu
                })
            }
        })

        // Group products by Ürün Grup ID
        const groupedMap = new Map<string, GroupedProduct>()

        for (const product of products) {
            if (!product.urunGrupId) continue

            const existing = groupedMap.get(product.urunGrupId)

            if (existing) {
                // Add variant if not already included
                const existingVariants = existing.varyantDegerler.split(', ').filter(v => v)
                if (product.varyantDeger1 && !existingVariants.includes(product.varyantDeger1)) {
                    existingVariants.push(product.varyantDeger1)
                    existing.varyantDegerler = existingVariants.join(', ')
                }

                // Add image URLs if not already included
                if (product.resimUrl) {
                    const existingUrls = new Set(existing.resimUrlleri.split(';').filter(u => u))
                    const newUrls = product.resimUrl.split(';').filter(u => u)
                    newUrls.forEach(url => existingUrls.add(url.trim()))
                    existing.resimUrlleri = Array.from(existingUrls).join(';')
                }

                // Sum stock
                existing.toplamStok += product.stok
            } else {
                groupedMap.set(product.urunGrupId, {
                    urunGrupId: product.urunGrupId,
                    urunIsmi: product.isim,
                    varyantDegerler: product.varyantDeger1 || '',
                    resimUrlleri: product.resimUrl || '',
                    toplamStok: product.stok,
                    stokKodu: product.stokKodu
                })
            }
        }

        const groupedProducts = Array.from(groupedMap.values())

        // Save to database - upsert to update existing records
        const insertData = groupedProducts.map(p => ({
            user_id: session.user.id,
            urun_grup_id: p.urunGrupId,
            urun_ismi: p.urunIsmi,
            varyant_degerler: p.varyantDegerler,
            resim_urlleri: p.resimUrlleri,
            toplam_stok: p.toplamStok,
            stok_kodu: p.stokKodu
        }))

        const { error: upsertError } = await supabase
            .from('ikas_grouped_products')
            .upsert(insertData, {
                onConflict: 'user_id,urun_grup_id',
                ignoreDuplicates: false
            })

        if (upsertError) {
            console.error('Upsert error:', upsertError)
            return NextResponse.json(
                { error: 'Veritabanına kaydetme hatası: ' + upsertError.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            totalRows: worksheet.rowCount - 1,
            productsWithStock: products.length,
            groupedCount: groupedProducts.length,
            products: groupedProducts
        })
    } catch (error: any) {
        console.error('Excel processing error:', error)
        return NextResponse.json(
            { error: error.message || 'Dosya işlenirken hata oluştu' },
            { status: 500 }
        )
    }
}
