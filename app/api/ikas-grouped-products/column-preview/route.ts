import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'

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
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })
        }

        const fileName = file.name.toLowerCase()
        const isCSV = fileName.endsWith('.csv')

        let columns: { name: string; sampleValue: string }[] = []
        let totalRows = 0

        if (isCSV) {
            // Parse CSV file
            const text = await file.text()
            const rows = parseCSV(text)

            if (rows.length < 1) {
                return NextResponse.json({ error: 'CSV dosyası boş' }, { status: 400 })
            }

            const headers = rows[0]
            const sampleRow = rows[1] || []

            columns = headers.map((header, index) => ({
                name: header || `Kolon ${index + 1}`,
                sampleValue: (sampleRow[index] || '').substring(0, 100) + ((sampleRow[index]?.length || 0) > 100 ? '...' : '')
            })).filter(col => col.name)

            totalRows = rows.length - 1
        } else {
            // Parse Excel file
            const buffer = await file.arrayBuffer()
            const workbook = new ExcelJS.Workbook()
            await workbook.xlsx.load(buffer)

            const worksheet = workbook.worksheets[0]
            if (!worksheet) {
                return NextResponse.json({ error: 'Excel sayfası bulunamadı' }, { status: 400 })
            }

            // Get headers from first row
            const headerRow = worksheet.getRow(1)
            const tempColumns: { name: string; sampleValue: string; index: number }[] = []

            headerRow.eachCell((cell, colNumber) => {
                const columnName = cell.value?.toString().trim() || ''
                if (columnName) {
                    tempColumns.push({
                        name: columnName,
                        sampleValue: '',
                        index: colNumber
                    })
                }
            })

            // Get sample values from second row (first data row)
            const sampleRow = worksheet.getRow(2)
            tempColumns.forEach(column => {
                const cell = sampleRow.getCell(column.index)
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

                if (cellValue.length > 100) {
                    cellValue = cellValue.substring(0, 100) + '...'
                }

                column.sampleValue = cellValue
            })

            columns = tempColumns.map(({ name, sampleValue }) => ({ name, sampleValue }))
            totalRows = worksheet.rowCount - 1
        }

        return NextResponse.json({
            success: true,
            totalRows,
            columns
        })
    } catch (error: any) {
        console.error('File column preview error:', error)
        return NextResponse.json(
            { error: error.message || 'Dosya işlenirken hata oluştu' },
            { status: 500 }
        )
    }
}
