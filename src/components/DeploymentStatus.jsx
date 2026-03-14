import React, { useEffect, useMemo, useState } from 'react'
import './DeploymentStatus.css'

const FINAL_STATUSES = new Set(['success', 'failed'])

function mapStatus(status) {
  if (status === 'success') return 'success'
  if (status === 'failed') return 'failed'
  return 'pending'
}

function isComplete(items) {
  return items.length > 0 && items.every((item) => FINAL_STATUSES.has(item.status))
}

function toPublicPublishedUrl(url, platform) {
  const value = String(url || '').trim()
  if (!value) return null
  if (!/^https?:\/\//i.test(value)) return null
  if (platform === 'webflow' && /^https?:\/\/api\.webflow\.com\//i.test(value)) return null
  return value
}

export default function DeploymentStatus({ deploymentJobs, backendUrl, onComplete }) {
  const [items, setItems] = useState(
    (deploymentJobs || []).map((job) => ({
      id: job.id,
      platform: job.platform,
      status: job.status || 'pending',
      published_url: null,
      error_message: null
    }))
  )
  const [pollError, setPollError] = useState(null)

  const jobsKey = useMemo(
    () => JSON.stringify((deploymentJobs || []).map((job) => ({ id: job.id, platform: job.platform, status: job.status }))),
    [deploymentJobs]
  )

  useEffect(() => {
    setItems(
      (deploymentJobs || []).map((job) => ({
        id: job.id,
        platform: job.platform,
        status: job.status || 'pending',
        published_url: null,
        error_message: null
      }))
    )
    setPollError(null)
  }, [jobsKey, deploymentJobs])

  useEffect(() => {
    if (!deploymentJobs || deploymentJobs.length === 0) return undefined

    let cancelled = false

    const pollOnce = async () => {
      try {
        const nextItems = await Promise.all(
          deploymentJobs.map(async (job) => {
            const res = await fetch(`${backendUrl}/api/deploy/status/${job.id}`)
            const data = await res.json()

            if (!data.deploymentId || !data.platforms || data.platforms.length === 0) {
              return {
                id: job.id,
                platform: job.platform,
                status: 'failed',
                published_url: null,
                error_message: data.error || 'Failed to load deployment status'
              }
            }

            const platformData = data.platforms[0]
            return {
              id: data.deploymentId,
              platform: platformData.platform,
              status: platformData.status,
              published_url: platformData.publishedUrl,
              error_message: platformData.error
            }
          })
        )

        if (cancelled) return

        setItems(nextItems)
        setPollError(null)

        if (isComplete(nextItems) && typeof onComplete === 'function') {
          onComplete(nextItems)
        }
      } catch (error) {
        if (!cancelled) {
          setPollError(error.message || 'Polling failed')
        }
      }
    }

    pollOnce()

    const interval = setInterval(() => {
      setItems((prev) => {
        if (isComplete(prev)) {
          clearInterval(interval)
          return prev
        }
        return prev
      })
      pollOnce()
    }, 3000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [backendUrl, deploymentJobs, onComplete])

  const allDone = isComplete(items)

  return (
    <div className="deployment-status">
      <h3>{allDone ? 'Deployment Complete' : 'Publishing In Progress'}</h3>
      <p className="deployment-status-subtitle">
        {allDone ? 'All platforms finished processing.' : 'Checking deployment status every 3 seconds...'}
      </p>

      {pollError && <p className="deployment-poll-error">{pollError}</p>}

      <div className="deployment-status-list">
        {items.map((item) => {
          const displayStatus = mapStatus(item.status)
          const publishedUrl = toPublicPublishedUrl(item.published_url, item.platform)
          return (
            <div
              key={item.id}
              className={`deployment-status-item ${displayStatus}`}
            >
              <div className="deployment-status-header">
                <span className="deployment-platform">{item.platform}</span>
                <span className={`deployment-badge ${displayStatus}`}>
                  {displayStatus}
                </span>
              </div>

              {publishedUrl && (
                <a
                  href={publishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="deployment-link"
                >
                  View Published Article
                </a>
              )}

              {displayStatus === 'failed' && item.error_message && (
                <p className="deployment-error">{item.error_message}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
