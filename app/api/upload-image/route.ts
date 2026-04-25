import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const contentType = request.headers.get('content-type') || ''
        let fileBuffer: Buffer
        let fileExt = 'png'
        let fileType = 'image/png'

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData()
            const file = formData.get('file') as File | null
            if (!file) return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })
            const arrayBuffer = await file.arrayBuffer()
            fileBuffer = Buffer.from(arrayBuffer)
            fileExt = file.name.split('.').pop() || 'png'
            fileType = file.type || 'image/png'
        } else if (contentType.startsWith('image/') || contentType.startsWith('application/octet-stream')) {
            const arrayBuffer = await request.arrayBuffer()
            if (arrayBuffer.byteLength === 0) {
                return NextResponse.json({ error: 'Boş dosya' }, { status: 400 })
            }
            fileBuffer = Buffer.from(arrayBuffer)
            const paramFilename = request.nextUrl.searchParams.get('filename') || 'image.jpg'
            fileExt = paramFilename.split('.').pop() || 'png'
            fileType = contentType
        } else {
            return NextResponse.json({ error: 'Geçersiz dosya formatı' }, { status: 400 })
        }

        // Generate unique filename
        const filename = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`

        // Upload to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
            .from('grid-images')
            .upload(filename, fileBuffer, {
                contentType: fileType,
                upsert: false,
            })

        if (uploadError) {
            console.error('Storage upload error:', uploadError)
            return NextResponse.json({
                error: `Yükleme hatası: ${uploadError.message}`
            }, { status: 500 })
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('grid-images')
            .getPublicUrl(data.path)

        return NextResponse.json({
            success: true,
            publicUrl: urlData.publicUrl,
            path: data.path,
        })

    } catch (error: any) {
        console.error('Upload error:', error)
        return NextResponse.json({
            error: error.message || 'Bilinmeyen hata'
        }, { status: 500 })
    }
}
