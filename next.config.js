module.exports = {
  reactStrictMode: true,
  experimental: { images: { layoutRaw: true } },
  basePath: process.env.NODE_ENV == "production" ? "/te-web" : "/",
}
