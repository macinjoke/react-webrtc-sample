import React from 'react'

interface Props {
  name: string
}

const App = (props: Props) => <div>hello, {props.name}</div>

const a = async () => {
  return await fetch('localhost')
}

console.log(a())

export default App
