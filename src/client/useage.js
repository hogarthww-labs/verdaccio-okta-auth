export default function getUsageInfo() {
  const username = localStorage.getItem('username')
  if (!username) {
    return 'Click the login button to authenticate with Okta.'
  }

  const configBase = window.VERDACCIO_API_URL
    ? window.VERDACCIO_API_URL.replace(/^https?:/, '').replace(/-\/verdaccio\/$/, '')
    : `//${location.host}${location.pathname}`
  const authToken = localStorage.getItem('npm')
  return [
    `npm config set ${configBase}/:_authToken "${authToken}"`,
    `npm config set ${configBase}/:always-auth true`,
  ].join('\n')
}
