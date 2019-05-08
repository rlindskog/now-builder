const path = require('path')
const http = require('http')
const resolveFrom = require('resolve-from')

process.on('unhandledRejection', err => {
  console.error('Exiting builder due to build error:')
  console.error(err)
  process.exit(1)
})

const runtimeEnv = JSON.parse(Buffer.from(process.argv[2], 'base64').toString())
const { Nuxt, Builder } = require(resolveFrom(process.cwd(), runtimeEnv.NUXT_DEP_NAME))

const nuxtConfig = require(path.resolve(process.cwd(), 'nuxt.config.js'))

// Create a new Nuxt instance
const nuxt = new Nuxt(nuxtConfig)

nuxt.options.dev = true

// Enable live build & reloading on dev
new Builder(nuxt).build()

const port = 3000
const url = `http://localhost:${port}`

http.createServer(nuxt.render).listen(port, () => {
  if (process.send) {
    process.send(url)
  }
})