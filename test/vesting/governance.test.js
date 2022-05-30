const { BN, constants, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { duration, increase, increaseTo } = require('@openzeppelin/test-helpers/src/time');
const { expect } = require('chai');
const { expectBignumberEqual } = require('../../helpers');
const { toBN, latest, shouldFailWithMessage } = require('../../helpers/utils');
const { findEventInTransaction } = require('../../helpers/events');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const { MAX_UINT256, ZERO_ADDRESS, ZERO_BYTES32 } = constants;

const ERC20VotesMock = artifacts.require('ERC20VotesMock');
const Vesting = artifacts.require('MockTreasuryVester');

contract('TreasuryVester: governance', function (accounts) {
    const [owner, recipient, otherAccount] = accounts;

    const name = 'Euler';
    const symbol = 'EUL';
    const initialSupply = new BN(200);
    const vestingAmount = new BN(15);
    let now, vestingBegin, vestingCliff, vestingEnd;

    const Timelock = artifacts.require('contracts/governance/TimelockController.sol:TimelockController');
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
        
    });

    describe('cast vote', function () {
        it('allow delegatee cast a vote on a proposal and if amount vested is greater than zero, should increment votes', async function () {
            await this.vesting.delegate(recipient, {from: recipient});
            await this.token.mint(owner, vestingAmount);
            await this.token.mint(this.vesting.address, vestingAmount);
            
            expectBignumberEqual(
                await this.mock.proposalThreshold(),
                await this.token.balanceOf(owner)
            );

            const proposal = [
                [ this.receiver.address ],
                [ web3.utils.toWei('0') ],
                [ this.receiver.contract.methods.mockFunction().encodeABI() ],
                '<proposal description>',
            ]
            
            const descriptionHash = web3.utils.keccak256(proposal.slice(-1).find(Boolean));
            console.log('desription hash', descriptionHash)
            const id = await this.mock.hashProposal(...proposal.slice(0, -1), descriptionHash);

            // this will fail if owner has no self delegated
            await shouldFailWithMessage(
                this.mock.methods['propose(address[],uint256[],bytes[],string)'](
                ...proposal,
                { from: owner }),
                'Governor: proposer votes below proposal threshold'
            );
            
            await this.token.delegate(owner, {from: owner});

            await this.mock.methods['propose(address[],uint256[],bytes[],string)'](
                ...proposal,
                { from: owner },
            );

            // 0 for against, 1 for in-favor, and 2 for abstain
            await shouldFailWithMessage(
                this.mock.castVote(id, 1, { from: recipient }),
                'Governor: vote not currently active'
            );

            // 0 = pending
            expectBignumberEqual(await this.mock.state(id), 0);
            let snapshot = await this.mock.proposalSnapshot(id);
            // move to active state
            await time.advanceBlockTo(parseInt(snapshot.toString()) + 1);
            // 1 = active
            expectBignumberEqual(await this.mock.state(id), 1);

            await this.mock.castVote(id, 1, { from: recipient });

            expectBignumberEqual(await this.mock.getVotes(recipient, snapshot, { from: recipient }), vestingAmount);

            expect(await this.mock.hasVoted(id, recipient)).to.be.equal(true);

            expectBignumberEqual((await this.mock.proposalVotes(id)).againstVotes, 0);
            expectBignumberEqual((await this.mock.proposalVotes(id)).forVotes, vestingAmount);
            expectBignumberEqual((await this.mock.proposalVotes(id)).abstainVotes, 0);
        });

        it('should not increment proposal votes if amount vested is not greater than zero', async function () {
            await this.vesting.delegate(recipient, {from: recipient});
            await this.token.mint(owner, vestingAmount);
            
            expectBignumberEqual(
                await this.mock.proposalThreshold(),
                await this.token.balanceOf(owner)
            );

            const proposal = [
                [ this.receiver.address ],
                [ web3.utils.toWei('0') ],
                [ this.receiver.contract.methods.mockFunction().encodeABI() ],
                '<proposal description>',
            ]
            
            const descriptionHash = web3.utils.keccak256(proposal.slice(-1).find(Boolean));
            const id = await this.mock.hashProposal(...proposal.slice(0, -1), descriptionHash);

            // this will fail if owner has no self delegated
            await shouldFailWithMessage(
                this.mock.methods['propose(address[],uint256[],bytes[],string)'](
                ...proposal,
                { from: owner }),
                'Governor: proposer votes below proposal threshold'
            );
            
            await this.token.delegate(owner, {from: owner});

            await this.mock.methods['propose(address[],uint256[],bytes[],string)'](
                ...proposal,
                { from: owner },
            );

            // 0 for against, 1 for in-favor, and 2 for abstain
            await shouldFailWithMessage(
                this.mock.castVote(id, 1, { from: recipient }),
                'Governor: vote not currently active'
            );

            // 0 = pending
            expectBignumberEqual(await this.mock.state(id), 0);
            let snapshot = await this.mock.proposalSnapshot(id);
            // move to active state
            await time.advanceBlockTo(parseInt(snapshot.toString()) + 1);
            // 1 = active
            expectBignumberEqual(await this.mock.state(id), 1);

            await this.mock.castVote(id, 1, { from: recipient });

            expectBignumberEqual(await this.mock.getVotes(recipient, snapshot, { from: recipient }), 0);

            expect(await this.mock.hasVoted(id, recipient)).to.be.equal(true);

            expectBignumberEqual((await this.mock.proposalVotes(id)).againstVotes, 0);
            expectBignumberEqual((await this.mock.proposalVotes(id)).forVotes, 0);
            expectBignumberEqual((await this.mock.proposalVotes(id)).abstainVotes, 0); 
        });
    });


    describe('create proposal', function () {
        it('allow vesting delegatee create a proposal if the amount of tokens vested meets proposal threshold', async function () {
            await this.token.mint(this.vesting.address, vestingAmount);
            await this.vesting.delegate(recipient, {from: recipient});

            expectBignumberEqual(
                await this.mock.proposalThreshold(),
                vestingAmount
            );

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
        
            expect(await this.mock.proposalThreshold()).to.be.bignumber.greaterThan(await this.token.balanceOf(this.vesting.address));

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
                'Governor: proposer votes below proposal threshold'
            );
        });
    });

});