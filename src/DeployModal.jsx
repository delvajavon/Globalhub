import React, { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/react'
import DeploymentStatus from './components/DeploymentStatus'
import './DeployModal.css'
import { getBackendUrl } from '../lib/runtimeConfig'

const DeployModal = ({ article, isOpen, onClose, onComplete }) => {
  const backendUrl = getBackendUrl()
  const { user } = useUser()
  const [connections, setConnections] = useState([])
  const [selectedPlatforms, setSelectedPlatforms] = useState([])
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentJobs, setDeploymentJobs] = useState([])
  const [isDeploymentComplete, setIsDeploymentComplete] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const completionTriggeredRef = useRef(false)

  // Fetch user's connected CMS platforms
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchConnections()
    }
  }, [isOpen, user?.id])

  const fetchConnections = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(
        `${backendUrl}/api/deploy/connections?userId=${user.id}`
      )

      const data = await response.json()

      if (data.success) {
        setConnections(data.connections)

        // Auto-select all platforms by default
        setSelectedPlatforms(data.connections.map(c => c.platform))
      } else {
        setError(data.error || 'Failed to load connections')
      }
    } catch (err) {
      console.error('Error fetching connections:', err)
      setError('Network error loading connections')
    } finally {
      setLoading(false)
    }
  }

  const togglePlatform = (platform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const handleDeploy = async () => {
    if (selectedPlatforms.length === 0) {
      setError('Please select at least one platform')
      return
    }

    try {
      setIsDeploying(true)
      setError(null)
      setDeploymentJobs([])
      setIsDeploymentComplete(false)

      const response = await fetch(`${backendUrl}/api/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          article,
          selectedPlatforms,
          userId: user.id
        })
      })

      const data = await response.json()

      if (data.success) {
        setDeploymentJobs(data.deployments || [])
      } else {
        setError(data.error || 'Deployment failed')
      }
    } catch (err) {
      console.error('[DeployModal] Deploy error:', err)
      setError('Network error during deployment')
    } finally {
      setIsDeploying(false)
    }
  }

  const handleClose = () => {
    setDeploymentJobs([])
    setIsDeploymentComplete(false)
    setError(null)
    setSelectedPlatforms([])
    onClose()
  }

  useEffect(() => {
    if (!isOpen) {
      completionTriggeredRef.current = false
      return
    }

    if (!isDeploymentComplete || completionTriggeredRef.current) return

    completionTriggeredRef.current = true
    const timer = setTimeout(() => {
      if (typeof onComplete === 'function') {
        onComplete()
      }
      handleClose()
    }, 700)

    return () => clearTimeout(timer)
  }, [isDeploymentComplete, isOpen, onComplete])

  if (!isOpen) return null

  return (
    <div className="deploy-modal-overlay" onClick={handleClose}>
      <div className="deploy-modal" onClick={(e) => e.stopPropagation()}>
        <div className="deploy-modal-header">
          <h2>Deploy Article</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="deploy-modal-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading connections...</p>
            </div>
          ) : error && deploymentJobs.length === 0 ? (
            <div className="error-state">
              <p className="error-message">{error}</p>
              {connections.length === 0 && (
                <div className="no-connections">
                  <p>No CMS platforms connected yet.</p>
                  <p className="hint">Go to Settings to add WordPress, Ghost, or other platforms.</p>
                </div>
              )}
            </div>
          ) : deploymentJobs.length > 0 ? (
            <div className="deploy-results">
              <DeploymentStatus
                deploymentJobs={deploymentJobs}
                backendUrl={backendUrl}
                onComplete={() => setIsDeploymentComplete(true)}
              />
              {isDeploymentComplete && (
                <button className="done-button" onClick={handleClose}>
                  Done
                </button>
              )}
            </div>
          ) : (
            <div className="platform-selection">
              <p className="instruction">Select platforms to publish this article:</p>
              <div className="platforms-list">
                {connections.map((connection) => (
                  <label key={connection.id} className="platform-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.includes(connection.platform)}
                      onChange={() => togglePlatform(connection.platform)}
                      disabled={isDeploying}
                    />
                    <span className="platform-info">
                      <span className="platform-name">
                        {connection.platform_name || connection.platform}
                      </span>
                      <span className="platform-url">{connection.api_url}</span>
                    </span>
                  </label>
                ))}
              </div>
              {selectedPlatforms.length === 0 && (
                <p className="warning">Select at least one platform to continue</p>
              )}
            </div>
          )}
        </div>

        {!loading && deploymentJobs.length === 0 && connections.length > 0 && (
          <div className="deploy-modal-footer">
            <button className="cancel-button" onClick={handleClose} disabled={isDeploying}>
              Cancel
            </button>
            <button
              className="publish-button"
              onClick={handleDeploy}
              disabled={isDeploying || selectedPlatforms.length === 0}
            >
              {isDeploying ? (
                <>
                  <span className="spinner-small"></span>
                  Publishing...
                </>
              ) : (
                `Publish to ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default DeployModal
