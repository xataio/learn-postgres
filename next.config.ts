import type { NextConfig } from "next";

// The opengraph-image routes read these ttf files at request time; make sure
// output file tracing bundles them into the deployed functions.
const ogFontFiles = ["./assets/og/*.ttf"];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/opengraph-image": ogFontFiles,
    "/lessons/opengraph-image": ogFontFiles,
    "/lessons/\\[slug\\]/opengraph-image": ogFontFiles,
    "/badge/\\[token\\]/opengraph-image": ogFontFiles,
  },
};

export default nextConfig;
