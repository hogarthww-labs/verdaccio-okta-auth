import session from 'express-session'
import querystring from 'querystring'
import createError from 'http-errors'
import Auth from './Auth'
import PatchHtml from './PatchHtml'
import ServeStatic from './ServeStatic'

let STORAGE = {
  tokens: {},
  sessions: {},
  tokenStorage: {},
}

export default class Plugin {
  constructor(config, options) {
    let pluginConfig = config.middlewares['okta-auth']
    this.rawConfig = config

    this.config = {
      issuer: pluginConfig.issuer,
      redirect_uri: pluginConfig.redirectUri,
      client_id: pluginConfig.clientId,
      client_secret: pluginConfig.clientSecret,
      appBaseUrl: pluginConfig.appBaseUrl,
      scope: pluginConfig.scope,
      testing: {
        disableHttpsCheck: pluginConfig.testing,
      },
    }

    this.auth = new Auth(this.config)

    this.authUrl = '/-/authorization-code/callback'

    this.publishers = config.auth['okta-auth'].publishers
  }

  getSecurity() {
    return this.rawConfig.security
  }

  register_middlewares(app, auth, storage) {
    this.authMiddleware = auth
    this.storage = storage

    app.use(
      session({
        secret: auth.secret,
        resave: false,
        saveUninitialized: true,
      }),
    )

    app.use(this.loadStorage.bind(this))
    app.use('/-/authorization-code/callback', this.authorize.bind(this))
    app.use('/-/session', this.setClientSession.bind(this))

    const children = [new PatchHtml(this.config), new ServeStatic(this.config)]
    for (const child of children) {
      child.register_middlewares(app, auth)
    }
  }

  loadStorage(req, res, _next) {
    req.pause()
    const next = function(err) {
      req.resume()
      if (err) {
        return _next(err)
      }
      return _next()
    }

    if (req.headers.authorization) {
      let apiToken = req.headers.authorization.split(' ')[1]

      this.storage.readTokens({ user: apiToken }).then(tokens => {
        if (tokens.length > 0) {
          STORAGE.tokenStorage[apiToken] = tokens[0].key
        }

        next()
      })
    } else {
      next()
    }
  }

  apiJWTmiddleware(helpers) {
    this.createAnonymousRemoteUser = helpers.createAnonymousRemoteUser
    this.createRemoteUser = helpers.createRemoteUser

    return this.externalAuth.bind(this)
  }

  async authorize(req, res, next) {
    let tokens = await this.storage.readTokens({ user: '@' })

    if (Object.keys(req.query).length > 0) {
      let user = await this.auth.getUser(req.query.code)

      let jwtOptions = this.getSecurity()
      let webToken = await this.authMiddleware.jwtEncrypt(user.email, jwtOptions.web.sign)

      let authorization = `${user.email}:${this.config.client_id}`
      // let authToken = await this.authMiddleware.jwtEncrypt(authorization)
      let apiToken = Buffer.from(authorization).toString('base64')

      // #TODO encode the full user object from Okta to validate Okta Groups
      let remoteUser = {
        username: user.email,
        name: user.name,
        npm: apiToken,
        web: webToken,
      }

      if (!STORAGE.tokens[apiToken]) {
        STORAGE.tokens[apiToken] = remoteUser
      }

      STORAGE.sessions[req.sessionID] = remoteUser

      let token = {
        user: apiToken,
        token: webToken,
        key: user.email,
      }
      this.storage.saveToken(token)

      req.remote_user = user.email

      res.setHeader('Token', webToken)
      res.setHeader('Username', user.name)
      res.setHeader('Npm', apiToken)

      return res.redirect('/-/session')
    } else {
      return res.redirect(this.auth.getRedirectUrl(req))
    }
  }

  externalAuth(req, res, next) {
    let cb = this.createRemoteUser

    // First search in memory storage against session id
    // Only applies for UI Flow
    let groups = []
    if (STORAGE.sessions[req.sessionID]) {
      req.remote_user = this.createUser(STORAGE.sessions[req.sessionID].username, cb)
    } else {
      // Second check headers for API Flow
      if (req.headers.authorization) {
        let token = req.headers.authorization.split(' ')[1]

        // Now check in menory storage for token
        if (Object.keys(STORAGE.tokens).indexOf(token) > -1) {
          req.remote_user = this.createUser(STORAGE.tokens[token].username, cb)
        } else {
          // Last check token database
          if (STORAGE.tokenStorage[token]) {
            req.remote_user = this.createUser(STORAGE.tokenStorage[token], cb)
            // req.remote_user = this.createAnonymousRemoteUser()
          } else {
            req.remote_user = this.createAnonymousRemoteUser()
          }
        }
      } else {
        req.remote_user = this.createAnonymousRemoteUser()
      }
    }

    next()
  }

  setClientSession(req, res, next) {
    let data = {
      token: req.headers['token'],
      npm: req.headers['npm'],
      username: req.headers['username'],
    }

    let setSessionTag = `\n
      <!doctype html>
      <html lang="en">
        <head>
          <script type="text/javascript">
            var user = JSON.parse('${JSON.stringify(data)}');
            if (!localStorage.getItem('username')) {
                localStorage.setItem('username', user.username);
            }

            if (!localStorage.getItem('npm')) {
                localStorage.setItem('npm', user.npm);
            }
            
            if (!localStorage.getItem('token')) {
                localStorage.setItem('token', user.token);
            }

            location.href = '/';
          </script>
        </head>
      <body>
        <p>Setting Session. Page should automatically redirect. If not <a href="/">click here</a></p>
      </body>
    </html>`

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.write(setSessionTag)
    res.end()
  }

  // allow_publish(user, pkg, cb) {
  //   console.log(user)
  // }

  createUser(user, cb) {
    let groups = []
    if (this.publishers.indexOf(user) > -1) {
      groups.push('publisher')
    }

    return cb(user, groups)
  }

  authenticate(user, password, cb) {
    cb(createError(405, `Signup/Login Not Implemented please contact your Okta Admin.`), false)
  }

  adduser(user, password, cb) {
    cb(createError(405, `Signup/Login Not Implemented please contact your Okta Admin.`), false)
  }
}
