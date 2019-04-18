import React from 'react'

interface Props {}

/**
 * video要素を使いWebカメラの映像を写すだけ
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
        <video ref={this.videoRef} autoPlay playsInline />
      </div>
    )
  }
}

export default Sample1
