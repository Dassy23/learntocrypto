var jsonStream = require('duplex-json-stream')
var net = require('net')
const argv = require('yargs').argv
var sodium = require('sodium-native')
var client = jsonStream(net.connect(3876))

var signature = Buffer.alloc(sodium.crypto_sign_BYTES)

client.on('data', function (msg) {
  console.log('Teller received:', msg)
})

switch (argv.command) {
    case 'balance':
      var message = Buffer.from(argv.command)
      var secretKey =Buffer.from(argv.secretKey,'hex')
      client.end({command: argv.command})
      break
    case 'deposit':
      var message = Buffer.from(argv.command)
      var secretKey =Buffer.from(argv.secretKey,'hex')
      sodium.crypto_sign_detached(signature, message, secretKey)
      client.end({command: argv.command, amount:argv.amount, id: argv.id,  sig:signature })
      break
    case 'withdraw':
      var message = Buffer.from(argv.command)
      var secretKey =Buffer.from(arg.secretKey,'hex')
      sodium.crypto_sign_detached(signature, message, secretKey)
      client.end({command: argv.command, amount:-argv.amount,id: argv.id, sig:signature })
      break
    case 'register':
     client.end({command: argv.command, id: argv.id}) 
     break
    default:
      client.end({command: 'not valid'})
      
      break
  }
