import React from 'react'

interface Props {}
interface State {
  isStarted: boolean
  isCalling: boolean
}

/**
 * non server video stream connection.
 */
class Sample2 extends React.Component<Props, State> {
  private localVideoRef: React.RefObject<HTMLVideoElement>
  private remoteVideoRef: React.RefObject<HTMLVideoElement>
  private localStream?: MediaStream
  private remoteStream?: MediaStream
  private localPeerConnection?: RTCPeerConnection
  private remotePeerConnection?: RTCPeerConnection

  public constructor(props: Props) {
    super(props)
    this.localVideoRef = React.createRef()
    this.remoteVideoRef = React.createRef()
    this.state = { isStarted: false, isCalling: false }
  }

  public componentWillUnmount(): void {
    if (this.localPeerConnection) this.localPeerConnection.close()
    if (this.remotePeerConnection) this.remotePeerConnection.close()
    if (this.localStream) this.localStream.getTracks()[0].stop()
  }

  public render() {
    const { isStarted, isCalling } = this.state
    return (
      <div>
        <h2>Sample 2</h2>
        <p>non server video stream connection.</p>
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
        <div>
          <button onClick={this.onClickStart} disabled={isStarted}>
            Start
          </button>
          <button onClick={this.onClickCall} disabled={!isStarted || isCalling}>
            Call
          </button>
          <button onClick={this.onClickHangUp} disabled={!isCalling}>
            Hang Up
          </button>
        </div>
      </div>
    )
  }

  private onClickStart = async () => {
    console.log('start')
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
    })
    if (this.localVideoRef.current) {
      this.localVideoRef.current.srcObject = this.localStream
      this.setState({ isStarted: true })
    }
  }

  private onClickCall = async () => {
    console.log('call')
    this.setState({ isCalling: true })
    if (!this.localStream) return
    const videoTracks = this.localStream.getVideoTracks()
    this.localPeerConnection = new RTCPeerConnection()
    this.localPeerConnection.addEventListener(
      'icecandidate',
      (event: RTCPeerConnectionIceEvent) => {
        const iceCandidate = event.candidate
        if (iceCandidate) {
          if (!this.remotePeerConnection) return
          this.remotePeerConnection
            .addIceCandidate(iceCandidate)
            .then(() => {
              console.log('[remotePeer]: addIceCandidate success.')
            })
            .catch(error => {
              console.log(error)
            })
        }
      },
    )
    this.remotePeerConnection = new RTCPeerConnection()
    this.remotePeerConnection.addEventListener(
      'icecandidate',
      (event: RTCPeerConnectionIceEvent) => {
        const iceCandidate = event.candidate
        if (iceCandidate) {
          if (!this.localPeerConnection) return
          this.localPeerConnection
            .addIceCandidate(iceCandidate)
            .then(() => {
              console.log('[localPeer]: addIceCandidate success.')
            })
            .catch(error => {
              console.log(error)
            })
        }
      },
    )
    this.remotePeerConnection.addEventListener(
      'track',
      (event: RTCTrackEvent) => {
        console.log('ontrack')
        if (!this.remoteVideoRef.current) return
        if (event.streams && event.streams[0]) return
        this.remoteStream = new MediaStream()
        this.remoteStream.addTrack(event.track)
        this.remoteVideoRef.current.srcObject = this.remoteStream
      },
    )
    this.localPeerConnection.addTrack(videoTracks[0])
    const offerDescription = await this.localPeerConnection.createOffer({
      offerToReceiveVideo: true,
    })

    this.localPeerConnection
      .setLocalDescription(offerDescription)
      .then(() => {
        console.log('[localPeer]: setLocalDescription success')
      })
      .catch(error => {
        console.log(error)
      })

    this.remotePeerConnection
      .setRemoteDescription(offerDescription)
      .then(() => {
        console.log('[remotePeer]: setRemoteDescription success')
      })
      .catch(error => {
        console.log(error)
      })

    const answerDescription = await this.remotePeerConnection.createAnswer()
    this.remotePeerConnection
      .setLocalDescription(answerDescription)
      .then(() => {
        console.log('[remotePeer]: setLocalDescription success')
      })
      .catch(error => {
        console.log(error)
      })

    this.localPeerConnection
      .setRemoteDescription(answerDescription)
      .then(() => {
        console.log('[localPeer]: setRemoteDescription success')
      })
      .catch(error => {
        console.log(error)
      })
  }

  private onClickHangUp = () => {
    console.log('hang up')
    this.setState({ isCalling: false })
    if (this.localPeerConnection) this.localPeerConnection.close()
    if (this.remotePeerConnection) this.remotePeerConnection.close()
  }
}

export default Sample2
