import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        // Auth check
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
        const nameIndex = headers.findIndex(h => h === 'İsim')
        const stockIndex = headers.findIndex(h => h === 'Stok:Merter Depo')
        const slugIndex = headers.findIndex(h => h === 'Slug')
        const imageIndex = headers.findIndex(h => h === 'Resim URL')

        if (nameIndex === -1 || stockIndex === -1 || slugIndex === -1 || imageIndex === -1) {
            return NextResponse.json(
                { error: 'Gerekli kolonlar bulunamadı: İsim, Stok:Merter Depo, Slug, Resim URL' },
                { status: 400 }
            )
        }

        // Parse products
        const products: any[] = []
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return // Skip header

            const name = row.getCell(nameIndex + 1).value?.toString() || ''
            const stockValue = row.getCell(stockIndex + 1).value
            const stock = typeof stockValue === 'number' ? stockValue : parseFloat(stockValue?.toString() || '0') || 0
            const slug = row.getCell(slugIndex + 1).value?.toString() || ''
            const imageUrl = row.getCell(imageIndex + 1).value?.toString() || ''

            if (stock > 0 && name && slug) {
                products.push({
                    İsim: name,
                    'Stok:Merter Depo': stock,
                    Slug: slug,
                    'Resim URL': imageUrl,
                })
            }
        })

        return NextResponse.json({
            success: true,
            totalProducts: worksheet.rowCount - 1,
            productsInStock: products.length,
            products: products,
        })
    } catch (error: any) {
        console.error('Excel processing error:', error)
        return NextResponse.json(
            { error: error.message || 'Dosya işlenirken hata oluştu' },
            { status: 500 }
        )
    }
}
