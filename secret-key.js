var sodium = require('sodium-native')

var key = new Buffer(sodium.crypto_secretbox_KEYBYTES)
sodium.randombytes_buf(key)

console.log(key)