/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'swassonline.com',
            },
        ],
    },
    devIndicators: false,
}

module.exports = nextConfig
