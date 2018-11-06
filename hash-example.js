var Web3 = require('web3')
web3 = new Web3()

let msg = 'Hello World!'
console.log(web3.utils.sha3(msg, {encoding: 'hex'}))