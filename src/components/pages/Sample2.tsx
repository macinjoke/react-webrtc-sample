import React from 'react'

interface Props {}
interface State {
  isStarting: boolean
  isCalling: boolean
  localStream?: MediaStream
  remoteStream?: MediaStream
  localPeerConnection?: RTCPeerConnection
  remotePeerConnection?: RTCPeerConnection
}

/**
 * non server video stream connection.
 */
class Sample2 extends React.Component<Props, State> {
  private localVideoRef: React.RefObject<HTMLVideoElement>
  private remoteVideoRef: React.RefObject<HTMLVideoElement>

  public constructor(props: Props) {
    super(props)
    this.localVideoRef = React.createRef()
    this.remoteVideoRef = React.createRef()
    this.state = { isStarting: false, isCalling: false }
  }

  public componentWillUnmount(): void {
    const {
      localPeerConnection,
      remotePeerConnection,
      localStream,
    } = this.state
    if (localPeerConnection) localPeerConnection.close()
    if (remotePeerConnection) remotePeerConnection.close()
    if (localStream) localStream.getTracks()[0].stop()
  }

  public render() {
    const { isStarting, isCalling } = this.state
    return (
      <div>
        <h2>Sample 2</h2>
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
          <button onClick={this.onClickStart} disabled={isStarting}>
            Start
          </button>
          <button onClick={this.onClickCall} disabled={!isStarting || isCalling}>
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
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
    })
    if (this.localVideoRef.current) {
      this.localVideoRef.current.srcObject = mediaStream
      this.setState({ isStarting: true, localStream: mediaStream })
    }
  }

  private onClickCall = async () => {
    const { localStream } = this.state
    console.log('call')
    this.setState({ isCalling: true })
    if (!localStream) return
    const videoTracks = localStream.getVideoTracks()
    const localPeerConnection = new RTCPeerConnection()
    localPeerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      const iceCandidate = event.candidate
      if (iceCandidate) {
        const { remotePeerConnection } = this.state
        if (!remotePeerConnection) return
        remotePeerConnection
          .addIceCandidate(iceCandidate)
          .then(() => {
            console.log('[remotePeer]: addIceCandidate success.')
          })
          .catch(error => {
            console.log(error)
          })
      }
    }
    const remotePeerConnection = new RTCPeerConnection()
    remotePeerConnection.onicecandidate = (
      event: RTCPeerConnectionIceEvent,
    ) => {
      const iceCandidate = event.candidate
      if (iceCandidate) {
        const { localPeerConnection } = this.state
        if (!localPeerConnection) return
        localPeerConnection
          .addIceCandidate(iceCandidate)
          .then(() => {
            console.log('[localPeer]: addIceCandidate success.')
          })
          .catch(error => {
            console.log(error)
          })
      }
    }
    remotePeerConnection.ontrack = (event: RTCTrackEvent) => {
      console.log('ontrack')
      if (!this.remoteVideoRef.current) return
      if (event.streams && event.streams[0]) {
        const mediaStream = event.streams[0]
        console.log(mediaStream)
        this.remoteVideoRef.current.srcObject = mediaStream
        this.setState({ remoteStream: mediaStream })
      } else {
        const remoteStream = new MediaStream()
        remoteStream.addTrack(event.track)
        this.remoteVideoRef.current.srcObject = remoteStream
        this.setState({ remoteStream })
      }
    }
    localPeerConnection.addTrack(videoTracks[0])
    const offerDescription = await localPeerConnection.createOffer({
      offerToReceiveVideo: true,
    })

    localPeerConnection
      .setLocalDescription(offerDescription)
      .then(() => {
        console.log('[localPeer]: setLocalDescription success')
      })
      .catch(error => {
        console.log(error)
      })

    remotePeerConnection
      .setRemoteDescription(offerDescription)
      .then(() => {
        console.log('[remotePeer]: setRemoteDescription success')
      })
      .catch(error => {
        console.log(error)
      })

    const answerDescription = await remotePeerConnection.createAnswer()
    remotePeerConnection
      .setLocalDescription(answerDescription)
      .then(() => {
        console.log('[remotePeer]: setLocalDescription success')
      })
      .catch(error => {
        console.log(error)
      })

    localPeerConnection
      .setRemoteDescription(answerDescription)
      .then(() => {
        console.log('[localPeer]: setRemoteDescription success')
      })
      .catch(error => {
        console.log(error)
      })

    this.setState({ localPeerConnection, remotePeerConnection })
  }

  private onClickHangUp = () => {
    console.log('hang up')
    const { localPeerConnection, remotePeerConnection } = this.state
    this.setState({ isCalling: false })
    if (localPeerConnection) localPeerConnection.close()
    if (remotePeerConnection) remotePeerConnection.close()
  }
}

export default Sample2
