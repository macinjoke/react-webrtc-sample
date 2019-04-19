import React from 'react'

interface Props {}
interface State {
  mediaStream?: MediaStream
}

/**
 * just use a video element and display the video of Web camera.
 */
class Sample1 extends React.Component<Props, State> {
  private videoRef: React.RefObject<HTMLVideoElement>

  public constructor(props: Props) {
    super(props)
    this.videoRef = React.createRef()
  }
  public async componentDidMount() {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
    })
    if (this.videoRef.current) {
      this.videoRef.current.srcObject = mediaStream
      this.setState({ mediaStream })
    }
  }

  public componentWillUnmount(): void {
    const { mediaStream } = this.state
    if (mediaStream) mediaStream.getTracks()[0].stop()
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
