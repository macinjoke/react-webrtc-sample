import React from 'react'

interface Props {}

/**
 * just use a video element and display the video of Web camera.
 */
class Sample1 extends React.Component {
  private videoRef: React.RefObject<HTMLVideoElement>

  public constructor(props: Props) {
    super(props)
    this.videoRef = React.createRef()
  }
  public componentDidMount(): void {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((mediaStream: MediaStream) => {
        if (this.videoRef.current) {
          this.videoRef.current.srcObject = mediaStream
        }
      })
      .catch(error => {
        console.log(error)
      })
  }

  public render() {
    return (
      <div>
        <h2>Sample 1</h2>
        <video
          style={{ width: '320px', maxWidth: '100%' }}
          ref={this.videoRef}
          autoPlay
          playsInline
        />
      </div>
    )
  }
}

export default Sample1
