import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets phones on the same Wi-Fi load the dev server during local testing.
  allowedDevOrigins: ["192.168.8.131"],
};

export default nextConfig;
