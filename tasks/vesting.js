const { parseEther } = require("@ethersproject/units");
const prompt = require("prompt-sync")({ sigint: true });

task("vesting:latestBlock")
.setAction(async () => {
    const latestBlock = await hre.ethers.provider.getBlockNumber();
    const latestBlockData = await hre.ethers.provider.getBlock(latestBlock);
    const latestBlockTimestamp = latestBlockData.timestamp;
    
    console.log(`Latest block number: ${latestBlock}`);
    console.log(`Latest block timestamp: ${latestBlockTimestamp}`);
});

task("vesting:deploy")
.addPositionalParam("eul")
.addPositionalParam("recipient")
.addPositionalParam("vestingAmount")
.addPositionalParam("vestingBegin")
.addPositionalParam("vestingCliff")
.addPositionalParam("vestingEnd")
.setAction(async (args) => {
    const userInput = prompt(
        "The following data will be used to deploy the vesting contract.\n" +
        "Ensure vestingBegin is >= latest block timestamp, vestingCliff >= vestingBegin and vestingEnd > vestingCliff\n" +
        `Euler token: ${args.eul}\n` + 
        `Recipient: ${args.recipient}\n` + 
        `Vesting Amount: ${args.vestingAmount}\n` + 
        `Vesting Begin: ${args.vestingBegin}\n` + 
        `Vesting Cliff: ${args.vestingCliff}\n` + 
        `Vesting End: ${args.vestingEnd}\n` +  
        "\nPlease confirm with y or n: "
    );
    
    if (userInput == "y" || userInput == "yes") {
            const Vesting = await hre.ethers.getContractFactory("TreasuryVester");
            const vesting = await Vesting.deploy(
            args.eul, args.recipient, 
            parseEther(args.vestingAmount.toString()),
            parseInt(args.vestingBegin),
            parseInt(args.vestingCliff),
            parseInt(args.vestingEnd)
        );
        console.log(`Vesting Deployment Transaction Hash: ${vesting.deployTransaction.hash}`);

        let result = await vesting.deployed();
        console.log(`Vesting Contract Address: ${result.address}`);
    } else {
        console.log("Stoping deployment")
        return false;
    }
});