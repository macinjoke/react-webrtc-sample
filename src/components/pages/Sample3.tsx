import React from 'react'

interface Props {}
interface State {
  isStarted: boolean
}

/**
 * non server data channel connection.
 */
class Sample3 extends React.Component<Props, State> {
  private textareaSendRef: React.RefObject<HTMLTextAreaElement>
  private textareaReceiveRef: React.RefObject<HTMLTextAreaElement>
  private sendChannel?: RTCDataChannel
  private receiveChannel?: RTCDataChannel
  private localPeerConnection?: RTCPeerConnection
  private remotePeerConnection?: RTCPeerConnection

  public constructor(props: Props) {
    super(props)
    this.textareaSendRef = React.createRef()
    this.textareaReceiveRef = React.createRef()
    this.state = { isStarted: false }
  }

  public componentWillUnmount(): void {
    if (this.sendChannel) this.sendChannel.close()
    if (this.receiveChannel) this.receiveChannel.close()
    if (this.localPeerConnection) this.localPeerConnection.close()
    if (this.remotePeerConnection) this.remotePeerConnection.close()
  }

  public render() {
    const { isStarted } = this.state
    return (
      <div>
        <h2>Sample 3</h2>
        <textarea
          ref={this.textareaSendRef}
          placeholder="Press Start, enter some text, then press Send."
          disabled={!isStarted}
        />
        <textarea ref={this.textareaReceiveRef} disabled />
        <div>
          <button onClick={this.onClickStart} disabled={isStarted}>
            Start
          </button>
          <button onClick={this.onClickSend} disabled={!isStarted}>
            Send
          </button>
          <button onClick={this.onClickStop} disabled={!isStarted}>
            Stop
          </button>
        </div>
      </div>
    )
  }

  private onClickStart = async () => {
    console.log('start')
    this.localPeerConnection = new RTCPeerConnection()
    this.sendChannel = this.localPeerConnection.createDataChannel(
      'sendDataChannel',
    )

    this.localPeerConnection.addEventListener(
      'icecandidate',
      (event: RTCPeerConnectionIceEvent) => {
        if (!this.remotePeerConnection) return
        if (event.candidate) {
          console.log(event.candidate.candidate)
          this.remotePeerConnection
            .addIceCandidate(event.candidate)
            .then(() => {
              console.log('[remotePeer]: addIceCandidate success.')
            })
            .catch(error => {
              console.log(error)
            })
        }
      },
    )
    this.sendChannel.addEventListener('open', () => {
      const textareaSend = this.textareaSendRef.current
      if (!textareaSend) return
      textareaSend.focus()
      this.setState({ isStarted: true })
    })
    this.sendChannel.addEventListener('close', () => {
      if (!this.sendChannel) return
      console.log('Closed data channel with label: ' + this.sendChannel.label)
      const textareaSend = this.textareaSendRef.current
      const textareaReceive = this.textareaReceiveRef.current
      if (!textareaSend || !textareaReceive) return
      textareaSend.value = ''
      textareaReceive.value = ''
      this.setState({ isStarted: false })
    })

    this.remotePeerConnection = new RTCPeerConnection()

    this.remotePeerConnection.addEventListener(
      'icecandidate',
      (event: RTCPeerConnectionIceEvent) => {
        if (!this.localPeerConnection) return
        if (event.candidate) {
          console.log(event.candidate.candidate)
          this.localPeerConnection
            .addIceCandidate(event.candidate)
            .then(() => {
              console.log('[remotePeer]: addIceCandidate success.')
            })
            .catch(error => {
              console.log(error)
            })
        }
      },
    )
    this.remotePeerConnection.addEventListener(
      'datachannel',
      (event: RTCDataChannelEvent) => {
        this.receiveChannel = event.channel
        this.receiveChannel.addEventListener(
          'message',
          (event: MessageEvent) => {
            console.log(`Received Message: ${event.data}`)
            const textareaReceive = this.textareaReceiveRef.current
            if (textareaReceive) textareaReceive.value = event.data
          },
        )
        this.receiveChannel.addEventListener('close', () => {
          if (!this.receiveChannel) return
          console.log(
            `Closed data channel with label: ${this.receiveChannel.label}`,
          )
        })
      },
    )

    const offerDescription = await this.localPeerConnection.createOffer()
    this.localPeerConnection.setLocalDescription(offerDescription)
    console.log('Offer from localPeerConnection \n' + offerDescription.sdp)
    this.remotePeerConnection.setRemoteDescription(offerDescription)
    const answerDescription = await this.remotePeerConnection.createAnswer()

    this.remotePeerConnection.setLocalDescription(answerDescription)
    console.log('Answer from remotePeerConnection \n' + answerDescription.sdp)
    this.localPeerConnection.setRemoteDescription(answerDescription)
  }

  private onClickSend = async () => {
    console.log('send')
    const textareaSend = this.textareaSendRef.current
    if (!textareaSend || !this.sendChannel) return
    const data = textareaSend.value
    this.sendChannel.send(data)
    console.log('Sent Data: ' + data)
  }

  private onClickStop = () => {
    console.log('stop')
    if (this.sendChannel) this.sendChannel.close()
    if (this.receiveChannel) this.receiveChannel.close()
    if (this.localPeerConnection) this.localPeerConnection.close()
    if (this.remotePeerConnection) this.remotePeerConnection.close()
  }
}

export default Sample3
