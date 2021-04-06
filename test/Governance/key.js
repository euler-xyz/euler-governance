const { web3 } = require("@openzeppelin/test-helpers/src/setup");
const keythereum = require("keythereum");

async function keys() {
let accounts = await web3.eth.getAccounts();
console.log(accounts)

var address= accounts[0];
const password = "";

var privateKey = keythereum.recover(password, keyObject);
console.log(privateKey.toString('hex'));
}

keys()