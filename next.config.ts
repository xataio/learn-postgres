import type { NextConfig } from "next";

// The opengraph-image routes read these ttf files at request time; make sure
// output file tracing bundles them into the deployed functions.
const ogFontFiles = ["./assets/og/*.ttf"];

const nextConfig: NextConfig = {
  // Both hosts are aliases of this project serving identical output, so the
  // redirect must be conditioned on the incoming host or it would loop.
  // The vercel.app alias stays attached until Google de-indexes it.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "learn-postgres.vercel.app" }],
        destination: "https://learn.database.tech/:path*",
        permanent: true,
      },
    ];
  },
  outputFileTracingIncludes: {
    "/opengraph-image": ogFontFiles,
    "/lessons/opengraph-image": ogFontFiles,
    "/lessons/\\[slug\\]/opengraph-image": ogFontFiles,
    "/badge/\\[token\\]/opengraph-image": ogFontFiles,
  },
};

export default nextConfig;
