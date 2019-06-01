import React from 'react'
// import { shallowEqual } from 'shallow-equal-object'
import io from 'socket.io-client'

interface Props {}
interface State {
  isInitiator: boolean
  isStarted: boolean
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
 * Take a photo and share it via a data channel.
 */
class Sample6 extends React.Component<Props, State> {
  private localVideoRef: React.RefObject<HTMLVideoElement>
  private snappedCanvasRef: React.RefObject<HTMLCanvasElement>
  private incomingCanvasRef: React.RefObject<HTMLCanvasElement>
  private socket: SocketIOClient.Socket
  private peerConnection?: RTCPeerConnection
  private dataChannel?: RTCDataChannel
  private canvasContext?: CanvasRenderingContext2D | null
  private buf: Uint8ClampedArray | undefined
  private count: number

  public constructor(props: Props) {
    super(props)
    this.localVideoRef = React.createRef()
    this.snappedCanvasRef = React.createRef()
    this.incomingCanvasRef = React.createRef()
    this.count = 0
    this.socket = io.connect('http://localhost:8000')
    this.state = {
      isInitiator: false,
      isStarted: false,
    }
    const room = 'foo' as string
    if (room !== '') {
      console.log('Asking to join room ' + room)
      this.socket.emit('create or join', room)
    }

    this.socket.on('created', async (room: string, clientId: string) => {
      console.log(room, clientId)
      this.setState({ isInitiator: true })
      await this.grabWebCamVideo()
    })

    this.socket.on('full', (room: string) => {
      console.log('Room ' + room + ' is full :^(')
    })

    this.socket.on('ipaddr', (ipaddr: string) => {
      console.log('Server IP address is ' + ipaddr)
    })

    this.socket.on('joined', (room: string, clientId: string) => {
      console.log(room, clientId)
      this.grabWebCamVideo()
      this.receiverStart()
    })

    this.socket.on('ready', async () => {
      const { isInitiator } = this.state
      console.log('ready')
      if (isInitiator) {
        await this.initiatorStart()
      }
    })

    this.socket.on('log', (text: string) => {
      console.log(text)
    })

    const messageEventTarget = new EventTarget()
    messageEventTarget.addEventListener('bye', () => {
      console.log('Session terminated.')
      if (this.peerConnection) this.peerConnection.close()
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
    window.onbeforeunload = () => {
      this.sendMessage('bye')
    }
  }

  public async componentDidMount() {
    console.log(`hostname: ${location.hostname}`)
    const snappedCanvas = this.snappedCanvasRef.current
    if (!snappedCanvas) return
    this.canvasContext = snappedCanvas.getContext('2d')
  }

  public async componentWillUnmount() {
    if (this.peerConnection) this.peerConnection.close()
    this.sendMessage('bye')
    this.socket.close()
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
    const { isInitiator } = this.state
    return (
      <div>
        <h2>Sample 6</h2>
        <p>isInitiator: {String(isInitiator)}</p>
        <p>dataChannel.readyState: {this.dataChannel && this.dataChannel.readyState}</p>
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
    const video = this.localVideoRef.current
    const canvas = this.snappedCanvasRef.current
    if (!this.canvasContext || !video || !canvas) return
    this.canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height)
    // TODO show canvas and send button
  }
  private onSendClick = () => {
    // Split data channel message in chunks of this byte length.
    const canvas = this.snappedCanvasRef.current
    if (!this.canvasContext || !canvas) return
    const CHUNK_LEN = 64000
    console.log('width and height ', canvas.width, canvas.height)
    const img = this.canvasContext.getImageData(0, 0, canvas.width, canvas.height)
    const len = img.data.byteLength as any
    const n = (len / CHUNK_LEN) | 0

    console.log('Sending a total of ' + len + ' byte(s)')

    if (!this.dataChannel) {
      console.log('Connection has not been initiated.')
      return
    } else if (this.dataChannel.readyState === 'closed') {
      console.log('Connection was lost. Peer closed the connection.')
      return
    }

    this.dataChannel.send(len)

    // split the photo and send in chunks of about 64KB
    for (var i = 0; i < n; i++) {
      var start = i * CHUNK_LEN,
        end = (i + 1) * CHUNK_LEN
      console.log(start + ' - ' + (end - 1))
      this.dataChannel.send(img.data.subarray(start, end))
    }

    // send the reminder, if any
    if (len % CHUNK_LEN) {
      console.log('last ' + (len % CHUNK_LEN) + ' byte(s)')
      this.dataChannel.send(img.data.subarray(n * CHUNK_LEN))
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

  private createPeerConnection = () => {
    console.log('>>>>>> creating peer connection')
    this.peerConnection = new RTCPeerConnection()
    this.peerConnection.onicecandidate = this.onicecandidate
    this.setState({ isStarted: true })
  }

  private addEventListenersToDataChannel = () => {
    if (!this.dataChannel) return
    this.dataChannel.onopen = () => {
      console.log('CHANNEL opened!')
      // TODO
    }
    this.dataChannel.onclose = () => {
      console.log('CHANNEL closed!')
      // TODO
    }
    this.dataChannel.onmessage = event => {
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

    // TODO canvasContextやwidth周り
    this.canvasContext = canvas.getContext('2d')
    if (!this.canvasContext) return
    const img = this.canvasContext.createImageData(canvas.width, canvas.height)
    img.data.set(data)
    this.canvasContext.putImageData(img, 0, 0)
  }

  private initiatorStart = async () => {
    const { isStarted } = this.state
    console.log('>>>>>>> initiatorStart() ', isStarted)
    if (!isStarted) {
      this.createPeerConnection()
      if (!this.peerConnection) return
      this.dataChannel = this.peerConnection.createDataChannel('photos')
      this.addEventListenersToDataChannel()
      console.log('Sending offer to peer')
      const description = await this.peerConnection.createOffer()
      this.setLocalAndSendMessage(description)
    }
  }

  private receiverStart = async () => {
    const { isStarted } = this.state
    console.log('>>>>>>> receiverStart() ', isStarted)
    if (!isStarted) {
      this.createPeerConnection()
      if (!this.peerConnection) return
      this.peerConnection.ondatachannel = event => {
        console.log('ondatachannel:', event.channel)
        this.dataChannel = event.channel
        this.addEventListenersToDataChannel()
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

export default Sample6
