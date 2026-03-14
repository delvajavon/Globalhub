import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import GlobalHub from '../GlobalHub.jsx'
import { getClerkPublishableKey } from '../lib/runtimeConfig'

const clerkPubKey = getClerkPublishableKey()

function MissingClerkConfig() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: 24 }}>
      <div style={{ maxWidth: 640, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ margin: '0 0 10px', color: '#0F172A', fontSize: 22 }}>SceneHire Configuration Error</h1>
        <p style={{ margin: '0 0 10px', color: '#334155', lineHeight: 1.6 }}>
          Missing <code>VITE_CLERK_PUBLISHABLE_KEY</code>. Authentication cannot initialize.
        </p>
        <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>
          Set the variable in your frontend deployment environment and redeploy.
        </p>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {clerkPubKey ? (
      <ClerkProvider publishableKey={clerkPubKey}>
        <GlobalHub />
      </ClerkProvider>
    ) : (
      <MissingClerkConfig />
    )}
  </React.StrictMode>,
)
