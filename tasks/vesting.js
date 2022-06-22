const { parseEther } = require("@ethersproject/units");
const { ethers } = require("ethers");
const prompt = require("prompt-sync")({ sigint: true });


task("network:latestBlock")
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
    .addPositionalParam("treasuryVester")
    .setAction(async (args) => {
        const userInput = prompt(
            "The following data will be used to deploy the vesting factory contract.\n" +
            `Euler token: ${args.eul}\n` +
            `Treasury: ${args.treasury}\n` +
            `Treasury Vester: ${args.treasuryVester}\n` +
            "\nPlease confirm with y or n: "
        );

        if (userInput == "y" || userInput == "yes") {
            const VestingFactory = await hre.ethers.getContractFactory("TreasuryVesterFactory");
            const vestingFactory = await VestingFactory.deploy(
                args.eul, args.treasury, args.treasuryVester
            );
            console.log(`Vesting Factory Deployment Transaction Hash: ${vestingFactory.deployTransaction.hash} (on ${hre.network.name})`);

            let result = await vestingFactory.deployed();
            console.log(`Vesting Factory Contract Address: ${result.address}`);
        } else {
            console.log("Stoping deployment")
            return false;
        }
    });


task("vesting:deployVester")
    .setAction(async () => {
        const Vester = await hre.ethers.getContractFactory("TreasuryVester");
        const vester = await Vester.deploy();
        console.log(`Vester Deployment Transaction Hash: ${vester.deployTransaction.hash} (on ${hre.network.name})`);

        let result = await vester.deployed();
        console.log(`Vester Contract Address: ${result.address}`);

    });

task("vesting:createVestingFromCSV")
    .addPositionalParam("vestingFactory")
    // arg will be path to csv file
    .setAction(async (args) => {
        if (!hre.ethers.utils.isAddress(args.vestingFactory)) {
            console.log(`[ERROR]: invalid address for vestingFactory`)
            return;
        }
        const VestingFactory = await hre.ethers.getContractFactory("TreasuryVesterFactory");
        const vestingFactory = await VestingFactory.attach(args.vestingFactory);

        const fs = require('fs')
        const inputPath = "./vestingSchedules.csv";
        const textByLine = fs.readFileSync(inputPath).toString().split("\n");

        let output = "recipientAddress,vestingAmount,vestingBegin,vestingCliff,vestingEnd,vestingAddress\n"

        // let i = 1 to skip headings
        for (let i = 1; i < textByLine.length; i++) {
            const row = textByLine[i].split(",")

            // recipient address
            if (!hre.ethers.utils.isAddress(row[0])) {
                console.log(`[ERROR]: recipient address is invalid for data in row ${i + 1}`)
                continue;
            }

            const vestingBegin = 1640995200;
            const vestingCliff = vestingBegin; // parseInt(row[2]);
            const vestingEnd = parseInt(row[3]);

            // vestingAmount
            if (
                isNaN(parseInt(row[1]))
            ) {
                console.log(`[ERROR]: invalid value for vestingAmount in row ${i + 1}`);
                continue;
            }
            // vestingCliff
            if (
                !(
                    // !isNaN(vestingCliff) && 
                    vestingCliff > Math.floor(Date.now() / 1000) &&
                    vestingCliff >= vestingBegin
                )
            ) {
                console.log(`[ERROR]: invalid value for vestingCliff in row ${i + 1}`);
                continue;
            }
            // vestingEnd
            if (
                !(
                    !isNaN(vestingEnd) &&
                    vestingEnd > Math.floor(Date.now() / 1000) &&
                    vestingEnd > vestingCliff
                )
            ) {
                console.log(`[ERROR]: invalid value for vestingEnd in row ${i + 1}`);
                continue;
            }

            // check if vesting data is unique and no contract exists
            // todo try catch for alll static and calls
            const vestingDataHash = await vestingFactory.hashVestingData(
                row[0],
                parseEther(row[1].toString()),
                vestingBegin,
                vestingCliff,
                vestingEnd
            );

            const vestingContractExists = hre.ethers.utils.isAddress(await vestingFactory.vestingData(vestingDataHash));
            if (vestingContractExists) {
                console.log(`[SKIPPING]: vesting contract already exists for vesting data in row ${i + 1}`);
                continue;
            }

            // testing tx here to save gas if tx reverts
            let isValid = false;

            let signers = await hre.ethers.getSigners();
            let signer = signers[0];
            try {
                let estimateGasResult = await vestingFactory.connect(signer).estimateGas['createVestingContract'].apply(null,
                    row[0],
                    parseEther(row[1].toString()),
                    vestingBegin,
                    vestingCliff,
                    vestingEnd,
                );

                await instance.methods['createVestingContract(address,uint256,uint256,uint256,uint256)'].call(
                    row[0],
                    parseEther(row[1].toString()),
                    vestingBegin,
                    vestingCliff,
                    vestingEnd,
                    {
                        gasLimit: Math.floor(estimateGasResult * 1.01 + 1000)
                    }
                )
                isValid = true;
            } catch {
                console.log(`[SKIPPING]: row ${i + 1} as transaction will fail with error: ${e}`);
            }

            if (isValid) {
                try {
                    const tx = await vestingFactory.createVestingContract(
                        row[0],
                        parseEther(row[1].toString()),
                        vestingBegin,
                        vestingCliff,
                        vestingEnd
                    );
                    console.log(`Vesting Deployment Transaction Hash: ${tx.hash} (on ${hre.network.name})`);
                    let result = await tx.wait();
                    console.log(`Mined. Status: ${result.status}`);
                    const event = result.events.find(event => event.event === 'VestingContract');
                    const [recipient, vestingContract, index] = event.args;
                    console.log(`Vesting Contract Address: ${vestingContract}`);
                    console.log(`Vesting Contract Index: ${index.toString()}`);
                    console.log(`Vesting Contract Recipient: ${recipient}`);
                    output += `${row},${vestingContract},\n`;
                } catch (e) {
                    console.log(`[SKIPPING]: row ${i + 1} as transaction failed with error: ${e}`);
                }
            }
        }
        // todo write all data to csv file. replace missing address with 0x0
        console.log("\nDONE\n");
        console.log(output);
    });



task("vesting:createVesting")
    .addPositionalParam("vestingFactory")
    .addPositionalParam("recipient")
    .addPositionalParam("vestingAmount", "In normal decimal units. Will be converted by hardhat task")
    .addPositionalParam("vestingBegin")
    .addPositionalParam("vestingCliff")
    .addPositionalParam("vestingEnd")
    .setAction(async (args) => {
        if (parseInt(args.vestingBegin) != 1640995200 || parseInt(args.vestingCliff) != 1640995200) {
            console.log("Vesting begin and cliff must be equal to 1st of January, 2022. ie., 1640995200 in unix timestamp ");
            return false;
        }

        const userInput = prompt(
            "The following data will be used to deploy the vesting contract.\n" +
            "Ensure that vestingCliff >= vestingBegin and vestingEnd > vestingCliff\n" +
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
            const event = result.events.find(event => event.event === 'VestingContract');
            const [recipient, vestingContract, index] = event.args;
            console.log(`Vesting Contract Address: ${vestingContract}`);
            console.log(`Vesting Contract Index: ${index.toString()}`);
            console.log(`Vesting Contract Recipient: ${recipient}`);
        } else {
            console.log("Stoping deployment")
            return false;
        }
    });


task("vesting:createVestingMainnet")
    .addPositionalParam("vestingFactory")
    .addPositionalParam("recipient")
    .addPositionalParam("vestingAmount", "In normal decimal units. Will be converted by hardhat task")
    .addPositionalParam("vestingEnd")
    .setAction(async (args) => {
        const vesterFactory = "0x2EeB5af890F370ae711F99Aaec0166728c40cF9D";
        const vestingBegin = 1640995200;
        const vestingCliff = 1640995200;
        const userInput = prompt(
            "The following data will be used to deploy the vesting contract.\n" +
            "Ensure that vestingCliff >= vestingBegin and vestingEnd > vestingCliff\n" +
            `TreasuryVesterFactory: 0x2EeB5af890F370ae711F99Aaec0166728c40cF9D` +
            `Recipient: ${args.recipient}\n` +
            `Vesting Amount: ${args.vestingAmount}\n` +
            `Vesting Begin: ${vestingBegin}\n` +
            `Vesting Cliff: ${vestingCliff}\n` +
            `Vesting End: ${args.vestingEnd}\n` +
            "\nPlease confirm with y or n: "
        );

        if (userInput == "y" || userInput == "yes") {
            const VestingFactory = await hre.ethers.getContractFactory("TreasuryVesterFactory");
            const vestingFactory = await VestingFactory.attach(vesterFactory);
            const tx = await vestingFactory.createVestingContract(
                args.recipient,
                parseEther(args.vestingAmount.toString()),
                vestingBegin,
                vestingCliff,
                parseInt(args.vestingEnd)
            );
            console.log(`Vesting Deployment Transaction Hash: ${tx.hash} (on ${hre.network.name})`);
            let result = await tx.wait();
            console.log(`Mined. Status: ${result.status}`);
            const event = result.events.find(event => event.event === 'VestingContract');
            const [recipient, vestingContract, index] = event.args;
            console.log(`Vesting Contract Address: ${vestingContract}`);
            console.log(`Vesting Contract Index: ${index.toString()}`);
            console.log(`Vesting Contract Recipient: ${recipient}`);
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



task("vesting:getVestingContracts")
    .addPositionalParam("vestingFactory")
    .addPositionalParam("recipient")
    .setAction(async (args) => {
        const VestingFactory = await hre.ethers.getContractFactory("TreasuryVesterFactory");
        const vestingFactory = await VestingFactory.attach(args.vestingFactory);
        const vestingContractCount = await vestingFactory.getVestingContracts(
            args.recipient
        );
        console.log(`Vesting Contract Count for recipient ${args.recipient}: ${vestingContractCount}`);
    });