import React from 'react'
import io from 'socket.io-client'

interface Props {}

/**
 * communicate to a signaling server
 */
class Sample4 extends React.Component<Props> {
  private socket: SocketIOClient.Socket
  public constructor(props: Props) {
    super(props)
    this.socket = io.connect('http://localhost:8000')
    const room = prompt('Enter room name:')
    if (room !== '') {
      console.log('Message from client: Asking to join room ' + room)
      this.socket.emit('create or join', room)
    }

    this.socket.on('created', (room: string, clientId: string) => {
      console.log(room, clientId)
    })

    this.socket.on('full', (room: string) => {
      console.log('Message from client: Room ' + room + ' is full :^(')
    })

    this.socket.on('ipaddr', (ipaddr: string) => {
      console.log('Message from client: Server IP address is ' + ipaddr)
    })

    this.socket.on('joined', (room: string, clientId: string) => {
      console.log(room, clientId)
    })

    this.socket.on('log', (text: string) => {
      console.log(text)
    })
  }

  public async componentWillUnmount() {
    this.socket.close()
  }

  public render() {
    return (
      <div>
        <h2>Sample 4</h2>
        <p>
          communicate to a signaling server. run <b>yarn start:server</b>
        </p>
      </div>
    )
  }
}

export default Sample4
