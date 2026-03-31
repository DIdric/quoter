import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "quoter.didric.nl" }],
        destination: "https://quoter.nu/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
