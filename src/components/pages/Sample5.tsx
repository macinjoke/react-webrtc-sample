import React from 'react'
import io from 'socket.io-client'

interface Props {}
interface State {
  isInitiator: boolean
  isStarted: boolean
  isChannelReady: boolean
  socket?: SocketIOClient.Socket
  localStream?: MediaStream
  remoteStream?: MediaStream
  peerConnection?: RTCPeerConnection
}

interface CandidateMessage {
  type: 'candidate'
  label: number | null
  id: string | null
  candidate: string
}

type TextMessage = 'got user media' | 'bye'

type Message = TextMessage | RTCSessionDescriptionInit | CandidateMessage

/**
 * Signaling and Peer Connection video
 */
class Sample5 extends React.Component<Props, State> {
  private localVideoRef: React.RefObject<HTMLVideoElement>
  private remoteVideoRef: React.RefObject<HTMLVideoElement>

  public constructor(props: Props) {
    super(props)
    this.localVideoRef = React.createRef()
    this.remoteVideoRef = React.createRef()
    const socket = io.connect('http://localhost:8000')
    this.state = {
      isInitiator: false,
      isStarted: false,
      isChannelReady: false,
      socket,
    }
    const room = 'foo' as string
    if (room !== '') {
      console.log('Asking to join room ' + room)
      socket.emit('create or join', room)
    }

    socket.on('created', (room: string, clientId: string) => {
      console.log(room, clientId)
      this.setState({ isInitiator: true })
    })

    socket.on('full', (room: string) => {
      console.log('Room ' + room + ' is full :^(')
    })

    socket.on('ipaddr', (ipaddr: string) => {
      console.log('Server IP address is ' + ipaddr)
    })

    socket.on('join', (room: string) => {
      console.log('Another peer made a request to join room ' + room)
      console.log('This peer is the initiator of room ' + room + '!')
      this.setState({ isChannelReady: true })
    })

    socket.on('joined', (room: string, clientId: string) => {
      console.log(room, clientId)
      this.setState({ isChannelReady: true })
    })

    socket.on('log', (text: string) => {
      console.log(text)
    })

    socket.on('message', async (message: Message) => {
      if (message === 'got user media') {
        this.maybeStart()
      } else if (message === 'bye') {
        console.log('Session terminated.')
        if (this.state.peerConnection) this.state.peerConnection.close()
        this.setState({
          isStarted: false,
          isChannelReady: false,
          isInitiator: true,
        })
      } else if (message.type === 'offer') {
        if (!this.state.isInitiator && !this.state.isStarted) {
          await this.maybeStart()
        }
        if (!this.state.peerConnection) return
        this.state.peerConnection.setRemoteDescription(
          new RTCSessionDescription(message),
        )
        console.log('Sending answer to peer.')
        const description = await this.state.peerConnection.createAnswer()
        this.setLocalAndSendMessage(description)
      } else if (message.type === 'answer') {
        if (!this.state.peerConnection) return
        this.state.peerConnection.setRemoteDescription(
          new RTCSessionDescription(message),
        )
      } else if (message.type === 'candidate') {
        if (!this.state.peerConnection || !this.state.isStarted) return
        const candidate = new RTCIceCandidate({
          sdpMLineIndex: message.label,
          candidate: message.candidate,
        })
        this.state.peerConnection.addIceCandidate(candidate)
      }
    })
  }

  public async componentDidMount() {
    console.log(`hostname: ${location.hostname}`)

    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
    })
    if (this.localVideoRef.current) {
      this.localVideoRef.current.srcObject = localStream
      this.setState({ localStream: localStream })
      this.sendMessage('got user media')
    }
    window.onbeforeunload = () => {
      this.sendMessage('bye')
    }
  }

  public async componentWillUnmount() {
    const { peerConnection, localStream, socket } = this.state
    if (peerConnection) peerConnection.close()
    if (localStream) localStream.getTracks()[0].stop()
    this.sendMessage('bye')
    if (socket) socket.close()
  }

  public render() {
    const { isStarted, isChannelReady, isInitiator } = this.state
    return (
      <div>
        <h2>Sample 5</h2>
        <p>isStarted: {String(isStarted)},</p>
        <p>isChannelReady: {String(isChannelReady)}</p>
        <p>isInitiator: {String(isInitiator)}</p>
        <video
          ref={this.localVideoRef}
          style={{ width: '320px', maxWidth: '100%' }}
          autoPlay
          playsInline
        />
        <video
          ref={this.remoteVideoRef}
          style={{ width: '320px', maxWidth: '100%' }}
          autoPlay
          playsInline
        />
      </div>
    )
  }

  private maybeStart = async () => {
    const { isInitiator, isStarted, isChannelReady, localStream } = this.state
    console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady)
    if (!isStarted && localStream && isChannelReady) {
      console.log('>>>>>> creating peer connection')
      const peerConnection = new RTCPeerConnection()
      peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        console.log('icecandidate event: ', event)
        if (event.candidate) {
          this.sendMessage({
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
          })
        } else {
          console.log('End of candidates.')
        }
      }
      peerConnection.ontrack = (event: RTCTrackEvent) => {
        console.log('ontrack')
        if (!this.remoteVideoRef.current) return
        if (event.streams && event.streams[0]) return
        const remoteStream = new MediaStream()
        remoteStream.addTrack(event.track)
        this.remoteVideoRef.current.srcObject = remoteStream
        this.setState({ remoteStream })
      }
      console.log('Created RTCPeerConnnection')
      peerConnection.addTrack(localStream.getVideoTracks()[0])
      this.setState({ peerConnection, isStarted: true })
      console.log('isInitiator', isInitiator)
      if (isInitiator) {
        console.log('Sending offer to peer')
        const description = await peerConnection.createOffer()
        this.setLocalAndSendMessage(description)
      }
    }
  }

  private sendMessage = (message: Message) => {
    const { socket } = this.state
    if (!socket) return
    console.log('Client sending message: ', message)
    socket.emit('message', message)
  }

  private setLocalAndSendMessage = (description: RTCSessionDescriptionInit) => {
    const { peerConnection } = this.state
    if (!peerConnection) return
    peerConnection.setLocalDescription(description)
    this.sendMessage(description)
  }
}

export default Sample5
