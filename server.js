const Hapi = require('hapi')
const Fs = require('fs')

// const SAML_DEFAULT_IDP = 'https://taskworld-com-dev.onelogin.com/trust/saml2/http-post/sso/670648'
// const SAML_DEFAULT_IDP = 'https://taskworld-com-dev.onelogin.com/trust/saml2/http-post/sso/671606'
const SAML_DEFAULT_IDP = 'https://adfs.taskworld.com/adfs/ls/'
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
        // callbackUrl: 'https://a2adb161.ngrok.io/saml-callback',
        entryPoint: SAML_DEFAULT_IDP,
        logoutUrl: 'https://adfs.taskworld.com/adfs/ls/?wa=wsignout1.0',
        // logoutCallbackUrl: 'https://adfs-test.taskworld.com:8000/adfs/ls/?wa=wsignout1.0',
        issuer: 'taskworld_saml',
        // cert: Fs.readFileSync(ONELOGIN_CERT, 'utf-8'),
        // decryptionPvk: Fs.readFileSync(DECRYPT_KEY, 'utf-8'),
        // logoutCallbackUrl: 'https://adfs-test.taskworld.com:8000/adfs/ls/?wa=wsignout1.0',
        signatureAlgorithm: 'sha256',
        acceptedClockSkewMs: 60000,
      }
    }
  ]

  server.connection({
    port: PORT,
    tls: {
      key: Fs.readFileSync('/Users/chanon/tw-secrets/taskworld-godaddy.key'),
      cert: Fs.readFileSync('/Users/chanon/tw-secrets/taskworld-godaddy.crt')
    }
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
