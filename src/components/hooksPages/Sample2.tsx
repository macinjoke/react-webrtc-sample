import React, { FC, useEffect, useRef, useState } from 'react'

/**
 * non server video stream connection.
 */
const Sample2: FC = () => {
  const [isStarted, setIsStarted] = useState(false)
  const [isCalling, setIsCalling] = useState(false)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream>()
  const remoteStreamRef = useRef<MediaStream>()
  const localPeerConnectionRef = useRef<RTCPeerConnection>()
  const remotePeerConnectionRef = useRef<RTCPeerConnection>()

  useEffect(() => {
    return () => {
      if (localPeerConnectionRef.current) localPeerConnectionRef.current.close()
      if (remotePeerConnectionRef.current)
        remotePeerConnectionRef.current.close()
      if (localStreamRef.current) localStreamRef.current.getTracks()[0].stop()
    }
  }, [])

  const onClickStart = async () => {
    console.log('start')
    localStreamRef.current = await navigator.mediaDevices.getUserMedia({
      video: true,
    })
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
      setIsStarted(true)
    }
  }

  const onClickCall = async () => {
    console.log('call')
    setIsCalling(true)
    if (!localStreamRef.current) return
    const videoTracks = localStreamRef.current.getVideoTracks()
    localPeerConnectionRef.current = new RTCPeerConnection()
    localPeerConnectionRef.current.addEventListener(
      'icecandidate',
      (event: RTCPeerConnectionIceEvent) => {
        const iceCandidate = event.candidate
        if (iceCandidate) {
          if (!remotePeerConnectionRef.current) return
          remotePeerConnectionRef.current
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
    remotePeerConnectionRef.current = new RTCPeerConnection()
    remotePeerConnectionRef.current.addEventListener(
      'icecandidate',
      (event: RTCPeerConnectionIceEvent) => {
        const iceCandidate = event.candidate
        if (iceCandidate) {
          if (!localPeerConnectionRef.current) return
          localPeerConnectionRef.current
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
    remotePeerConnectionRef.current.addEventListener(
      'track',
      (event: RTCTrackEvent) => {
        console.log('ontrack')
        if (!remoteVideoRef.current) return
        if (event.streams && event.streams[0]) return
        remoteStreamRef.current = new MediaStream()
        remoteStreamRef.current.addTrack(event.track)
        remoteVideoRef.current.srcObject = remoteStreamRef.current
      },
    )
    localPeerConnectionRef.current.addTrack(videoTracks[0])
    const offerDescription = await localPeerConnectionRef.current.createOffer({
      offerToReceiveVideo: true,
    })

    localPeerConnectionRef.current
      .setLocalDescription(offerDescription)
      .then(() => {
        console.log('[localPeer]: setLocalDescription success')
      })
      .catch(error => {
        console.log(error)
      })

    remotePeerConnectionRef.current
      .setRemoteDescription(offerDescription)
      .then(() => {
        console.log('[remotePeer]: setRemoteDescription success')
      })
      .catch(error => {
        console.log(error)
      })

    const answerDescription = await remotePeerConnectionRef.current.createAnswer()
    remotePeerConnectionRef.current
      .setLocalDescription(answerDescription)
      .then(() => {
        console.log('[remotePeer]: setLocalDescription success')
      })
      .catch(error => {
        console.log(error)
      })

    localPeerConnectionRef.current
      .setRemoteDescription(answerDescription)
      .then(() => {
        console.log('[localPeer]: setRemoteDescription success')
      })
      .catch(error => {
        console.log(error)
      })
    console.log(localPeerConnectionRef.current)
    console.log(remotePeerConnectionRef.current)
  }

  const onClickHangUp = () => {
    console.log('hang up')
    setIsCalling(false)
    if (localPeerConnectionRef.current) localPeerConnectionRef.current.close()
    if (remotePeerConnectionRef.current) remotePeerConnectionRef.current.close()
  }

  return (
    <div>
      <h2>Sample 2</h2>
      <p>non server video stream connection.</p>
      <video
        ref={localVideoRef}
        style={{ width: '320px', maxWidth: '100%' }}
        autoPlay
        playsInline
      />
      <video
        ref={remoteVideoRef}
        style={{ width: '320px', maxWidth: '100%' }}
        autoPlay
        playsInline
      />
      <div>
        <button onClick={onClickStart} disabled={isStarted}>
          Start
        </button>
        <button onClick={onClickCall} disabled={!isStarted || isCalling}>
          Call
        </button>
        <button onClick={onClickHangUp} disabled={!isCalling}>
          Hang Up
        </button>
      </div>
    </div>
  )
}

export default Sample2
