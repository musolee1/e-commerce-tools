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
}

module.exports = nextConfig
