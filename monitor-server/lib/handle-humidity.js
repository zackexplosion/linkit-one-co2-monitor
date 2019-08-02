const config = require('../config.js')
const got = require('got')

let sensors_status
module.exports = ({
  onCO2SensorRecieve,
  io
  })=> {
  const sensorsIO = io.of('/humidity')

  // init status
  sensorsIO.on('connection', socket => {
    socket.emit('updateHumidityStatus', sensors_status)
  })

  setInterval(function(){
    sensorsIO.emit('updateHumidityStatus', sensors_status)
  }, 1000)

  function getSensorData() {
    config.devices.filter(d => d.type == 'humidity').forEach(async sensor => {
      try {
        const response = await got('http://' + sensor.ip, {
          json: true,
          timeout: 500
        })

        console.log(response.body)
      } catch (error) {
        console.log(error.code)
      }
    })

    setTimeout(getSensorData, 1000)
  }

  getSensorData()
}