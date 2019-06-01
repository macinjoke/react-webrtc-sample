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
 * Signaling and Peer Connection video
 */
class Sample5 extends React.Component<Props, State> {
  private localVideoRef: React.RefObject<HTMLVideoElement>
  private remoteVideoRef: React.RefObject<HTMLVideoElement>
  private socket: SocketIOClient.Socket
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

    this.socket.on('message', async (message: Message) => {
      if (message === 'got user media') {
        this.maybeStart()
      } else if (message === 'bye') {
        console.log('Session terminated.')
        if (this.peerConnection) this.peerConnection.close()
        this.setState({
          isStarted: false,
          isChannelReady: false,
          isInitiator: true,
        })
      } else if (message.type === 'offer') {
        if (!this.state.isInitiator && !this.state.isStarted) {
          await this.maybeStart()
        }
        if (!this.peerConnection) return
        this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(message),
        )
        console.log('Sending answer to peer.')
        const description = await this.peerConnection.createAnswer()
        this.setLocalAndSendMessage(description)
      } else if (message.type === 'answer') {
        if (!this.peerConnection) return
        this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(message),
        )
      } else if (message.type === 'candidate') {
        if (!this.peerConnection || !this.state.isStarted) return
        const candidate = new RTCIceCandidate({
          sdpMLineIndex: message.label,
          candidate: message.candidate,
        })
        this.peerConnection.addIceCandidate(candidate)
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
    window.onbeforeunload = () => {
      this.sendMessage('bye')
    }
  }

  public async componentWillUnmount() {
    if (this.peerConnection) this.peerConnection.close()
    if (this.localStream) this.localStream.getTracks()[0].stop()
    this.sendMessage('bye')
    this.socket.close()
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
    const { isInitiator, isStarted, isChannelReady } = this.state
    console.log('>>>>>>> maybeStart() ', isStarted, isChannelReady)
    if (!isStarted && this.localStream && isChannelReady) {
      console.log('>>>>>> creating peer connection')
      this.peerConnection = new RTCPeerConnection()
      this.peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
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
      this.peerConnection.ontrack = (event: RTCTrackEvent) => {
        console.log('ontrack')
        if (!this.remoteVideoRef.current) return
        if (event.streams && event.streams[0]) return
        this.remoteStream = new MediaStream()
        this.remoteStream.addTrack(event.track)
        this.remoteVideoRef.current.srcObject = this.remoteStream
      }
      console.log('Created RTCPeerConnnection')
      this.peerConnection.addTrack(this.localStream.getVideoTracks()[0])
      this.setState({ isStarted: true })
      console.log('isInitiator', isInitiator)
      if (isInitiator) {
        console.log('Sending offer to peer')
        const description = await this.peerConnection.createOffer()
        this.setLocalAndSendMessage(description)
      }
    }
  }

  private sendMessage = (message: Message) => {
    console.log('Client sending message: ', message)
    this.socket.emit('message', message)
  }

  private setLocalAndSendMessage = (description: RTCSessionDescriptionInit) => {
    if (!this.peerConnection) return
    this.peerConnection.setLocalDescription(description)
    this.sendMessage(description)
  }
}

export default Sample5
