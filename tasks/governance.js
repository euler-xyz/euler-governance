task("gov:deployGovernanceContracts")
    .addPositionalParam("eul", "the address of the euler token")
    .addPositionalParam("multisig", "the address of the Euler multisig to assign canceller role")
    .addPositionalParam("governorName", "name of the governor smart contract, e.g., Euler Governor")
    .addPositionalParam("minDelay", "minimum execution delay in seconds")
    .addPositionalParam("votingDelay", "number of blocks between proposal creation and voting start")
    .addPositionalParam("votingPeriod", "number of blocks for voting period, assuming 13.14 seconds per block")
    .addPositionalParam("quorumNumerator", "numerator for percentage of total supply to form quorum, e.g., 4 for 4% quorum while denominator is 100")
    .addPositionalParam("proposalThreshold", "amount of tokens or voting power required for a user to have in order to create a proposal")
    .setAction(async (args) => {
        try {
            const TIMELOCKCONTROLLER = await hre.ethers.getContractFactory("contracts/governance/TimelockController.sol:TimelockController");
            const GOVERNANCE = await hre.ethers.getContractFactory("Governance");

            const timelockController = await TIMELOCKCONTROLLER.deploy(
                args.minDelay, [], []
            );
            
            console.log(`Deployer Address ${timelockController.deployTransaction.from}`);

            console.log(`TimelockController Deployment Transaction Hash: ${timelockController.deployTransaction.hash} (on ${hre.network.name})`);

            let timelockContract = await timelockController.deployed();
            console.log(`TimelockController Contract Address: ${timelockContract.address}`);

            const governance = await GOVERNANCE.deploy(
                args.governorName,
                args.eul,
                args.votingDelay,
                args.votingPeriod,
                timelockContract.address, // timelock controller address
                args.quorumNumerator,
                ethers.utils.parseEther((args.proposalThreshold).toString())
            );

            console.log(`Governance Deployment Transaction Hash: ${governance.deployTransaction.hash} (on ${hre.network.name})`);

            let governanceContract = await governance.deployed();

            console.log(`Governance Contract Address: ${governanceContract.address}`);

            // Proposer role - governor instance 
            const proposerRoleTx = await timelockContract.grantRole(await timelockContract.PROPOSER_ROLE(), governanceContract.address);
            console.log(`Proposer Role Transaction: ${proposerRoleTx.hash}`);
            let result = await proposerRoleTx.wait();
            console.log(`Mined. Status: ${result.status}`);

            // Executor role - assigned governance contract
            const executorRoleTx = await timelockContract.grantRole(await timelockContract.EXECUTOR_ROLE(), governanceContract.address);
            console.log(`Executor Role Transaction: ${executorRoleTx.hash}`);
            result = await executorRoleTx.wait();
            console.log(`Mined. Status: ${result.status}`);

            // Admin role - is by default assigned to deployer and timelock instance itself <address(this)> 
            // deployer can give up the timelock admin role as well
            // await timelockContract.revokeRole(await timelockContract.TIMELOCK_ADMIN_ROLE(), deployerAddress); 

            // Canceller role - admin user
            const cancellerRoleTx = await timelockContract.grantRole(await timelockContract.CANCELLER_ROLE(), args.multisig);
            console.log(`Canceller Role Transaction: ${cancellerRoleTx.hash}`);
            result = await cancellerRoleTx.wait();
            console.log(`Mined. Status: ${result.status}`);
        } catch (e) {

        }
    });

// example usage: NODE_ENV=rivet npx hardhat --network hardhat gov:deployGovernanceContracts 0x681E9cf95e26c6C2cEF09fdc476C7f8De6AFf2D5 0x13214Af5a958E47D0FA1366fC3D36dC3Fa46E80f "Euler Governor 1.0" 300 1 50 4 100

// verify governance contract on rinkeby example
// NODE_ENV=rivet npx hardhat verify --network rinkeby 0x681E9cf95e26c6C2cEF09fdc476C7f8De6AFf2D5 "Euler Governor" "0xe013C993A77Cdd1aC0d8c1B15a6eFf95EB36c8c6" "1" "50" "0x16fBC769237cE17830799e6faD9d53536c3B8389" "4" "100000000000000000000"

// verify timelockcontroller contract on rinkeby example with arguments script as it takes in an array / tuple as constructor argument
// NODE_ENV=rivet npx hardhat verify --network rinkeby --constructor-args arguments.js 0x16fBC769237cE17830799e6faD9d53536c3B8389
