import React, { FC, useEffect, useRef, useState } from 'react'

/**
 * non server data channel connection.
 */
const Sample3: FC = () => {
  const textareaSendRef = useRef<HTMLTextAreaElement>(null)
  const textareaReceiveRef = useRef<HTMLTextAreaElement>(null)
  const sendChannelRef = useRef<RTCDataChannel>()
  const receiveChannelRef = useRef<RTCDataChannel>()
  const localPeerConnectionRef = useRef<RTCPeerConnection>()
  const remotePeerConnectionRef = useRef<RTCPeerConnection>()
  const [isStarted, setIsStarted] = useState(false)

  useEffect(() => {
    return () => {
      if (sendChannelRef.current) sendChannelRef.current.close()
      if (receiveChannelRef.current) receiveChannelRef.current.close()
      if (localPeerConnectionRef.current) localPeerConnectionRef.current.close()
      if (remotePeerConnectionRef.current)
        remotePeerConnectionRef.current.close()
    }
  }, [])

  const onClickStart = async () => {
    console.log('start')
    localPeerConnectionRef.current = new RTCPeerConnection()
    sendChannelRef.current = localPeerConnectionRef.current.createDataChannel(
      'sendDataChannel',
    )

    localPeerConnectionRef.current.addEventListener(
      'icecandidate',
      (event: RTCPeerConnectionIceEvent) => {
        if (!remotePeerConnectionRef.current) return
        if (event.candidate) {
          console.log(event.candidate.candidate)
          remotePeerConnectionRef.current
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
    sendChannelRef.current.addEventListener('open', () => {
      const textareaSend = textareaSendRef.current
      if (!textareaSend) return
      textareaSend.focus()
      setIsStarted(true)
    })
    sendChannelRef.current.addEventListener('close', () => {
      if (!sendChannelRef.current) return
      console.log(
        'Closed data channel with label: ' + sendChannelRef.current.label,
      )
      const textareaSend = textareaSendRef.current
      const textareaReceive = textareaReceiveRef.current
      if (!textareaSend || !textareaReceive) return
      textareaSend.value = ''
      textareaReceive.value = ''
      setIsStarted(false)
    })

    remotePeerConnectionRef.current = new RTCPeerConnection()

    remotePeerConnectionRef.current.addEventListener(
      'icecandidate',
      (event: RTCPeerConnectionIceEvent) => {
        if (!localPeerConnectionRef.current) return
        if (event.candidate) {
          console.log(event.candidate.candidate)
          localPeerConnectionRef.current
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
    remotePeerConnectionRef.current.addEventListener(
      'datachannel',
      (event: RTCDataChannelEvent) => {
        receiveChannelRef.current = event.channel
        receiveChannelRef.current.addEventListener(
          'message',
          (event: MessageEvent) => {
            console.log(`Received Message: ${event.data}`)
            const textareaReceive = textareaReceiveRef.current
            if (textareaReceive) textareaReceive.value = event.data
          },
        )
        receiveChannelRef.current.addEventListener('close', () => {
          if (!receiveChannelRef.current) return
          console.log(
            `Closed data channel with label: ${receiveChannelRef.current.label}`,
          )
        })
      },
    )

    const offerDescription = await localPeerConnectionRef.current.createOffer()
    localPeerConnectionRef.current.setLocalDescription(offerDescription)
    console.log('Offer from localPeerConnection \n' + offerDescription.sdp)
    remotePeerConnectionRef.current.setRemoteDescription(offerDescription)
    const answerDescription = await remotePeerConnectionRef.current.createAnswer()

    remotePeerConnectionRef.current.setLocalDescription(answerDescription)
    console.log('Answer from remotePeerConnection \n' + answerDescription.sdp)
    localPeerConnectionRef.current.setRemoteDescription(answerDescription)
  }

  const onClickSend = async () => {
    console.log('send')
    const textareaSend = textareaSendRef.current
    if (!textareaSend || !sendChannelRef.current) return
    const data = textareaSend.value
    sendChannelRef.current.send(data)
    console.log('Sent Data: ' + data)
  }

  const onClickStop = () => {
    console.log('stop')
    if (sendChannelRef.current) sendChannelRef.current.close()
    if (receiveChannelRef.current) receiveChannelRef.current.close()
    if (localPeerConnectionRef.current) localPeerConnectionRef.current.close()
    if (remotePeerConnectionRef.current) remotePeerConnectionRef.current.close()
  }

  return (
    <div>
      <h2>Sample 3</h2>
      <p>non server data channel connection.</p>
      <textarea
        ref={textareaSendRef}
        placeholder="Press Start, enter some text, then press Send."
        disabled={!isStarted}
      />
      <textarea ref={textareaReceiveRef} disabled />
      <div>
        <button onClick={onClickStart} disabled={isStarted}>
          Start
        </button>
        <button onClick={onClickSend} disabled={!isStarted}>
          Send
        </button>
        <button onClick={onClickStop} disabled={!isStarted}>
          Stop
        </button>
      </div>
    </div>
  )
}

export default Sample3
