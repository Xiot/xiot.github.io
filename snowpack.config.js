/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  exclude: ["scripts/**/*"],
  installOptions: {
    sourceMap: true,
    externalPackage: [
      "@web/dev-server",
      "@web/dev-server-core"
    ]
  },
  devOptions: {
    port: 3001,
    secure: true
  },
  buildOptions: {
    out: 'dist',
    metaDir: 'meta/snowpack',
    sourceMaps: true,
    clean: true,
  },
  mount: {
    public: {url: '/', static: true},
    src: {url: '/js'}
  }
}