import React from 'react'
import { createRoot } from 'react-dom/client'

function Popup() {
  return (
    <div style={{ padding: 12, width: 280, fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Aether Companion</h1>
      <p style={{ fontSize: 14, color: '#4b5563' }}>
        This is a placeholder popup. Future versions will connect to the Aether platform.
      </p>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<Popup />)
