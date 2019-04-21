import React from 'react'
import io from 'socket.io-client'

interface Props {}
interface State {
  isInitiator: boolean
  socket?: SocketIOClient.Socket
}

/**
 * communicate to a signaling server
 */
class Sample4 extends React.Component<Props, State> {
  public constructor(props: Props) {
    super(props)
    this.state = { isInitiator: false }
  }

  public componentDidMount(): void {
    const socket = io.connect('http://localhost:8000')
    const room = prompt('Enter room name:')
    if (room !== '') {
      console.log('Message from client: Asking to join room ' + room)
      socket.emit('create or join', room)
    }

    socket.on('created', (room: string, clientId: string) => {
      console.log(room, clientId)
      this.setState({ isInitiator: true })
    })

    socket.on('full', (room: string) => {
      console.log('Message from client: Room ' + room + ' is full :^(')
    })

    socket.on('ipaddr', (ipaddr: string) => {
      console.log('Message from client: Server IP address is ' + ipaddr)
    })

    socket.on('joined', (room: string, clientId: string) => {
      console.log(room, clientId)
      this.setState({ isInitiator: false })
    })

    socket.on('log', (text: string) => {
      console.log(text)
    })
    this.setState({ socket })
  }

  public render() {
    return (
      <div>
        <h2>Sample 4</h2>
      </div>
    )
  }
}

export default Sample4
