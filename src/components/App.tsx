import React, { FC } from 'react'
import { BrowserRouter, Route, Link } from 'react-router-dom'
import Sample1 from './pages/Sample1'
import Sample2 from './pages/Sample2'
import Sample3 from './pages/Sample3'
import Sample4 from './pages/Sample4'
import Sample5 from './pages/Sample5'
import Sample6 from './pages/Sample6'
import Top from './pages/Top'

const App: FC = () => (
  <BrowserRouter>
    <Link to="/" style={{ textDecoration: 'none', color: 'black' }}>
      <h1>React WebRTC Sample</h1>
    </Link>
    <span>
      {' '}
      <Link to="/sample1">sample1</Link>
    </span>
    <span>
      {' '}
      <Link to="/sample2">sample2</Link>
    </span>
    <span>
      {' '}
      <Link to="/sample3">sample3</Link>
    </span>
    <span>
      {' '}
      <Link to="/sample4">sample4</Link>
    </span>
    <span>
      {' '}
      <Link to="/sample5">sample5</Link>
    </span>
    <span>
      {' '}
      <Link to="/sample6">sample6</Link>
    </span>
    <Route exact path="/" component={Top} />
    <Route path="/sample1" component={Sample1} />
    <Route path="/sample2" component={Sample2} />
    <Route path="/sample3" component={Sample3} />
    <Route path="/sample4" component={Sample4} />
    <Route path="/sample5" component={Sample5} />
    <Route path="/sample6" component={Sample6} />
  </BrowserRouter>
)

export default App
