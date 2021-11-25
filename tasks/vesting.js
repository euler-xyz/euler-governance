const { parseEther } = require("@ethersproject/units");
const { ethers } = require("ethers");
const prompt = require("prompt-sync")({ sigint: true });

task("vesting:latestBlock")
    .setAction(async () => {
        const latestBlock = await hre.ethers.provider.getBlockNumber();
        const latestBlockData = await hre.ethers.provider.getBlock(latestBlock);
        const latestBlockTimestamp = latestBlockData.timestamp;

        console.log(`Latest block number: ${latestBlock}`);
        console.log(`Latest block timestamp: ${latestBlockTimestamp}`);
    });

task("vesting:deployFactory")
    .addPositionalParam("eul")
    .addPositionalParam("treasury")
    .setAction(async (args) => {
        const userInput = prompt(
            "The following data will be used to deploy the vesting factory contract.\n" +
            `Euler token: ${args.eul}\n` +
            `Treasury: ${args.treasury}\n` +
            "\nPlease confirm with y or n: "
        );

        if (userInput == "y" || userInput == "yes") {
            const VestingFactory = await hre.ethers.getContractFactory("TreasuryVesterFactory");
            const vestingFactory = await VestingFactory.deploy(
                args.eul, args.treasury
            );
            console.log(`Vesting Factory Deployment Transaction Hash: ${vestingFactory.deployTransaction.hash} (on ${hre.network.name})`);

            let result = await vestingFactory.deployed();
            console.log(`Vesting Factory Contract Address: ${result.address}`);
        } else {
            console.log("Stoping deployment")
            return false;
        }
    });

task("vesting:createVesting")
    .addPositionalParam("vestingFactory")
    .addPositionalParam("recipient")
    .addPositionalParam("vestingAmount")
    .addPositionalParam("vestingBegin")
    .addPositionalParam("vestingCliff")
    .addPositionalParam("vestingEnd")
    .setAction(async (args) => {
        const userInput = prompt(
            "The following data will be used to deploy the vesting contract.\n" +
            "Ensure vestingBegin is >= latest block timestamp, vestingCliff >= vestingBegin and vestingEnd > vestingCliff\n" +
            `Recipient: ${args.recipient}\n` +
            `Vesting Amount: ${args.vestingAmount}\n` +
            `Vesting Begin: ${args.vestingBegin}\n` +
            `Vesting Cliff: ${args.vestingCliff}\n` +
            `Vesting End: ${args.vestingEnd}\n` +
            "\nPlease confirm with y or n: "
        );

        if (userInput == "y" || userInput == "yes") {
            const VestingFactory = await hre.ethers.getContractFactory("TreasuryVesterFactory");
            const vestingFactory = await VestingFactory.attach(args.vestingFactory);
            const tx = await vestingFactory.createVestingContract(
                args.recipient,
                parseEther(args.vestingAmount.toString()),
                parseInt(args.vestingBegin),
                parseInt(args.vestingCliff),
                parseInt(args.vestingEnd)
            );
            console.log(`Vesting Deployment Transaction Hash: ${tx.hash} (on ${hre.network.name})`);
            let result = await tx.wait();
            console.log(`Mined. Status: ${result.status}`);
            console.log(`Vesting Contract Address: ${result.events[1].args.vestingContract}`);
            console.log(`Vesting Contract Index: ${result.events[1].args.index}`);
            console.log(`Vesting Contract Recipient: ${result.events[1].args.recipient}`);
        } else {
            console.log("Stoping deployment")
            return false;
        }
    });



    task("vesting:withdraw")
    .addPositionalParam("vestingFactory")
    .addPositionalParam("amount")
    .setAction(async (args) => {
            const VestingFactory = await hre.ethers.getContractFactory("TreasuryVesterFactory");
            const vestingFactory = await VestingFactory.attach(args.vestingFactory);
            const tx = await vestingFactory.withdraw(
                ethers.utils.parseUnits(args.amount, 18)
            );
            console.log(`Transaction Hash: ${tx.hash} (on ${hre.network.name})`);
            let result = await tx.wait();
            console.log(`Mined. Status: ${result.status}`);
    });

    task("vesting:updateTreasury")
    .addPositionalParam("vestingFactory")
    .addPositionalParam("treasury")
    .setAction(async (args) => {
            const VestingFactory = await hre.ethers.getContractFactory("TreasuryVesterFactory");
            const vestingFactory = await VestingFactory.attach(args.vestingFactory);
            const tx = await vestingFactory.updateTreasury(
                args.treasury
            );
            console.log(`Transaction Hash: ${tx.hash} (on ${hre.network.name})`);
            let result = await tx.wait();
            console.log(`Mined. Status: ${result.status}`);
    });

    