import React from 'react'
import { BrowserRouter, Route, Link } from 'react-router-dom'
import Sample1 from './pages/Sample1'
import Sample2 from './pages/Sample2'
import Top from './pages/Top'

console.log(Link)

const App: React.FC = () => (
  <BrowserRouter>
    <Link to="/" style={{ textDecoration: 'none', color: 'black' }}>
      <h1>React WebRTC Sample</h1>
    </Link>
    <ul>
      <li>
        <Link to="/sample1">sample1</Link>
      </li>
      <li>
        <Link to="/sample2">sample2</Link>
      </li>
    </ul>
    <Route exact path="/" component={Top} />
    <Route path="/sample1" component={Sample1} />
    <Route path="/sample2" component={Sample2} />
  </BrowserRouter>
)

export default App
