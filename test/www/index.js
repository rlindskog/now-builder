const path = require('path')
const http = require('http')

const { Nuxt, Builder } = require('nuxt-edge')

const nuxtConfig = require('./nuxt.config.js')

// Create a new Nuxt instance
const nuxt = new Nuxt(nuxtConfig)

nuxt.options.dev = true

// Enable live build & reloading on dev
new Builder(nuxt).build(3000)

http.createServer(nuxt.render).listen(3000)