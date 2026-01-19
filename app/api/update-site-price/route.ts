import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// POST - Update site price via proxy
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { TrendyolKey, NewSitePrice } = body;

        if (!TrendyolKey || NewSitePrice === undefined) {
            return NextResponse.json(
                { error: 'TrendyolKey ve NewSitePrice gerekli' },
                { status: 400 }
            );
        }

        // External API'ye istek at
        const response = await fetch('https://swassonline.coddepo.com/Special/SpecialApps/UpdateSitePrice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                TrendyolKey,
                NewSitePrice,
            }),
        });

        const responseText = await response.text();

        // JSON parse et
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            // JSON değilse text olarak döndür
            if (!response.ok) {
                return NextResponse.json(
                    { error: `API Error: ${responseText}`, status: response.status },
                    { status: response.status }
                );
            }
            return NextResponse.json({
                success: true,
                message: responseText,
            });
        }

        // JSON body'deki status field'ını kontrol et
        if (responseData.status === 'error' || !response.ok) {
            return NextResponse.json(
                { error: responseData.message || responseText, status: response.status },
                { status: 400 }  // Frontend'e hata olarak döndür
            );
        }

        return NextResponse.json({
            success: true,
            message: responseData.message || responseText,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Fiyat güncellenirken hata oluştu' },
            { status: 500 }
        );
    }
}
