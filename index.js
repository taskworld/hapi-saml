const Boom = require('boom')
const Joi = require('joi')
const server = require('./server')()

// we ned to implement our own login callback to get more data
server.method('login', (userIdentifier, next) => {

  next(null, { email: userIdentifier })
})

server.route({
  method: 'GET',
  path: '/',
  handler: function (request, reply) {
    return reply().redirect('/saml/login')
  }
})

const _preprocessSaml = (req, reply) => {
  const plugin = req.server.plugins['hapi-saml-sso'];
  const saml = plugin && plugin['saml-instance'];
  if (saml) {
    const SAMLRequest = req.payload.SAMLRequest
    const SAMLResponse = req.payload.SAMLResponse
    if (SAMLRequest) {
      // TODO Not supported
      return reply(Boom.notAcceptable('SAMLRequest not supported'));
    }
    if (SAMLResponse) {
      const xmldom = require('xmldom')
      var xml = new Buffer(SAMLResponse, 'base64').toString('utf8');
      var doc = new xmldom.DOMParser().parseFromString(xml);
      console.log('------------ RAW (Base64) -----------')
      console.log(SAMLResponse)
      console.log('---------- User data (xml) ----------')
      console.log(xml)
      console.log('-------------------------------------')
      saml.validatePostResponse(req.payload, (err, profile) => {
        if (err !== null) {
          console.log(err)
          return reply(Boom.unauthorized());
        }
        return reply(profile);
      });
    }
    else {
      return reply(Boom.notAcceptable('Invalid SAML format'));
    }
  }
  else {
    return reply(Boom.badImplementation('SAML instance not exist'));
  }
}

server.route({
  method: 'GET',
  path: '/_saml-logout',
  config: {
    auth: false,
    validate: {
      options: { stripUnknown: true },
      query: {
        nameIdFormat: Joi.string().required(),
        nameId: Joi.string().required()
      }
    },
  },
  handler: function (request, reply) {
    const plugin = request.server.plugins['hapi-saml-sso'];
    const saml = plugin && plugin['saml-instance'];
    if (saml) {
      const options = {
        user: {
          nameIDFormat: request.query.nameIdFormat,
          nameID: request.query.nameId
        }
      }
      saml.getLogoutUrl(options, (err, logoutUrl) => {
        if (err) {
          return reply(Boom.wrap(err, 500))
        }
        reply.redirect(logoutUrl)
      });
    }
    else {
      reply(Boom.badImplementation('SAML instance not exist'))
    }
  }
})

server.route({
  method: 'POST',
  path: '/_saml-logout',
  handler: (request, reply) => {
    console.log('POST /_saml-logout')
    return reply({})
  }
})

server.route({
  method: 'POST',
  path: '/saml-callback',
  config: {
    auth: false,
    pre: [{ method: _preprocessSaml, assign: 'samlUser' }],
  },
  handler: function (request, reply) {
    const { samlUser } = request.pre
    console.log('samlUser', samlUser) //, { getAssertionXml: samlUser.getAssertionXml() })
    return reply({
      samlUser,
      loginUrl: 'https://adfs.taskworld.com/adfs/ls/idpinitiatedsignon.aspx',
      logout1: 'https://adfs-test.taskworld.com:8000/adfs/ls/?wa=wsignout1.0',
      logout2: 'https://adfs.taskworld.com/adfs/ls/?wa=wsignout1.0',
      logout3: `https://adfs-test.taskworld.com:8000/_saml-logout?nameId=${samlUser.Email}&nameIdFormat=urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`,
      logout4: `https://adfs-test.taskworld.com:8000/saml/logout?nameId=${samlUser.Email}&nameIdFormat=urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`
    })
    // return reply().redirect(`taskworld://saml-callback?email=${samlUser.nameID}`)
    // reply(`<script>${setSAMLLoggedIn}${refreshPage}</script>`)
    // return reply().redirect('https://cordova.taskworld.com/saml-callback')
    // reply({
    //   samlUser,
    //   loginLink: 'https://dev.taskworld.com:8000/saml/login',
    //   logoutLink: 'https://taskworld-com-dev.onelogin.com/logout'
    // })
    // reply('<a href="https://dev.taskworld.com:8000/saml/login">https://dev.taskworld.com:8000/saml/login</a>')
  }
})
