import React from 'react'
import SignalRApp from './components/SignalRApp'
import { useSignalR } from './hooks/useSignalR'
import './App.css'

function App() {
  const signalRProps = useSignalR();

  return (
    <div className="App">
      <SignalRApp {...signalRProps} />
    </div>
  )
}

export default App
