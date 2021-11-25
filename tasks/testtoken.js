const { parseEther } = require("@ethersproject/units");
const { ethers } = require("ethers");

task("testtoken:deploy")
    .addPositionalParam("name")
    .addPositionalParam("symbol")
    .setAction(async (args) => {
        const Token = await hre.ethers.getContractFactory("ERC20VotesMock");
        const token = await Token.deploy(args.name, args.symbol);
        console.log(`Token Deployment Transaction Hash: ${token.deployTransaction.hash} (on ${hre.network.name})`);

        let result = await token.deployed();
        console.log(`Token Contract Address: ${result.address}`);
    });

task("testtoken:mint")
    .addPositionalParam("token")
    .addPositionalParam("who")
    .addPositionalParam("amount")
    .setAction(async (args) => {
        const Token = await hre.ethers.getContractFactory("ERC20VotesMock");
        const token = await Token.attach(args.token);
        const decimals = await token.decimals();

        const tx = await token.mint(args.who, ethers.utils.parseUnits(args.amount, decimals));

        console.log(`Transaction Hash: ${tx.hash} (on ${hre.network.name})`);
        let result = await tx.wait();
        console.log(`Mined. Status: ${result.status}`);
    });

task("testtoken:balanceOf")
    .addPositionalParam("token")
    .addPositionalParam("who")
    .setAction(async (args) => {
        const Token = await hre.ethers.getContractFactory("ERC20VotesMock");
        const token = await Token.attach(args.token);
        const decimals = await token.decimals();
        console.log((await token.balanceOf(args.who)) / (10 ** decimals));
    });