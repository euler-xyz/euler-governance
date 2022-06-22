task("gov:deployGovernanceContracts")
    .addPositionalParam("eul", "the address of the euler token")
    .addPositionalParam("multisig", "the address of the Euler multisig to assign canceller role")
    .addPositionalParam("governorName", "name of the governor smart contract, e.g., Euler Governor")
    .addPositionalParam("minDelay", "minimum execution delay in seconds")
    .addPositionalParam("votingDelay", "number of blocks between proposal creation and voting start")
    .addPositionalParam("votingPeriod", "number of blocks for voting period, assuming 13.14 seconds per block")
    .addPositionalParam("quorumNumerator", "numerator for percentage of total supply to form quorum, e.g., 4 for 4% quorum while denominator is 100")
    .addPositionalParam("proposalThreshold", "amount of tokens or voting power required for a user to have in order to create a proposal, e.g., 1000")
    .setAction(async (args) => {
        try {
            const TIMELOCKCONTROLLER = await hre.ethers.getContractFactory("contracts/governance/TimelockController.sol:TimelockController");
            const GOVERNANCE = await hre.ethers.getContractFactory("Governance");

            // minimum delay, [proposers + cancellers], [executors]
            const timelockController = await TIMELOCKCONTROLLER.deploy(
                args.minDelay, [args.multisig], []
            );
                
            const deployer = timelockController.deployTransaction.from;
            console.log(`Deployer Address ${deployer}`);

            console.log(`TimelockController Deployment Transaction Hash: ${timelockController.deployTransaction.hash} (on ${hre.network.name})`);

            let timelockContract = await timelockController.deployed();
            console.log(`TimelockController Contract Address: ${timelockContract.address}`);

            // governor contract name, voting token, 
            // voting delay, voting period,
            // timelockController address, quorumNumerator, 
            // proposalThreshold
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

            // Proposer role - governor contract 
            const proposerRoleTx = await timelockContract.grantRole(await timelockContract.PROPOSER_ROLE(), governanceContract.address);
            console.log(`Proposer Role Transaction: ${proposerRoleTx.hash}`);
            let result = await proposerRoleTx.wait();
            console.log(`Mined. Status: ${result.status}`);

            // Executor role - governance contract
            const executorRoleTx = await timelockContract.grantRole(await timelockContract.EXECUTOR_ROLE(), governanceContract.address);
            console.log(`Executor Role Transaction: ${executorRoleTx.hash}`);
            result = await executorRoleTx.wait();
            console.log(`Mined. Status: ${result.status}`);

            const timelockCancellerRole = await timelockContract.CANCELLER_ROLE();
            console.log(`Multisig is assigned Canceller Role? ${await timelockContract.hasRole(timelockCancellerRole, args.multisig)}`);

            const timelockExecutorRole = await timelockContract.EXECUTOR_ROLE();
            console.log(`Governance contract is assigned Executor Role? ${await timelockContract.hasRole(timelockExecutorRole, governanceContract.address)}`);

            const timelockProposerRole = await timelockContract.PROPOSER_ROLE();
            console.log(`Multisig is assigned Proposer Role? ${await timelockContract.hasRole(timelockProposerRole, args.multisig)}`);
            console.log(`Governance contract is assigned Proposer Role? ${await timelockContract.hasRole(timelockProposerRole, governanceContract.address)}`);

            const timelockAdminRole = await timelockContract.TIMELOCK_ADMIN_ROLE();
            console.log(`Deployer is assigned Timelock Admin Role? ${await timelockContract.hasRole(timelockAdminRole, deployer)}`);
            console.log(`Timelock itself is assigned Timelock Admin Role? ${await timelockContract.hasRole(timelockAdminRole, timelockContract.address)}`);


            // Admin role - is by default assigned to deployer (_msgSender()) and timelock instance itself, i.e., <address(this)> 
            // deployer can give up the timelock admin role as well
            // await timelockContract.revokeRole(await timelockContract.TIMELOCK_ADMIN_ROLE(), deployerAddress); 

            // Canceller role - admin user/multisig
            // const cancellerRoleTx = await timelockContract.grantRole(await timelockContract.CANCELLER_ROLE(), args.multisig);
            // console.log(`Canceller Role Transaction: ${cancellerRoleTx.hash}`);
            // result = await cancellerRoleTx.wait();
            // console.log(`Mined. Status: ${result.status}`);
        } catch (e) {
            console.log(e.message);
        }
    });