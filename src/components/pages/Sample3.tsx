import React from 'react'

interface Props {}
interface State {
  isStarted: boolean
  sendChannel?: RTCDataChannel
  receiveChannel?: RTCDataChannel
  localPeerConnection?: RTCPeerConnection
  remotePeerConnection?: RTCPeerConnection
}

/**
 * non server data channel connection.
 */
class Sample3 extends React.Component<Props, State> {
  private textareaSendRef: React.RefObject<HTMLTextAreaElement>
  private textareaReceiveRef: React.RefObject<HTMLTextAreaElement>

  public constructor(props: Props) {
    super(props)
    this.textareaSendRef = React.createRef()
    this.textareaReceiveRef = React.createRef()
    this.state = { isStarted: false }
  }

  public componentWillUnmount(): void {
    const {
      localPeerConnection,
      remotePeerConnection,
      sendChannel,
      receiveChannel,
    } = this.state
    if (sendChannel) sendChannel.close()
    if (receiveChannel) receiveChannel.close()
    if (localPeerConnection) localPeerConnection.close()
    if (remotePeerConnection) remotePeerConnection.close()
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
    const localPeerConnection = new RTCPeerConnection()
    const sendChannel = localPeerConnection.createDataChannel('sendDataChannel')

    localPeerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      const { remotePeerConnection } = this.state
      if (!remotePeerConnection) return
      if (event.candidate) {
        console.log(event.candidate.candidate)
        remotePeerConnection
          .addIceCandidate(event.candidate)
          .then(() => {
            console.log('[remotePeer]: addIceCandidate success.')
          })
          .catch(error => {
            console.log(error)
          })
      }
    }
    sendChannel.onopen = () => {
      const textareaSend = this.textareaSendRef.current
      if (!textareaSend) return
      textareaSend.focus()
      this.setState({ isStarted: true })
    }
    sendChannel.onclose = () => {
      console.log('Closed data channel with label: ' + sendChannel.label)
      const textareaSend = this.textareaSendRef.current
      const textareaReceive = this.textareaReceiveRef.current
      if (!textareaSend || !textareaReceive) return
      textareaSend.value = ''
      textareaReceive.value = ''
      this.setState({ isStarted: false })
    }

    const remotePeerConnection = new RTCPeerConnection()

    remotePeerConnection.onicecandidate = (
      event: RTCPeerConnectionIceEvent,
    ) => {
      const { localPeerConnection } = this.state
      if (!localPeerConnection) return
      if (event.candidate) {
        console.log(event.candidate.candidate)
        localPeerConnection
          .addIceCandidate(event.candidate)
          .then(() => {
            console.log('[remotePeer]: addIceCandidate success.')
          })
          .catch(error => {
            console.log(error)
          })
      }
    }
    remotePeerConnection.ondatachannel = (event: RTCDataChannelEvent) => {
      const receiveChannel = event.channel
      receiveChannel.onmessage = (event: MessageEvent) => {
        console.log(`Received Message: ${event.data}`)
        const textareaReceive = this.textareaReceiveRef.current
        if (textareaReceive) textareaReceive.value = event.data
      }
      receiveChannel.onclose = () => {
        console.log(`Closed data channel with label: ${receiveChannel.label}`)
      }
      this.setState({ receiveChannel })
    }

    const offerDescription = await localPeerConnection.createOffer()
    localPeerConnection.setLocalDescription(offerDescription)
    console.log('Offer from localPeerConnection \n' + offerDescription.sdp)
    remotePeerConnection.setRemoteDescription(offerDescription)
    const answerDescription = await remotePeerConnection.createAnswer()

    remotePeerConnection.setLocalDescription(answerDescription)
    console.log('Answer from remotePeerConnection \n' + answerDescription.sdp)
    localPeerConnection.setRemoteDescription(answerDescription)

    this.setState({ sendChannel, localPeerConnection, remotePeerConnection })
  }

  private onClickSend = async () => {
    console.log('send')
    const { sendChannel } = this.state
    const textareaSend = this.textareaSendRef.current
    if (!textareaSend || !sendChannel) return
    const data = textareaSend.value
    sendChannel.send(data)
    console.log('Sent Data: ' + data)
  }

  private onClickStop = () => {
    const {
      sendChannel,
      receiveChannel,
      localPeerConnection,
      remotePeerConnection,
    } = this.state
    console.log('stop')
    if (sendChannel) sendChannel.close()
    if (receiveChannel) receiveChannel.close()
    if (localPeerConnection) localPeerConnection.close()
    if (remotePeerConnection) remotePeerConnection.close()
  }
}

export default Sample3
