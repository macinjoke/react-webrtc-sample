import React from 'react'

interface Props {}
interface State {
  isStarting: boolean
}

/**
 * TODO
 */
class Sample2 extends React.Component<Props, State> {
  private localVideoRef: React.RefObject<HTMLVideoElement>
  // private remoteVideoRef: React.RefObject<HTMLVideoElement>

  public constructor(props: Props) {
    super(props)
    this.localVideoRef = React.createRef()
    // this.remoteVideoRef = React.createRef()
    this.state = { isStarting: false }
  }

  public componentDidMount(): void {}

  public render() {
    const { isStarting } = this.state
    return (
      <div>
        <h2>Sample 2</h2>
        <video
          ref={this.localVideoRef}
          style={{ width: '320px', maxWidth: '100%' }}
          autoPlay
          playsInline
        />
        <video autoPlay playsInline />
        <div>
          <button onClick={this.onClickStart} disabled={isStarting}>
            Start
          </button>
          <button onClick={this.onClickCall}>Call</button>
          <button onClick={this.onClickHangUp}>Hang Up</button>
        </div>
      </div>
    )
  }

  private onClickStart = () => {
    console.log('start')
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((mediaStream: MediaStream) => {
        if (this.localVideoRef.current) {
          this.localVideoRef.current.srcObject = mediaStream
          this.setState({ isStarting: true })
        }
      })
      .catch(error => {
        console.log(error)
      })
  }

  private onClickCall = () => {
    console.log('call')
  }

  private onClickHangUp = () => {
    console.log('hang up')
  }
}

export default Sample2
