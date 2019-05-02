import React from 'react'
import { BrowserRouter, Route, Link } from 'react-router-dom'
import Sample1 from './pages/Sample1'
import Sample2 from './pages/Sample2'
import Sample3 from './pages/Sample3'
import Sample4 from './pages/Sample4'
import Sample5 from './pages/Sample5_1'
import Top from './pages/Top'

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
      <li>
        <Link to="/sample3">sample3</Link>
      </li>
      <li>
        <Link to="/sample4">sample4</Link>
      </li>
      <li>
        <Link to="/sample5">sample5</Link>
      </li>
    </ul>
    <Route exact path="/" component={Top} />
    <Route path="/sample1" component={Sample1} />
    <Route path="/sample2" component={Sample2} />
    <Route path="/sample3" component={Sample3} />
    <Route path="/sample4" component={Sample4} />
    <Route path="/sample5" component={Sample5} />
  </BrowserRouter>
)

export default App
