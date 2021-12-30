const prompt = require("prompt-sync")({ sigint: true });

task("eul:deploy")
    .addPositionalParam("treasury")
    .setAction(async (args) => {
        if (!hre.ethers.utils.isAddress(args.treasury)) {
            console.log("Please specify a valid address");
            return false;
        } 

        const userInput = prompt(
            "The following treasury address will be used to deploy the token contract.\n" +
            `Treasury: ${args.treasury}\n` +
            "\nPlease confirm with y or n: "
        );

        if (userInput == "y" || userInput == "yes") {
            const tokenName = 'Euler';
            const tokenSymbol = 'EUL';
            const totalSupply = web3.utils.toWei('27182818.284590452353602874');
            const mintingRestrictedBefore = '1767225600'; // 1st January 2026, 12am
            const treasury = args.treasury;
    
            // Deploy Euler token contract
            const Euler = await hre.ethers.getContractFactory("Eul");
            const euler = await Euler.deploy(
                tokenName, 
                tokenSymbol, 
                totalSupply,
                mintingRestrictedBefore,
                treasury
            );
            console.log(`Euler Deployment Transaction: ${euler.deployTransaction.hash}`);

            await euler.deployed();
            console.log("Euler token deployed to:", euler.address);
            console.log("Treasury/Multisig Euler token balance after deployment:", ethers.utils.formatEther(await euler.balanceOf(treasury)));

            // Note: only default/god-like admin can grant and revoke roles.
            // other roles, e.g., admins cannot transfer but renounce role.
            const defaultAdminRole = await euler.DEFAULT_ADMIN_ROLE(); 
            const adminRole = await euler.ADMIN_ROLE();
            console.log("Multisig is default admin: ", await euler.hasRole(defaultAdminRole, treasury));
            console.log("Multisig is admin: ", await euler.hasRole(adminRole, treasury));
        } else {
            console.log("Stoping deployment")
            return false;
        }
    });