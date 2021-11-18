const fs = require("fs");
require('@nomiclabs/hardhat-truffle5');
require("@nomiclabs/hardhat-waffle");
require("solidity-coverage");
require("dotenv").config();
require("@nomiclabs/hardhat-etherscan");

// Load tasks

const files = fs.readdirSync('./tasks');

for (let file of files) {
    if (!file.endsWith('.js')) continue;
    require(`./tasks/${file}`);
}


// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
/* task('accounts', 'Prints the list of accounts', async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
}); */


/* task("Deploy", "Deploys the governance system with command line parameters")
.addParam("token", "The address to receive the initial supply")
.addParam("timelock", "The timelock administrator")
.addParam("guardian", "The governor guardian").setAction(async taskArgs => {
    
  const { deploy } = require("./scripts/deploy");

    await deploy({
      tokenRecipient: taskArgs.token,
      timeLockAdmin: taskArgs.timelock,
      guardian: taskArgs.guardian
    });

    // usage:
    // npx hardhat Deploy --token 0xAddressToReceivetokens --timelock 0xAddressTimeLockAdmin --guardian 0xAddressGovernorAlphaAdmin --network rinkeby
    // or without params
    // npx hardhat run scripts/deploy.js --network kovan
}) */

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  etherscan: {
    apiKey: 'YWGA9IG8T37IZ5JX4UKKNNF8E3W8XKGCD1'
  },

  networks: {
    hardhat: {
        allowUnlimitedContractSize: true
    },
  },

  solidity: {
    compilers: [
      {
        version: "0.5.16"
      },
      {
        version: "0.7.0"
      },
      {
        version: "0.8.0"
      },
      {
        version: "0.8.3"
      }
    ]
  },
  mocha: {
    timeout: 300000 // 5 minutes in milliseconds
  }
};


if (process.env.PRIVATE_KEY && process.env.ALCHEMY_API_KEY) {
  module.exports.networks = {
      ...module.exports.networks,
      kovan: {
          url: `https://eth-kovan.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
          accounts: [`0x${process.env.PRIVATE_KEY}`],
      },
      ropsten: {
          url: `https://eth-ropsten.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
          accounts: [`0x${process.env.PRIVATE_KEY}`],
      },
      goerli: {
          url: `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
          accounts: [`0x${process.env.PRIVATE_KEY}`],
      },
      rinkeby: {
        url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
        accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
  };
}