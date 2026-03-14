// Deprecated compatibility shim.
// Search Console is now the analytics source in this project.

export type GoogleAnalyticsPageMetrics = {
  pageUrl: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export async function fetchGoogleAnalyticsPageMetrics(
  pageUrl: string,
  _startDate = '30daysAgo',
  _endDate = 'today'
): Promise<GoogleAnalyticsPageMetrics> {
  return {
    pageUrl,
    clicks: 0,
    impressions: 0,
    ctr: 0,
    position: 0
  };
}
