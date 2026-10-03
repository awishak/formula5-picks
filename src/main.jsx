import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { PlayerCardProvider } from './PlayerCard.jsx'

// The player card sits around the whole app, not inside the shell, because the
// weekly deck returns before the shell renders and a tap on a face in the deck
// has to open the same card as a tap on a standings row.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PlayerCardProvider>
      <App />
    </PlayerCardProvider>
  </React.StrictMode>
)
