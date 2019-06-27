import React from 'react'

interface Props {}

/**
 * just use a video element and display the video of Web camera.
 */
class Sample1 extends React.Component<Props> {
  private videoRef: React.RefObject<HTMLVideoElement>
  private mediaStream?: MediaStream

  public constructor(props: Props) {
    super(props)
    this.videoRef = React.createRef()
  }
  public async componentDidMount() {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
    })
    if (this.videoRef.current) {
      this.videoRef.current.srcObject = this.mediaStream
    }
  }

  public componentWillUnmount(): void {
    if (this.mediaStream) this.mediaStream.getTracks()[0].stop()
  }

  public render() {
    return (
      <div>
        <h2>Sample 1</h2>
        <p>just use a video element and display the video of Web camera.</p>
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
