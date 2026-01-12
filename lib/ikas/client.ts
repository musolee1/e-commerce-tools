export interface IkasAuthResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export interface IkasProductFlat {
    productId: string;
    variantId: string;
    productName: string;
    sku: string;
    barcode: string;
    normalPrice: number;
    discountedPrice: number;
    buyPrice: number;
}

export async function getIkasToken(
    storeName: string,
    clientId: string,
    clientSecret: string
): Promise<string> {
    const url = `https://${storeName}.myikas.com/api/admin/oauth/token`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`İKAS Auth hatası: ${response.status} - ${text}`);
    }

    const data: IkasAuthResponse = await response.json();
    return data.access_token;
}

async function fetchProducts(token: string, page: number): Promise<any> {
    const url = 'https://api.myikas.com/api/v1/admin/graphql';

    const query = `
    query GetAllProducts($page: Int) {
      listProduct(pagination: { limit: 50, page: $page }) {
        count
        data {
          id
          name
          variants {
            id
            sku
            barcodeList
            prices {
              priceListId
              sellPrice
              discountPrice
              buyPrice
            }
          }
        }
      }
    }
  `;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            query,
            variables: { page },
        }),
    });

    return await response.json();
}

export async function fetchAllIkasProducts(token: string): Promise<IkasProductFlat[]> {
    const allData: IkasProductFlat[] = [];
    let currentPage = 1;
    let allDone = false;

    console.log('🚀 İKAS ürünleri çekiliyor...');

    while (!allDone) {
        const result = await fetchProducts(token, currentPage);

        if (result?.data?.listProduct) {
            const dataBlock = result.data.listProduct;
            const products = dataBlock.data;
            const totalCount = dataBlock.count;

            for (const p of products) {
                for (const v of p.variants) {
                    const defaultPrice = v.prices?.find((pr: any) => pr.priceListId === null);
                    allData.push({
                        productId: p.id,
                        variantId: v.id,
                        productName: p.name,
                        sku: v.sku || '',
                        barcode: v.barcodeList?.[0] || '',
                        normalPrice: defaultPrice?.sellPrice || 0,
                        discountedPrice: defaultPrice?.discountPrice || 0,
                        buyPrice: defaultPrice?.buyPrice || 0,
                    });
                }
            }

            console.log(`📦 Sayfa ${currentPage} okundu... (${allData.length} varyant)`);

            if (currentPage * 50 >= totalCount) {
                allDone = true;
            } else {
                currentPage++;
                await new Promise(r => setTimeout(r, 100));
            }
        } else {
            console.log('Veri alınamadı.');
            break;
        }
    }

    console.log(`✅ Toplam ${allData.length} varyant çekildi.`);
    return allData;
}
