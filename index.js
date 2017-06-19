const Boom = require('boom')
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

server.route({
  method: 'POST',
  path: '/saml-callback',
  config: {
    auth: false,
    pre: [
      {
        method: (req, reply) => {
          const plugin = req.server.plugins['hapi-saml-sso'];
          const saml = plugin && plugin['saml-instance'];
          if (saml) {
            const { SAMLRequest, SAMLResponse } = req.payload;
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
        },
        assign: 'smalUser'
      },
    ],
  },
  handler: function (request, reply) {
    const { smalUser } = request.pre
    console.log('smalUser', request.pre.smalUser)
    return reply().redirect(`taskworld://saml-callback?email=${smalUser.nameID}`)
    // reply(`<script>${setSAMLLoggedIn}${refreshPage}</script>`)
    // return reply().redirect('https://cordova.taskworld.com/saml-callback')
    // reply({
    //   smalUser,
    //   loginLink: 'https://dev.taskworld.com:8000/saml/login',
    //   logoutLink: 'https://taskworld-com-dev.onelogin.com/logout'
    // })
    // reply('<a href="https://dev.taskworld.com:8000/saml/login">https://dev.taskworld.com:8000/saml/login</a>')
  }
})
