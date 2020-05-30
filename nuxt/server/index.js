let http = require('http')
const app = require('express')()
http = http.Server(app)
const isDev = process.env.NODE_ENV !== 'production'
const port = process.env.PORT || 3000
const request = require('axios')
// const moment = require('moment')
const io = require('socket.io')(http, { origins: '*:*' })
const { loadNuxt, build } = require('nuxt')
async function start() {
  // We get Nuxt instance
  const nuxt = await loadNuxt(isDev ? 'dev' : 'start')

  // Render every route with Nuxt.js
  app.use(nuxt.render)

  // Build only in dev mode with hot-reloading
  if (isDev) {
    build(nuxt)
  }
  // Listen the server
  http.listen(port, '0.0.0.0')
  console.log('Server listening on `localhost:' + port + '`.')

  getSensor()
}
const initData = {
  bathroom: []
}
async function getSensor() {
  try {
    const res = await request('http://10.1.1.3/?token=YEEEEEEE')
    const data = {
      ...res.data, timestamp: new Date().getTime()
    }

    io.emit('sensorUpdate', {
      bathroom: data
    })

    initData.bathroom.push(data)

    if (initData.length >= 60) {
      initData.shift()
    }
  } catch (error) {
    console.error(error)
  }

  setTimeout(getSensor, 5000)
}

class WifiSwitch {
  constructor(options) {
    this.name = options.name
    this.api = options.api
    this.token = options.token
  }

  on() {
    const url = `${this.api}/on?token=${this.token}`
    return request(url)
  }

  off() {
    const url = `${this.api}/off?token=${this.token}`
    return request(url)
  }
}

const SWITCHES = [
  new WifiSwitch({
    name: 'inputFan',
    api: 'http://10.1.1.28',
    token: 'YEEEEEEE'
  })
]

io.on('connection', async(socket) => {
  console.log(socket.id, 'on connection')
  var switchesStatus = []
  try {
    const switches = await Promise.all(SWITCHES.map(s => {
      return request(s.api)
    }))

    switches.forEach((s, index) => {
      switchesStatus.push({
        name: SWITCHES[index].name,
        uptime: s.data.uptime,
        status: (s.data.isSwitchOn === 1)
      })
    })
  } catch (error) {
    console.error(error)
  }
  initData.switchesStatus = switchesStatus
  socket.emit('setInitData', initData)

  socket.on('changeSwitchStatus', _switch => {
    console.log('switch', _switch)
    const __switch = SWITCHES.find(_ => {
      return _.name === _switch.name
    })

    if (!__switch) return

    if (_switch.status) {
      __switch.on()
    } else {
      __switch.off()
    }
  })
})

start()
