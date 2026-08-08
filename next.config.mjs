/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : []),
      "pino-pretty",
      "lokijs",
      "encoding",
      function ({ context, request }, callback) {
        if (/^@x402\//.test(request)) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      }
    ];
    return config;
  },
};

export default nextConfig;
