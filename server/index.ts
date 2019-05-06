import os from 'os'
import http from 'http'
import socketIO from 'socket.io'

const app = http.createServer().listen(8000)
console.log('listen 8000...')

const io = socketIO.listen(app)
io.sockets.on('connection', socket => {
  // convenience function to log server messages on the client
  function log(text: string) {
    socket.emit('log', `Message from server: ${text}`)
  }

  socket.on('message', message => {
    log(`Client said: ${message}`)
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit('message', message)
  })

  socket.on('create or join', room => {
    log('Received request to create or join room ' + room)

    const clientsInRoom = io.sockets.adapter.rooms[room]
    const numClients = clientsInRoom ? clientsInRoom.length : 0
    log('Room ' + room + ' now has ' + numClients + ' client(s)')

    if (numClients === 0) {
      socket.join(room)
      log('Client ID ' + socket.id + ' created room ' + room)
      socket.emit('created', room, socket.id)
    } else if (numClients === 1) {
      log('Client ID ' + socket.id + ' joined room ' + room)
      socket.join(room)
      socket.emit('joined', room, socket.id)
      io.sockets.in(room).emit('ready')
    } else {
      // max two clients
      socket.emit('full', room)
    }
  })

  socket.on('ipaddr', () => {
    const ifaces = os.networkInterfaces()
    for (const dev in ifaces) {
      ifaces[dev].forEach(details => {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address)
        }
      })
    }
  })

  socket.on('bye', () => {
    console.log('received bye')
  })

  socket.on('connect', () => {
    console.log('connect')
  })

  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`)
    console.log(Object.keys(io.sockets.connected))
  })
})

io.sockets.on('connect', socket => {
  console.log(`[connect] ${socket.id}`)
  console.log(Object.keys(io.sockets.connected))
})
