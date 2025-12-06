import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/my-nfts'],
      },
    ],
    sitemap: 'https://satoshesluggers.com/sitemap.xml',
  }
}

