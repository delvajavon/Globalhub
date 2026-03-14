import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { getBackendUrl } from '../lib/runtimeConfig'

const AnalyticsDashboard = () => {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [weeklyActivity, setWeeklyActivity] = useState(null)
  const [platforms, setPlatforms] = useState(null)
  const [topPerforming, setTopPerforming] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const backendUrl = getBackendUrl()

  // Fetch all analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user?.id) return

      setLoading(true)
      setError(null)

      try {
        const [summaryRes, weeklyRes, platformsRes, topRes] = await Promise.all([
          fetch(`${backendUrl}/api/analytics/deployment-summary?userId=${user.id}`),
          fetch(`${backendUrl}/api/analytics/deployment-weekly?userId=${user.id}`),
          fetch(`${backendUrl}/api/analytics/deployment-by-platform?userId=${user.id}`),
          fetch(`${backendUrl}/api/analytics/deployment-top-performing?userId=${user.id}&limit=5`)
        ])

        const summaryData = await summaryRes.json()
        const weeklyData = await weeklyRes.json()
        const platformsData = await platformsRes.json()
        const topData = await topRes.json()

        if (summaryData.success) setSummary(summaryData.summary)
        if (weeklyData.success) setWeeklyActivity(weeklyData.weeklyActivity)
        if (platformsData.success) setPlatforms(platformsData.platforms)
        if (topData.success) setTopPerforming(topData.topPerforming)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [user?.id, backendUrl])

  if (!user) {
    return <div style={{ padding: '20px' }}>Please sign in to view analytics</div>
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>📊 Deployment Analytics Dashboard</h1>

      {error && <p style={{ color: 'red', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>Error: {error}</p>}

      {loading && <p>Loading analytics...</p>}

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div style={cardStyle}>
            <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Total Deployments</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{summary.totalDeployments}</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
              {summary.successfulDeployments} successful, {summary.failedDeployments} failed
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Total Views</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{summary.totalViews.toLocaleString()}</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Across all deployments</div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Total Clicks</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{summary.totalClicks.toLocaleString()}</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Average CTR: {summary.avgCTR}%</div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Total Impressions</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{summary.totalImpressions.toLocaleString()}</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Search visibility</div>
          </div>
        </div>
      )}

      {/* Weekly Activity */}
      {weeklyActivity && (
        <div style={{ ...cardStyle, marginBottom: '32px' }}>
          <h2 style={{ margin: '0 0 16px 0' }}>Weekly Activity (Last 7 Days)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
            {Object.entries(weeklyActivity).map(([day, data]) => (
              <div key={day} style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>{day}</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563eb' }}>{data.views}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>views</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#16a34a', marginTop: '4px' }}>{data.clicks}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>clicks</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform Breakdown */}
      {platforms && (
        <div style={{ ...cardStyle, marginBottom: '32px' }}>
          <h2 style={{ margin: '0 0 16px 0' }}>Performance by Platform</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={tableCellHeaderStyle}>Platform</th>
                  <th style={tableCellHeaderStyle}>Deployments</th>
                  <th style={tableCellHeaderStyle}>Successful</th>
                  <th style={tableCellHeaderStyle}>Views</th>
                  <th style={tableCellHeaderStyle}>Clicks</th>
                  <th style={tableCellHeaderStyle}>CTR</th>
                </tr>
              </thead>
              <tbody>
                {platforms.map(p => (
                  <tr key={p.platform} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={tableCellStyle}><strong style={{ textTransform: 'capitalize' }}>{p.platform}</strong></td>
                    <td style={tableCellStyle}>{p.deployments}</td>
                    <td style={tableCellStyle}><span style={{ color: '#16a34a', fontWeight: 'bold' }}>{p.successful}</span></td>
                    <td style={tableCellStyle}>{p.traffic.toLocaleString()}</td>
                    <td style={tableCellStyle}>{p.clicks.toLocaleString()}</td>
                    <td style={tableCellStyle}><strong>{p.ctr}%</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Performing Articles */}
      {topPerforming && (
        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 16px 0' }}>🔥 Top Performing Articles</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            {topPerforming.map((article, idx) => (
              <div key={idx} style={{ padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '4px', borderLeft: '4px solid #2563eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div>
                    <strong>{article.title}</strong>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      <strong style={{ textTransform: 'capitalize', color: '#666' }}>{article.platform}</strong>
                    </div>
                  </div>
                  {article.url && (
                    <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#2563eb' }}>
                      Visit →
                    </a>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '12px' }}>
                  <div>
                    <div style={{ color: '#666' }}>Views</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563eb' }}>{article.views.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ color: '#666' }}>Clicks</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#16a34a' }}>{article.clicks.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ color: '#666' }}>Impressions</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{article.impressions.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ color: '#666' }}>CTR</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ea580c' }}>{article.ctr}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const cardStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px'
}

const tableCellHeaderStyle = {
  padding: '12px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 'bold',
  color: '#666',
  textTransform: 'uppercase'
}

const tableCellStyle = {
  padding: '12px',
  textAlign: 'left'
}

export default AnalyticsDashboard
        </button>
      </div>

      {analyticsData && (
        <div style={{
          background: '#f0f4f8',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          <h3>Page Metrics</h3>
          <pre>{JSON.stringify(analyticsData, null, 2)}</pre>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleFetchCountryTraffic}
          disabled={loading}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: 'none',
            background: '#10B981',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Loading...' : 'Fetch Country Traffic'}
        </button>
      </div>

      {countryData && (
        <div style={{
          background: '#f0f4f8',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          <h3>Country Traffic</h3>
          <pre>{JSON.stringify(countryData, null, 2)}</pre>
        </div>
      )}

      <div>
        <button
          onClick={handleSaveAnalytics}
          disabled={loading}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: 'none',
            background: '#7C3AED',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Saving...' : 'Save Analytics to Supabase'}
        </button>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h2>Saved Analytics Records</h2>
        <button
          onClick={async () => {
            setLoading(true)
            setError(null)
            try {
              const records = await fetchSavedAnalytics()
              setSavedAnalytics(records || [])
            } catch (err) {
              setError(err.message)
            } finally {
              setLoading(false)
            }
          }}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: 'none',
            background: '#2563EB',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Load Saved Analytics
        </button>
        {savedAnalytics.length > 0 && (
          <table style={{ width: '100%', marginTop: '10px', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>translationId</th>
                <th>country</th>
                <th>language</th>
                <th>page_views</th>
                <th>clicks</th>
                <th>ctr</th>
                <th>date</th>
              </tr>
            </thead>
            <tbody>
              {savedAnalytics.map((row) => (
                <tr key={row.id}>
                  <td>{row.translation_id}</td>
                  <td>{row.country}</td>
                  <td>{row.language}</td>
                  <td>{row.page_views}</td>
                  <td>{row.clicks}</td>
                  <td>{row.ctr}</td>
                  <td>{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default AnalyticsDashboard