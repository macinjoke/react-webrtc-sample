import React from 'react'
// import { shallowEqual } from 'shallow-equal-object'
import io from 'socket.io-client'

interface Props {}
interface State {
  isInitiator: boolean
  isStarted: boolean
  context?: CanvasRenderingContext2D
  socket?: SocketIOClient.Socket
  peerConnection?: RTCPeerConnection
  dataChannel?: RTCDataChannel
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
class Sample6 extends React.Component<Props, State> {
  private localVideoRef: React.RefObject<HTMLVideoElement>
  private snappedCanvasRef: React.RefObject<HTMLCanvasElement>
  private incomingCanvasRef: React.RefObject<HTMLCanvasElement>
  private buf: Uint8ClampedArray | undefined
  private count: number

  public constructor(props: Props) {
    super(props)
    this.localVideoRef = React.createRef()
    this.snappedCanvasRef = React.createRef()
    this.incomingCanvasRef = React.createRef()
    this.count = 0
    const socket = io.connect('http://localhost:8000')
    this.state = {
      isInitiator: false,
      isStarted: false,
      socket,
    }
    const room = 'foo' as string
    if (room !== '') {
      console.log('Asking to join room ' + room)
      socket.emit('create or join', room)
    }

    socket.on('created', async (room: string, clientId: string) => {
      console.log(room, clientId)
      this.setState({ isInitiator: true })
      await this.grabWebCamVideo()
    })

    socket.on('full', (room: string) => {
      console.log('Room ' + room + ' is full :^(')
    })

    socket.on('ipaddr', (ipaddr: string) => {
      console.log('Server IP address is ' + ipaddr)
    })

    socket.on('joined', (room: string, clientId: string) => {
      console.log(room, clientId)
      this.grabWebCamVideo()
      this.receiverStart()
    })

    socket.on('ready', async () => {
      const { isInitiator } = this.state
      console.log('ready')
      if (isInitiator) {
        await this.initiatorStart()
      }
    })

    socket.on('log', (text: string) => {
      console.log(text)
    })

    const messageEventTarget = new EventTarget()
    messageEventTarget.addEventListener('bye', () => {
      console.log('Session terminated.')
      if (this.state.peerConnection) this.state.peerConnection.close()
      this.setState({
        isStarted: false,
        isInitiator: true,
      })
    })
    messageEventTarget.addEventListener('offer', async (e: any) => {
      const message = e.detail
      // if (!this.state.isInitiator && !this.state.isStarted) {
      //   await this.receiverStart()
      // }
      if (!this.state.peerConnection) return
      this.state.peerConnection.setRemoteDescription(
        new RTCSessionDescription(message),
      )
      console.log('Sending answer to peer.')
      const description = await this.state.peerConnection.createAnswer()
      this.setLocalAndSendMessage(description)
    })
    messageEventTarget.addEventListener('answer', async (e: any) => {
      const message = e.detail
      if (!this.state.peerConnection) return
      this.state.peerConnection.setRemoteDescription(
        new RTCSessionDescription(message),
      )
    })
    messageEventTarget.addEventListener('candidate', async (e: any) => {
      const message = e.detail
      if (!this.state.peerConnection || !this.state.isStarted) return
      const candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate,
      })
      this.state.peerConnection.addIceCandidate(candidate)
    })

    socket.on('message', async (message: Message) => {
      console.log('Client received message:', message)
      if (typeof message === 'string') {
        messageEventTarget.dispatchEvent(new Event(message))
      } else {
        messageEventTarget.dispatchEvent(
          new CustomEvent(message.type, { detail: message }),
        )
      }
    })
    window.onbeforeunload = () => {
      this.sendMessage('bye')
    }
  }

  public async componentDidMount() {
    console.log(`hostname: ${location.hostname}`)
    const snappedCanvas = this.snappedCanvasRef.current
    if (!snappedCanvas) return
    const context = snappedCanvas.getContext('2d')
    if (context) this.setState({ context })
  }

  public async componentWillUnmount() {
    const { peerConnection, socket } = this.state
    if (peerConnection) peerConnection.close()
    this.sendMessage('bye')
    if (socket) socket.close()
  }

  // public shouldComponentUpdate(
  //   nextProps: Readonly<Props>,
  //   nextState: Readonly<State>,
  // ): boolean {
  //   console.log(nextProps, nextState)
  //   if (!shallowEqual(nextState, this.state)) return true
  //   const prevDataChannel = this.state.dataChannel
  //   const nextDataChannel = nextState.dataChannel
  //   if (prevDataChannel && nextDataChannel) {
  //     if (prevDataChannel.readyState !== nextDataChannel.readyState) return true
  //   }
  //   return false
  // }

  public render() {
    const { isInitiator, dataChannel } = this.state
    return (
      <div>
        <h2>Sample 6</h2>
        <p>isInitiator: {String(isInitiator)}</p>
        <p>dataChannel.readyState: {dataChannel && dataChannel.readyState}</p>
        <video
          ref={this.localVideoRef}
          style={{ width: '320px', maxWidth: '100%' }}
          autoPlay
          playsInline
        />
        <canvas
          ref={this.snappedCanvasRef}
          style={{ width: '320px', height: '240px' }}
        />
        <div>
          <button onClick={this.onSnapClick}>Snap</button>
          <span> then </span>
          <button onClick={this.onSendClick}>Send</button>
          <span> or </span>
          <button onClick={this.onSnapAndSendClick}>Snap &amp; Send</button>
        </div>
        <div>
          <h2>Incoming photos</h2>
          <canvas
            ref={this.incomingCanvasRef}
            style={{ width: '320px', height: '240px' }}
          />
        </div>
      </div>
    )
  }

  private onSnapClick = () => {
    const { context } = this.state
    const video = this.localVideoRef.current
    const canvas = this.snappedCanvasRef.current
    if (!context || !video || !canvas) return
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    // TODO show canvas and send button
  }
  private onSendClick = () => {
    // Split data channel message in chunks of this byte length.
    const { context, dataChannel } = this.state
    const canvas = this.snappedCanvasRef.current
    if (!context || !canvas) return
    const CHUNK_LEN = 64000
    console.log('width and height ', canvas.width, canvas.height)
    const img = context.getImageData(0, 0, canvas.width, canvas.height)
    const len = img.data.byteLength as any
    const n = (len / CHUNK_LEN) | 0

    console.log('Sending a total of ' + len + ' byte(s)')

    if (!dataChannel) {
      console.log('Connection has not been initiated.')
      return
    } else if (dataChannel.readyState === 'closed') {
      console.log('Connection was lost. Peer closed the connection.')
      return
    }

    dataChannel.send(len)

    // split the photo and send in chunks of about 64KB
    for (var i = 0; i < n; i++) {
      var start = i * CHUNK_LEN,
        end = (i + 1) * CHUNK_LEN
      console.log(start + ' - ' + (end - 1))
      dataChannel.send(img.data.subarray(start, end))
    }

    // send the reminder, if any
    if (len % CHUNK_LEN) {
      console.log('last ' + (len % CHUNK_LEN) + ' byte(s)')
      dataChannel.send(img.data.subarray(n * CHUNK_LEN))
    }
  }
  private onSnapAndSendClick = () => {
    this.onSnapClick()
    this.onSendClick()
  }

  private grabWebCamVideo = async () => {
    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
    })
    const video = this.localVideoRef.current
    if (!video) return
    video.srcObject = localStream
    video.onloadedmetadata = () => {
      const canvas = this.snappedCanvasRef.current
      if (!canvas) return
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      console.log(
        'gotStream with width and height:',
        canvas.width,
        canvas.height,
      )
    }
    this.sendMessage('got user media')
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

  private createPeerConnection = (): RTCPeerConnection | undefined => {
    console.log('>>>>>> creating peer connection')
    const peerConnection = new RTCPeerConnection()
    peerConnection.onicecandidate = this.onicecandidate
    this.setState({ peerConnection, isStarted: true })
    return peerConnection
  }

  private onDataChannelCreated = (dataChannel: RTCDataChannel) => {
    dataChannel.onopen = () => {
      console.log('CHANNEL opened!')
      // TODO
    }
    dataChannel.onclose = () => {
      console.log('CHANNEL closed!')
      // TODO
    }
    dataChannel.onmessage = event => {
      if (typeof event.data === 'string') {
        const buf = new Uint8ClampedArray(parseInt(event.data))
        console.log('Expecting a total of ' + buf.byteLength + ' bytes')
        this.buf = buf
        this.count = 0
        return
      }
      if (!this.buf) return
      const data = new Uint8ClampedArray(event.data)
      this.buf.set(data, this.count)
      this.count = this.count + data.byteLength
      console.log('count: ' + this.count)

      if (this.count === this.buf.byteLength) {
        // we're done: all data chunks have been received
        console.log('Done. Rendering photo.')
        this.renderPhoto(this.buf)
      }
    }
  }

  private renderPhoto = (data: Uint8ClampedArray) => {
    const canvas = this.incomingCanvasRef.current
    const video = this.localVideoRef.current
    if (!canvas || !video) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.classList.add('incomingPhoto')

    // TODO contextやwidth周り
    const context = canvas.getContext('2d')
    if (!context) return
    const img = context.createImageData(canvas.width, canvas.height)
    img.data.set(data)
    context.putImageData(img, 0, 0)
  }

  private initiatorStart = async () => {
    const { isStarted } = this.state
    console.log('>>>>>>> initiatorStart() ', isStarted)
    if (!isStarted) {
      const peerConnection = this.createPeerConnection()
      if (!peerConnection) return
      const dataChannel = peerConnection.createDataChannel('photos')
      this.onDataChannelCreated(dataChannel)
      this.setState({ dataChannel })
      console.log('Sending offer to peer')
      const description = await peerConnection.createOffer()
      this.setLocalAndSendMessage(description)
    }
  }

  private receiverStart = async () => {
    const { isStarted } = this.state
    console.log('>>>>>>> receiverStart() ', isStarted)
    if (!isStarted) {
      const peerConnection = this.createPeerConnection()
      if (!peerConnection) return
      peerConnection.ondatachannel = event => {
        console.log('ondatachannel:', event.channel)
        const dataChannel = event.channel
        this.onDataChannelCreated(dataChannel)
        this.setState({ dataChannel })
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

export default Sample6
