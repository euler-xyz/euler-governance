const fs = require("fs");
require('@nomiclabs/hardhat-truffle5');
require("@nomiclabs/hardhat-waffle");
require("solidity-coverage");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require('@openzeppelin/hardhat-upgrades');

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
      },
      {
        version: "0.8.4",
        settings: {
          optimizer: {
              enabled: true,
              runs: 1,
          },
        }
      }
    ]
  },
  mocha: {
    timeout: 300000 // 5 minutes in milliseconds
  },

  gasReporter: {
    enabled: false
  }
};


if (process.env.NODE_ENV) {
  let path = `.env.${process.env.NODE_ENV}`;
  if (!fs.existsSync(path)) throw(`unable to open env file: ${path}`);
  require("dotenv").config({ path, });
} else if (fs.existsSync('./.env')) {
  require("dotenv").config();
}

for (let k in process.env) {
  if (k.startsWith("RPC_URL_")) {
      let networkName = k.slice(8).toLowerCase();

      module.exports.networks = {
          [networkName]: {
              url: `${process.env[k]}`,
              accounts: [`0x${process.env.PRIVATE_KEY}`],
          }
      }
  }

  if (k == "ETHERSCAN_API_KEY") {
    module.exports.etherscan = {
      apiKey: process.env[k]
    }
  }
}
