/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Listening maps and Reading diagrams are served straight from the shared Firebase Storage bucket.
    remotePatterns: [{ protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/**' }],
  },
};

export default nextConfig;
