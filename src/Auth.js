import fetch from 'node-fetch'
import uuid from 'uuid'
import querystring from 'querystring'

export default class Auth {
  constructor(config) {
    this.config = config
  }

  async getToken(code) {
    let url = `${this.config.issuer}/v1/token`
    let authorization = `${this.config.client_id}:${this.config.client_secret}`
    let request = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Basic ${Buffer.from(authorization).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: querystring.stringify({
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirect_uri,
      }),
    }

    return fetch(url, request)
      .then(data => {
        if (data.status === 200) {
          return data.json().then(json => {
            this.token = json
            return json
          })
        } else {
          throw data.statusText
        }
      })
      .catch(err => {
        console.error(err)
      })
  }

  async getUser(code) {
    let url = `${this.config.issuer}/v1/userinfo`
    let token = this.token

    if (!token) {
      token = await this.getToken(code).catch(error => console.log(error))
    }

    let request = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `${token.token_type} ${token.access_token}`,
      },
    }

    return fetch(url, request)
      .then(data => {
        if (data.status === 200) {
          return data.json().then(json => {
            return json
          })
        } else {
          throw data.statusText
        }
      })
      .catch(err => {
        console.error(err)
      })
  }

  getRedirectUrl(req) {
    const nonce = uuid.v4()
    const state = uuid.v4()
    const params = {
      nonce,
      state,
      client_id: this.config.client_id,
      redirect_uri: this.config.redirect_uri,
      scope: this.config.scope,
      response_type: 'code',
    }

    return `${this.config.issuer}/v1/authorize?${querystring.stringify(params)}`
  }
}
