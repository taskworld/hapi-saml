const Hapi = require('hapi')
const Fs = require('fs')

// const SAML_DEFAULT_IDP = 'https://taskworld-com-dev.onelogin.com/trust/saml2/http-post/sso/670648'
const SAML_DEFAULT_IDP = 'https://taskworld-com-dev.onelogin.com/trust/saml2/http-post/sso/671606'
const ONELOGIN_CERT = '/Users/chanon/tw-secrets/onelogin.pem'
const DECRYPT_KEY = './secret/idp-private-key.pem'
const HOST = 'dev.taskworld.com'
const PORT = 8000

function getServer () {
  const server = new Hapi.Server()

  const plugins = [
    {
      register: require('hapi-saml-sso'),
      options: {
        callbackUrl: `https://${HOST}:${PORT}/saml-callback`,
        // callbackUrl: 'https://edf5489a.ngrok.io/saml-callback',
        entryPoint: SAML_DEFAULT_IDP,
        issuer: 'passport-saml',
        cert: Fs.readFileSync(ONELOGIN_CERT, 'utf-8'),
        decryptionPvk: Fs.readFileSync(DECRYPT_KEY, 'utf-8'),
        signatureAlgorithm: 'sha256',
        acceptedClockSkewMs: 60000,
      }
    }
  ]

  server.connection({
    port: PORT,
  })

  server.register(plugins, (err) => {
    if (err) {
      throw err
    }
    server.start((err) => {
      if (err) {
        throw err
      }
      console.log(`Server running at: ${server.info.uri}`)
    })
  })

  server.on('response', function (request) {
    console.log(request.info.remoteAddress + ': ' + request.method.toUpperCase() + ' ' + request.url.path + ' --> ' + request.response.statusCode);
  })

  return server
}

module.exports = getServer
