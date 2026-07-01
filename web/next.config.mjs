/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow remote card/hero images from anywhere (tighten to specific hosts in prod).
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
