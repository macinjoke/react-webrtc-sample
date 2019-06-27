import React from 'react'
import io from 'socket.io-client'

interface Props {}
interface State {
  isInitiator: boolean
  isStarted: boolean
  isChannelReady: boolean
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
 * Signaling and video Peer Connection
 */
// eslint-disable-next-line @typescript-eslint/camelcase, @typescript-eslint/class-name-casing
class Sample5 extends React.Component<Props, State> {
  private localVideoRef: React.RefObject<HTMLVideoElement>
  private remoteVideoRef: React.RefObject<HTMLVideoElement>
  private socket?: SocketIOClient.Socket
  private localStream?: MediaStream
  private remoteStream?: MediaStream
  private peerConnection?: RTCPeerConnection

  public constructor(props: Props) {
    super(props)
    this.localVideoRef = React.createRef()
    this.remoteVideoRef = React.createRef()
    this.socket = io.connect('http://localhost:8000')
    this.state = {
      isInitiator: false,
      isStarted: false,
      isChannelReady: false,
    }
    const room = 'foo' as string
    if (room !== '') {
      console.log('Asking to join room ' + room)
      this.socket.emit('create or join', room)
    }

    this.socket.on('created', (room: string, clientId: string) => {
      console.log(room, clientId)
      this.setState({ isInitiator: true })
    })

    this.socket.on('full', (room: string) => {
      console.log('Room ' + room + ' is full :^(')
    })

    this.socket.on('ipaddr', (ipaddr: string) => {
      console.log('Server IP address is ' + ipaddr)
    })

    this.socket.on('join', (room: string) => {
      console.log('Another peer made a request to join room ' + room)
      console.log('This peer is the initiator of room ' + room + '!')
      this.setState({ isChannelReady: true })
    })

    this.socket.on('joined', (room: string, clientId: string) => {
      console.log(room, clientId)
      this.setState({ isChannelReady: true })
    })

    this.socket.on('log', (text: string) => {
      console.log(text)
    })

    const messageEventTarget = new EventTarget()
    messageEventTarget.addEventListener('got user media', () => {
      this.initiatorStart()
    })
    messageEventTarget.addEventListener('bye', () => {
      console.log('Session terminated.')
      if (this.peerConnection) this.peerConnection.close()
      this.setState({
        isStarted: false,
        isChannelReady: false,
        isInitiator: true,
      })
    })
    messageEventTarget.addEventListener('offer', async (e: any) => {
      const message = e.detail
      if (!this.state.isInitiator && !this.state.isStarted) {
        await this.receiverStart()
      }
      if (!this.peerConnection) return
      this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(message),
      )
      console.log('Sending answer to peer.')
      const description = await this.peerConnection.createAnswer()
      this.setLocalAndSendMessage(description)
    })
    messageEventTarget.addEventListener('answer', async (e: any) => {
      const message = e.detail
      if (!this.peerConnection) return
      this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(message),
      )
    })
    messageEventTarget.addEventListener('candidate', async (e: any) => {
      const message = e.detail
      if (!this.peerConnection || !this.state.isStarted) return
      const candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate,
      })
      this.peerConnection.addIceCandidate(candidate)
    })

    this.socket.on('message', async (message: Message) => {
      if (typeof message === 'string') {
        messageEventTarget.dispatchEvent(new Event(message))
      } else {
        messageEventTarget.dispatchEvent(
          new CustomEvent(message.type, { detail: message }),
        )
      }
    })
  }

  public async componentDidMount() {
    console.log(`hostname: ${location.hostname}`)

    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
    })
    if (this.localVideoRef.current) {
      this.localVideoRef.current.srcObject = this.localStream
      this.sendMessage('got user media')
    }
    window.addEventListener('beforeunload', () => {
      this.sendMessage('bye')
    })
  }

  public async componentWillUnmount() {
    if (this.peerConnection) this.peerConnection.close()
    if (this.localStream) this.localStream.getTracks()[0].stop()
    this.sendMessage('bye')
    if (this.socket) this.socket.close()
  }

  public render() {
    const { isStarted, isChannelReady, isInitiator } = this.state
    return (
      <div>
        <h2>Sample 5</h2>
        <p>Signaling and video Peer Connection</p>
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

  private onicecandidate = (event: RTCPeerConnectionIceEvent) => {
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

  private ontrack = (event: RTCTrackEvent) => {
    console.log('ontrack')
    if (!this.remoteVideoRef.current) return
    if (event.streams && event.streams[0]) return
    this.remoteStream = new MediaStream()
    this.remoteStream.addTrack(event.track)
    this.remoteVideoRef.current.srcObject = this.remoteStream
  }

  private createPeer = (): RTCPeerConnection | undefined => {
    console.log('>>>>>> creating peer connection')
    if (!this.localStream) return
    this.peerConnection = new RTCPeerConnection()
    this.peerConnection.addEventListener('icecandidate', this.onicecandidate)
    this.peerConnection.addEventListener('track', this.ontrack)
    this.peerConnection.addTrack(this.localStream.getVideoTracks()[0])
    this.setState({ isStarted: true })
    return this.peerConnection
  }

  private initiatorStart = async () => {
    const { isStarted, isChannelReady } = this.state
    console.log('>>>>>>> initiatorStart() ', isStarted, isChannelReady)
    if (!isStarted && isChannelReady) {
      this.peerConnection = this.createPeer()
      if (!this.peerConnection) return
      console.log('Sending offer to peer')
      const description = await this.peerConnection.createOffer()
      this.setLocalAndSendMessage(description)
    }
  }

  private receiverStart = async () => {
    const { isStarted, isChannelReady } = this.state
    console.log('>>>>>>> receiverStart() ', isStarted, isChannelReady)
    if (!isStarted && isChannelReady) {
      this.createPeer()
    }
  }

  private sendMessage = (message: Message) => {
    if (!this.socket) return
    console.log('Client sending message: ', message)
    this.socket.emit('message', message)
  }

  private setLocalAndSendMessage = (description: RTCSessionDescriptionInit) => {
    if (!this.peerConnection) return
    this.peerConnection.setLocalDescription(description)
    this.sendMessage(description)
  }
}

// eslint-disable-next-line @typescript-eslint/camelcase
export default Sample5
