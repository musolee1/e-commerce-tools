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

interface ColumnMapping {
    urunGrupId: string    // Column name for "Ürün Grup ID"
    isim: string          // Column name for "İsim"  
    varyantDeger1?: string // Column name for "Varyant Değer 1" (optional)
    resimUrl?: string     // Column name for "Resim URL" (optional)
    stok: string          // Column name for "Stok"
    sku?: string          // Column name for "SKU" (optional)
}

// Simple CSV parser
function parseCSV(text: string): string[][] {
    const lines = text.split(/\r?\n/).filter(line => line.trim())
    const rows: string[][] = []

    for (const line of lines) {
        const row: string[] = []
        let current = ''
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
            const char = line[i]

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"'
                    i++
                } else {
                    inQuotes = !inQuotes
                }
            } else if ((char === ',' || char === ';') && !inQuotes) {
                row.push(current.trim())
                current = ''
            } else {
                current += char
            }
        }
        row.push(current.trim())
        rows.push(row)
    }

    return rows
}

export async function POST(request: NextRequest) {
    try {
        // Get user session
        const supabase = await createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File
        const columnMappingJson = formData.get('columnMapping') as string

        if (!file) {
            return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })
        }

        // Parse column mapping from request
        let columnMapping: ColumnMapping | null = null
        if (columnMappingJson) {
            try {
                columnMapping = JSON.parse(columnMappingJson)
            } catch {
                return NextResponse.json({ error: 'Geçersiz kolon eşleştirmesi' }, { status: 400 })
            }
        } else {
            // Try to get mapping from user settings
            const { data: settings } = await supabase
                .from('user_settings')
                .select('ikas_excel_mapping')
                .eq('user_id', user.id)
                .single()

            if (settings?.ikas_excel_mapping) {
                console.log('Found saved mapping:', settings.ikas_excel_mapping)
                const mapping = settings.ikas_excel_mapping as ColumnMapping
                // Validate that the mapping is not empty and has required fields
                if (mapping && typeof mapping === 'object' && mapping.urunGrupId && mapping.isim && mapping.stok) {
                    columnMapping = mapping
                    console.log('Using saved mapping')
                } else {
                    console.log('Saved mapping is invalid or missing required fields')
                }
            } else {
                console.log('No saved mapping found for user', user.id)
            }
        }

        const fileName = file.name.toLowerCase()
        const isCSV = fileName.endsWith('.csv')

        let headers: string[] = []
        let dataRows: string[][] = []
        let totalRows = 0

        if (isCSV) {
            // Parse CSV file
            const text = await file.text()
            const rows = parseCSV(text)

            if (rows.length < 2) {
                return NextResponse.json({ error: 'CSV dosyası boş veya sadece başlık içeriyor' }, { status: 400 })
            }

            headers = rows[0]
            dataRows = rows.slice(1)
            totalRows = dataRows.length
        } else {
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
            headerRow.eachCell((cell, colNumber) => {
                headers[colNumber - 1] = cell.value?.toString().trim() || ''
            })

            // Get data rows
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return
                const rowData: string[] = []
                row.eachCell((cell, colNumber) => {
                    let cellValue = ''
                    if (cell.value !== null && cell.value !== undefined) {
                        if (typeof cell.value === 'object' && 'text' in cell.value) {
                            cellValue = cell.value.text?.toString() || ''
                        } else if (typeof cell.value === 'object' && 'result' in cell.value) {
                            cellValue = cell.value.result?.toString() || ''
                        } else {
                            cellValue = cell.value.toString()
                        }
                    }
                    rowData[colNumber - 1] = cellValue
                })
                dataRows.push(rowData)
            })
            totalRows = dataRows.length
        }

        // Find column indices - use mapping if provided, otherwise use default names
        let urunGrupIdIndex: number
        let isimIndex: number
        let varyantDeger1Index: number
        let resimUrlIndex: number
        let stokIndex: number
        let skuIndex: number

        if (columnMapping) {
            // Use provided column mapping
            urunGrupIdIndex = headers.findIndex(h => h === columnMapping!.urunGrupId)
            isimIndex = headers.findIndex(h => h === columnMapping!.isim)
            varyantDeger1Index = columnMapping.varyantDeger1 ? headers.findIndex(h => h === columnMapping!.varyantDeger1) : -1
            resimUrlIndex = columnMapping.resimUrl ? headers.findIndex(h => h === columnMapping!.resimUrl) : -1
            stokIndex = headers.findIndex(h => h === columnMapping!.stok)
            skuIndex = columnMapping.sku ? headers.findIndex(h => h === columnMapping!.sku) : -1

            // Validate required columns are found
            if (urunGrupIdIndex === -1) {
                return NextResponse.json({ error: `"${columnMapping.urunGrupId}" kolonu bulunamadı` }, { status: 400 })
            }
            if (isimIndex === -1) {
                return NextResponse.json({ error: `"${columnMapping.isim}" kolonu bulunamadı` }, { status: 400 })
            }
            if (stokIndex === -1) {
                return NextResponse.json({ error: `"${columnMapping.stok}" kolonu bulunamadı` }, { status: 400 })
            }
        } else {
            // Use default column names (backward compatibility)
            urunGrupIdIndex = headers.findIndex(h => h === 'Ürün Grup ID')
            isimIndex = headers.findIndex(h => h === 'İsim')

            varyantDeger1Index = headers.findIndex(h => h === 'Varyant Değer 1')
            if (varyantDeger1Index === -1) varyantDeger1Index = headers.findIndex(h => h === 'Nitelik 1 değer(ler)i') // Fallback

            resimUrlIndex = headers.findIndex(h => h === 'Resim URL')
            if (resimUrlIndex === -1) resimUrlIndex = headers.findIndex(h => h === 'Görseller') // Fallback

            stokIndex = headers.findIndex(h => h === 'Stok:Merter Depo')
            if (stokIndex === -1) stokIndex = headers.findIndex(h => h === 'Stok') // Fallback

            skuIndex = headers.findIndex(h => h === 'SKU')
            if (skuIndex === -1) skuIndex = headers.findIndex(h => h === 'Stok kodu (SKU)') // Fallback

            // If defaults not found and no mapping provided, fallback to error
            if (urunGrupIdIndex === -1 || isimIndex === -1 || stokIndex === -1) {
                return NextResponse.json(
                    { error: 'Kolon eşleştirmesi bulunamadı. Lütfen Ayarlar sayfasından bir Excel şablonu yükleyin veya manuel eşleştirme yapın.' },
                    { status: 400 }
                )
            }
        }

        // Parse products from data rows
        const products: ProductRow[] = []
        for (const row of dataRows) {
            const stokValue = row[stokIndex] || '0'
            const stok = parseFloat(stokValue.replace(',', '.')) || 0

            // Extract stock code from SKU (before first hyphen)
            let stokKodu = ''
            if (skuIndex !== -1 && row[skuIndex]) {
                const skuValue = row[skuIndex]
                const hyphenIndex = skuValue.indexOf('-')
                // Only split by hyphen if it's NOT the new format starting with SPM or similar without standard hyphen structure
                // Or just take the value if it looks like a main code. 
                // For "95030049000-033", we might want "95030049000" or the whole thing?
                // User said "Stok kodu (SKU)" -> "SPM033". 
                // Let's keep the logic but maybe make it smarter or optional?
                // For now, keep as is but ensure we get the value.
                stokKodu = skuValue
                if (hyphenIndex > 0) {
                    // Check if it's a variant suffix (usually short, e.g. -M, -38)
                    // If the part after hyphen is short, likely a variant. 
                    // But simplest is to keep consistent with previous logic.
                    stokKodu = skuValue.substring(0, hyphenIndex)
                }
            }

            // Only include products with stock > 0
            if (stok > 0) {
                products.push({
                    urunGrupId: row[urunGrupIdIndex] || '',
                    isim: row[isimIndex] || '',
                    varyantDeger1: varyantDeger1Index !== -1 ? (row[varyantDeger1Index] || '') : '',
                    resimUrl: resimUrlIndex !== -1 ? (row[resimUrlIndex] || '') : '',
                    stok: stok,
                    stokKodu: stokKodu
                })
            }
        }

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
                    // Split by comma OR semicolon
                    const newUrls = product.resimUrl.split(/[;,]/).filter(u => u.trim())
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
            user_id: user.id,
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
            totalRows: totalRows,
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
