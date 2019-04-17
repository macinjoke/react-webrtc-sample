import React from 'react'

interface Props {}

/**
 * video要素を使いWebカメラの映像を写すだけ
 */
class Sample1 extends React.Component {
  private myRef: React.RefObject<HTMLVideoElement>

  private constructor(props: Props) {
    super(props)
    this.myRef = React.createRef()
  }
  public componentDidMount(): void {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((mediaStream: MediaStream) => {
        if (this.myRef.current) {
          this.myRef.current.srcObject = mediaStream
        }
      })
      .catch(error => {
        console.log(error)
      })
  }

  public render() {
    return (
      <div>
        <video ref={this.myRef} autoPlay playsInline />
      </div>
    )
  }
}

export default Sample1
