const { BN, constants, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { duration, increase, increaseTo } = require('@openzeppelin/test-helpers/src/time');
const { expect } = require('chai');
const { expectBignumberEqual } = require('../../helpers');
const { toBN, latest, shouldFailWithMessage } = require('../../helpers/utils');
const { findEventInTransaction } = require('../../helpers/events');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const { MAX_UINT256, ZERO_ADDRESS, ZERO_BYTES32 } = constants;

const ERC20VotesMock = artifacts.require('ERC20VotesMock');
const Vesting = artifacts.require('TreasuryVester');

contract('TreasuryVester: governance', function (accounts) {
    const [owner, recipient, otherAccount] = accounts;

    const name = 'Euler';
    const symbol = 'EUL';
    const initialSupply = new BN(200);
    const vestingAmount = new BN(15);
    let now, vestingBegin, vestingCliff, vestingEnd;

    // const Token = artifacts.require('TestToken');
    const Timelock = artifacts.require('TimelockController');
    const Governor = artifacts.require('Governance');
    const CallReceiver = artifacts.require('CallReceiverMock');

    beforeEach(async function () {
        this.token = await ERC20VotesMock.new(name, symbol);
        now = await latest();
        vestingBegin = now.add(await duration.minutes(5));
        vestingCliff = now.add(await duration.minutes(15));
        vestingEnd = now.add(await duration.minutes(25));
        this.vesting = await Vesting.new(
            this.token.address,
            recipient,
            vestingAmount,
            vestingBegin,
            vestingCliff,
            vestingEnd
        );

        this.timelock = await Timelock.new(3600, [], []);
        let proposalThreshold = vestingAmount;
        this.mock = await Governor.new("Euler-Governance", this.token.address, 4, 16, this.timelock.address, 4, proposalThreshold);
        this.receiver = await CallReceiver.new();
        // normal setup: governor is proposer, everyone is executor, timelock is its own admin
        await this.timelock.grantRole(await this.timelock.PROPOSER_ROLE(), this.mock.address);
        await this.timelock.grantRole(await this.timelock.EXECUTOR_ROLE(), constants.ZERO_ADDRESS);
        // await this.timelock.revokeRole(await this.timelock.TIMELOCK_ADMIN_ROLE(), deployer);
        // await this.token.mint(voter, tokenSupply);
        // await this.token.delegate(voter, { from: voter });
    });

    describe('create proposal', function () {
        it('allow vesting delegatee create a proposal if the amount of tokens vested meets proposal threshold', async function () {
            await this.token.mint(this.vesting.address, vestingAmount);
        await this.vesting.delegate(recipient, {from: recipient});

            const proposal = [
                [ this.receiver.address ],
                [ web3.utils.toWei('0') ],
                [ this.receiver.contract.methods.mockFunction().encodeABI() ],
                '<proposal description>',
            ]
            
            const descriptionHash = web3.utils.keccak256(proposal.slice(-1).find(Boolean));
            const id = await this.mock.hashProposal(...proposal.slice(0, -1), descriptionHash);

            const tx = await this.mock.methods['propose(address[],uint256[],bytes[],string)'](
                ...proposal,
                { from: recipient },
            );

            const {args} = await findEventInTransaction(tx, 'ProposalCreated');
            expectBignumberEqual(args.proposalId, id);

        });

        it('revert if delegatee tries to create proposal and the amount of tokens vested is below the proposal threshold', async function () {
            await this.token.mint(this.vesting.address, vestingAmount.sub(toBN(1)));
        await this.vesting.delegate(recipient, {from: recipient});
        
            const proposal = [
                [ this.receiver.address ],
                [ web3.utils.toWei('0') ],
                [ this.receiver.contract.methods.mockFunction().encodeABI() ],
                '<proposal description>',
            ]
            
            const descriptionHash = web3.utils.keccak256(proposal.slice(-1).find(Boolean));
            const id = await this.mock.hashProposal(...proposal.slice(0, -1), descriptionHash);

            await shouldFailWithMessage(
                this.mock.methods['propose(address[],uint256[],bytes[],string)'](
                ...proposal,
                { from: recipient }),
                'GovernorCompatibilityBravo: proposer votes below proposal threshold'
            );

            
        });
    });

    describe('cast vote', function () {
        /* it('allow delegatee cast a vote on a proposal if amount vested is greater than zero', async function () {
            
        });

        it('should attach/set correct voting power on the proposal after delegatee casts vote', async function () {
            
        });

        it('revert if amount vested is not greater than zero', async function () {
            
        }); */
    });


});