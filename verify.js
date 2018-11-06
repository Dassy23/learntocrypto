var Web3 = require('web3')
var ganache = require('ganache-cli')
web3 = new Web3(ganache.provider())
const argv = require('yargs').argv



var bool = sodium.crypto_sign_verify_detached(signature, message, publicKey)
console.log(bool)