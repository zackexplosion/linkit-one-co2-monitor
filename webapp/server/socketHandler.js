const request = require('axios')
const { SWITCHES, SENSORS } = require('./config')

const initData = {
  sensors: {}
}

async function getSensorsStatus() {
  var results = []
  try {
    await Promise.all(SENSORS.map(s => {
      var url = s.api
      if (s.token) {
        url = url + `?token=${s.token}`
      }
      return request({
        url,
        timeout: 1000
      }).then(res => {
        var { uptime } = res.data
        switch (s.uptimeFormat) {
          case 's':
            uptime = uptime * 1000
            break
        }
        results.push({
          ...res.data,
          name: s.name,
          uptime,
          timestamp: new Date().getTime()
        })
      })
    }))
  } catch (error) {
    console.error(error.address, error.code)
  }

  return results
}

async function getSwitchesStatus() {
  var switchesStatus = []
  try {
    const promises = await Promise.all(SWITCHES.map(s => {
      return request(s.api)
    }))

    promises.forEach((s, index) => {
      switchesStatus.push({
        name: SWITCHES[index].name,
        uptime: s.data.uptime,
        status: (s.data.isSwitchOn === 1)
      })
    })
  } catch (error) {
    console.error(error)
  }

  return switchesStatus
}

module.exports = async(em, io, db) => {
  // setup sensors initdata
  // SENSORS.forEach(async s => {
  //   initData['sensors'][s.name] = await db.SensorsLog.find({name: s.name}).limit(100).exec()
  // })
  try {
    for (const i in SENSORS) {
      const s = SENSORS[i]
      const data = await db.SensorsLog.find({ name: s.name }).limit(100).exec()

      initData['sensors'][s.name] = data
    }
    console.log('initData', initData)
  } catch (error) {
    console.error(error)
  }

  (async function getSensorsStatusRunner() {
    var dataToUpdate = {}
    var sensorsData = []
    try {
      sensorsData = await getSensorsStatus()
    } catch (error) {
      console.error(error)
    }

    var saveDataPromises = []
    for (var i in sensorsData) {
      const d = sensorsData[i]

      const s = db.SensorsLog.create({
        name: d.name,
        temperature: d.temperature || 0,
        humidity: d.humidity || 0,
        co2ppm: d.co2ppm || 0,
        timestamp: new Date()
      })
      saveDataPromises.push(s)
    }

    await Promise.all(saveDataPromises)
    // console.log(dd)

    sensorsData.forEach(d => {
      if (initData['sensors'][d.name].length > 100) {
        initData['sensors'][d.name].shift()
      }
      initData['sensors'][d.name].push(d)
    })

    sensorsData.forEach(s => {
      dataToUpdate[s.name] = s
    })

    if (Object.keys(dataToUpdate).length > 0) {
      io.emit('updateSensors', dataToUpdate)
      em.emit('updateSensors', dataToUpdate)
    }

    setTimeout(getSensorsStatusRunner, 5000)
  })();

  (async function switchesStatusRunner() {
    var status = {
      switchesStatus: []
    }
    try {
      const s = await getSwitchesStatus()
      status.switchesStatus = s
      io.emit('updateSwitchStatus', status)
    } catch (error) {
      console.error(error)
    }

    setTimeout(() => {
      switchesStatusRunner()
    }, 1000)
  })()

  io.on('connection', async(socket) => {
    try {
      initData['switchesStatus'] = await getSwitchesStatus()
      initData['sensorsStatus'] = await getSensorsStatus()
    } catch (error) {
      initData['switchesStatus'] = []
    }

    console.log('seding init data', initData)

    socket.emit('setInitData', initData)

    socket.on('changeSwitchStatus', _switch => {
      const s = SWITCHES.find(_ => {
        return _.name === _switch.name
      })

      if (!s) return
      // switch on/off
      (_switch.status) ? s.on() : s.off()
    })
  })
}
