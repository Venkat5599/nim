/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The app runs inside Nimiq Pay's WebView and talks only to injected
  // providers, so there is nothing for a server to do. Exporting statically
  // keeps the cold open a plain CDN fetch with no server round trip.
  output: 'export',
  images: { unoptimized: true },
}

export default nextConfig
