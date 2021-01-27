# Verdaccio Okta Auth

Okta Auth plugin for Verdaccio

## Installation

See [Verdaccio configuration](https://verdaccio.org/docs/en/configuration)

"A default configuration file config.yaml is created the very first time you run verdaccio."

The default `config.yaml` should have a configuration for the built-in `htpasswd` plugin

```yaml
auth:
  htpasswd:
    file: ./htpasswd
```

In the same `config.yaml` add a `okta-auth` under `auth` and configure the following settings

```yaml
auth:
  htpasswd:
    file: ./htpasswd
  okta-auth:
    issuer: <name of issuer>
    client_id: <id>
    client_secret: <secret>
    redirect_uri: <uri>
    scope: <scope>
```

These config settings are available directly on the `config` object in the javascript (NodeJS) code as follows:

```js
  async getToken(code) {
    let url = `${this.config.issuer}/v1/token`
    let authorization = `${this.config.client_id}:${this.config.client_secret}`
    // ...
  }

  getRedirectUrl(req) {
    // ...
    const params = {
      nonce,
      state,
      client_id: this.config.client_id,
      redirect_uri: this.config.redirect_uri,
      scope: this.config.scope,
      response_type: 'code',
    }
    // ...
  }
```

For comparison, here is part of the configuration for the `verdaccio-auth-gitlab` plugin

`config.yaml`:

```yaml
auth:
  auth-gitlab:
    # Gitlab server (default: https://gitlab.com)
    url: https://gitlab.com

    # Gitlab token type (default: personal)
    tokenType: personal # options: personal/oauth/job
```

