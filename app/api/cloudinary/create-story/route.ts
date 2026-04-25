import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { imageUrl, musicUrl } = body

        if (!imageUrl || !musicUrl) {
            return NextResponse.json({ error: 'Missing imageUrl or musicUrl' }, { status: 400 })
        }

        // Upload image to Cloudinary
        const imageUploadResult = await cloudinary.uploader.upload(imageUrl, {
            resource_type: 'image',
            folder: 'swass_stories/images',
        })

        // Upload audio to Cloudinary (resource_type must be 'video' for audio in Cloudinary)
        const audioUploadResult = await cloudinary.uploader.upload(musicUrl, {
            resource_type: 'video',
            folder: 'swass_stories/audio',
        })

        // Generate the combined video URL
        // We use the audio as the base, and overlay the image on top of it.
        // We scale the image to fit a standard 1080x1920 (9:16) story format if needed, 
        // or just fit the image.
        const imagePublicId = imageUploadResult.public_id.replace(/\//g, ':')

        const videoUrl = cloudinary.url(audioUploadResult.public_id, {
            resource_type: 'video',
            format: 'mp4',
            transformation: [
                // Set the base canvas to 1080x1920 and specify video specs
                { duration: 15, fps: 30, video_codec: 'h264', audio_codec: 'aac' },
                { width: 1080, height: 1920, crop: 'pad', background: 'black' },
                // Overlay the image, scale it to fit within 1080x1920 without distorting
                { overlay: imageUploadResult.public_id.replace(/\//g, ':') },
                { width: 1080, height: 1920, crop: 'fit' },
                { flags: 'layer_apply' }
            ]
        })
        
        // Trigger generation by pre-fetching the URL
        // This ensures the video starts rendering before Instagram tries to download it
        try {
            await fetch(videoUrl);
        } catch (e) {
            console.log('Pre-fetch failed, Cloudinary will generate on first access');
        }

        return NextResponse.json({
            success: true,
            videoUrl: videoUrl,
        })
    } catch (error: any) {
        console.error('Cloudinary creation error:', error)
        return NextResponse.json({ error: error.message || 'Video oluşturulamadı' }, { status: 500 })
    }
}
