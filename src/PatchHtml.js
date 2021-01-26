export default class PatchHtml {
  constructor() {}

  scriptTag = '<script src="/-/static/okta-auth/okta-auth.js"></script>'

  register_middlewares(app, config) {
    this.secret = config.client_secret
    app.use(this.patchResponse)
  }

  patchResponse = (req, res, next) => {
    req.pause()
    const send = res.send
    res.send = html => {
      html = this.insertTags(req, html)
      return send.call(res, html)
    }
    req.resume()
    next()
  }

  insertTags = (req, html) => {
    html = String(html)
    if (!html.includes('VERDACCIO_API_URL')) {
      return html
    }

    return html.replace(/<\/body>/, [this.scriptTag, '</body>'].join(''))
  }
}
