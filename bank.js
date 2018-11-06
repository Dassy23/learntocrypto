var jsonStream = require('duplex-json-stream')
var net = require('net')
const fs = require('fs')
var Web3 = require('web3')
var sodium = require('sodium-native')
var ganache = require('ganache-cli')
var web3 = new Web3(ganache.provider())
var genesisHash = Buffer.alloc(32).toString('hex')
var log,publicKey,secretKey,key,ekey

const init = async() =>{
    //read ecrypt key
    try{
        ekey  = (fs.readFileSync("./ekey.txt",'utf-8'))
        ekey = Buffer.from(ekey,"hex")
    } catch(e){
        //create encrypt key
        ekey = new Buffer(sodium.crypto_secretbox_KEYBYTES)
    }
    try{
        //ready banklog
        log  = JSON.parse((fs.readFileSync("./bankLog.JSON")))
        log = decrypt(log)
        
    } catch(e){
        //create log if not already available
        log = []
    }


    try{
        //read public private key
        publicKey  = (fs.readFileSync("./publickey.txt",'utf-8'))
        secretKey  = (fs.readFileSync("./secretkey.txt",'utf-8'))
        
        publicKey = Buffer.from(publicKey,"hex")
        secretKey = Buffer.from(secretKey,"hex")
        
    } catch(e){
        //save key to file
        publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
        secretKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES)
        
        sodium.crypto_sign_keypair(publicKey, secretKey)
        
        
        fs.writeFileSync('./publickey.txt', publicKey.toString('hex') );
        fs.writeFileSync('./secretkey.txt', secretKey.toString('hex'));
    }
    //

    key = Buffer.from(publicKey)
    //verify log with key
    verifyKey(log,key)
}

init()

console.log(`Bank is open`)
//verify if entries have been tampered with 
verifyEntries(log)
var server = net.createServer(function (socket) {
  socket = jsonStream(socket)
  socket.on('data', function (msg) {
    msg = {
        ...msg,
        sig: msg.sig.toString('hex'),
        
    }
    console.log('Bank received:', msg)
    if(msg.command == 'balance'){
        socket.write({command: 'balance', balance: getBal(msg.id,log) })
    } else if (msg.command == 'deposit'){
        if(verifySig){
            appendToTransactionLog(msg)  
            socket.write({command: msg.command, balance: getBal(msg.id,log)})
        } else {
            socket.write('Invalid Signature')
        }
    } else if(msg.command == 'withdraw'){
        debugger
        if(Math.abs(msg.amount) > getBal(msg.id,log)){
            socket.write('Insufficient funds')
        } else {
            if(verifySig){
                appendToTransactionLog(msg)  
                socket.write({command: msg.command, balance:getBal(msg.id,log)})
            } else {
                socket.write('Invalid Signature')
            }     
        }
    } else if (msg.command == 'not valid'){
        socket.write('Not a valid command')
    } else if( msg.command == 'register'){
        var publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
        var secretKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES)
        sodium.crypto_sign_keypair(publicKey, secretKey)
        socket.write({command: msg.command, secretKey: secretKey.toString('hex'), publicKey:publicKey.toString('hex') }) 
    }

    let encryptedData = encrypt(log)
    fs.writeFileSync('./bankLog.JSON', JSON.stringify({cipher:encryptedData.cipher, nonce: encryptedData.nonce}));
  })
})
//verify if signature is correct
function verifySig(msg) {
    let signature = Buffer.from(msg.sig)
    let message = Buffer.from(message)
    let publicKey = Buffer.from(publicKey,'hex')
    return sodium.crypto_sign_verify_detached(signature, message, publicKey)
}
//get balance for user
const getBal = function(id,log) {
    debugger
    let bal = log.filter(x => x.id==id).reduce((t,a) => t + a.value.amount,0)
    return bal
}


//append transaction to log
const appendToTransactionLog = async (entry) => {
  
  var prevHash = log.length ? log[log.length - 1].hash : genesisHash
  var hash =  hashToHex(prevHash + JSON.stringify(entry))
  var signHash = Buffer.from(hash, "hex")
  var signature = Buffer.alloc(sodium.crypto_sign_BYTES)
  
  //sign transaction
  sodium.crypto_sign_detached(signature, signHash, secretKey)
  let data= {
    id:entry.id,  
    value: entry,
    hash: hash,
    signature: signature.toString('hex')
  }
  
  log.push(data)
}

//return hex hash
function hashToHex (entry){
    return (web3.utils.sha3(entry, {encoding: 'hex'})).slice(2,)
}
//verify if entries have been tampered with
function verifyEntries(entries) {
    if(entries.length > 0){
        entries.forEach((entry,i) => {
            let prevHash = i != 0 ? entries[i - 1].hash : genesisHash
            let checkHash = hashToHex(prevHash + JSON.stringify(entry.value))
            if(entries.length > 0){
                if(checkHash != entry.hash){
                    console.log(`Bank log entry ${i+1} has been tampered with!`)
                } 
            }
        });
    }
}
//verify if public key is correct
function verifyKey(entries,publicKey){
    //messed something up here
    if(entries.length > 0){
        
        var sig = entries[entries.length-1].signature
        var prevHash = entries[entries.length-1].hash
        prevHash = Buffer.from(prevHash,'hex')
        sig = Buffer.from(sig, 'hex')
        var bool = sodium.crypto_sign_verify_detached(sig, prevHash, publicKey)
        bool? console.log('public key is correct'): console.log('incorrect public key')
    }
}
//encrypt log
function encrypt(entry){
    let obj ={}

    var nonce = new Buffer(sodium.crypto_secretbox_NONCEBYTES)

   
    sodium.randombytes_buf(nonce)
    
    var message = new Buffer(JSON.stringify(entry))
    var cipher = new Buffer(message.length + sodium.crypto_secretbox_MACBYTES)

    sodium.crypto_secretbox_easy(cipher, message, nonce, ekey)
    fs.writeFileSync('./ekey.txt', publicKey.toString('hex') );
    obj.cipher = cipher.toString('hex')
    obj.nonce = nonce.toString('hex')
    return obj
}
//decrypt log
function decrypt(obj){
    let cipher = Buffer.from(obj.cipher,'hex')
    let nonce = Buffer.from(obj.nonce,'hex')
    var plainText = new Buffer(cipher.length - sodium.crypto_secretbox_MACBYTES)
    
  
    sodium.crypto_secretbox_open_easy(plainText, cipher, nonce, ekey)

    let decrypted = JSON.parse(plainText)
    
    return decrypted
}




server.listen(3876)