import React, { FC, useEffect, useRef } from 'react'

/**
 * just use a video element and display the video of Web camera.
 */
const Sample1: FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaStreamRef = useRef<MediaStream>()
  useEffect(() => {
    ;(async () => {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: true,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current
      }
    })()
    return () => {
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks()[0].stop()
    }
  }, [])

  return (
    <div>
      <h2>Sample 1</h2>
      <p>just use a video element and display the video of Web camera.</p>
      <video
        style={{ width: '320px', maxWidth: '100%' }}
        ref={videoRef}
        autoPlay
        playsInline
      />
    </div>
  )
}

export default Sample1
