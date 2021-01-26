import { static as expressServeStatic } from 'express'

const dir = __dirname

export default class ServeStatic {
  register_middlewares(app) {
    app.use('/-/static/okta-auth/', expressServeStatic(dir + '/public'))
  }
}
