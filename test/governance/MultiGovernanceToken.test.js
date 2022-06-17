const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const ethSigUtil = require('eth-sig-util');
const Wallet = require('ethereumjs-wallet').default;
const { fromRpcSig } = require('ethereumjs-util');
const Enums = require('../helpers/enums');
const { EIP712Domain } = require('../helpers/eip712');
const { GovernorHelper } = require('../helpers/governance');

const {
    shouldSupportInterfaces,
} = require('../utils/introspection/SupportsInterface.behavior');
const { web3 } = require('hardhat');

const Token = artifacts.require('ERC20VotesMock');
const Timelock = artifacts.require('contracts/governance/TimelockController.sol:TimelockController');
const Governor = artifacts.require('Governance');
const CallReceiver = artifacts.require('CallReceiverMock');

contract('Governance', function (accounts) {
    const [owner, proposer, voter1, voter2, voter3, voter4] = accounts;
    const empty = web3.utils.toChecksumAddress(web3.utils.randomHex(20));

    const name = 'Euler-Governance';
    const version = '1';
    const tokenName = 'MockToken';
    const tokenSymbol = 'MTKN';
    const tokenSupply = web3.utils.toWei('100');
    const votingDelay = new BN(4);
    const votingPeriod = new BN(16);
    const quorumNumerator = new BN(4);
    const value = web3.utils.toWei('0');
    const proposalThreshold = web3.utils.toWei('10');

    const stTokenName = 'MockStToken';
    const stTokenSymbol = 'MSTN';

    beforeEach(async function () {
        this.chainId = await web3.eth.getChainId();
        // mock EUL and stEUL
        this.token = await Token.new(tokenName, tokenSymbol);
        this.stToken = await Token.new(stTokenName, stTokenSymbol);

        this.timelock = await Timelock.new(3600, [], []);

        this.mock = await Governor.new(
            name,
            this.token.address,
            [this.stToken.address],
            votingDelay,
            votingPeriod,
            this.timelock.address,
            quorumNumerator,
            proposalThreshold
        );
        this.receiver = await CallReceiver.new();

        this.helper = new GovernorHelper(this.mock);

        await this.token.mint(owner, tokenSupply);
        await this.helper.delegate({ token: this.token, to: voter1, value: web3.utils.toWei('10') }, { from: owner });
        await this.helper.delegate({ token: this.token, to: voter2, value: web3.utils.toWei('5') }, { from: owner });
        await this.helper.delegate({ token: this.token, to: voter3, value: web3.utils.toWei('4') }, { from: owner });
        await this.helper.delegate({ token: this.token, to: voter4, value: web3.utils.toWei('3') }, { from: owner });


        await this.timelock.grantRole(await this.timelock.PROPOSER_ROLE(), this.mock.address);
        await this.timelock.grantRole(await this.timelock.EXECUTOR_ROLE(), this.mock.address);

    });

    shouldSupportInterfaces([
        'ERC165',
        'ERC1155Receiver',
        'Governor',
        'GovernorWithParams',
    ]);

    it('deployment check', async function () {
        expect(await this.mock.name()).to.be.equal(name);
        expect(await this.mock.eul()).to.be.equal(this.token.address);
        expect(await this.mock.votingDelay()).to.be.bignumber.equal(votingDelay);
        expect(await this.mock.votingPeriod()).to.be.bignumber.equal(votingPeriod);
        expect(await this.mock.quorum(0)).to.be.bignumber.equal('0');
        expect(await this.mock.COUNTING_MODE()).to.be.equal('support=bravo&quorum=for,abstain');

        expect(await this.mock.quorumNumerator()).to.be.bignumber.equal('4');
        expect(await this.mock.proposalThreshold()).to.be.bignumber.equal(proposalThreshold);
        expect(await this.mock.timelock()).to.be.equal(this.timelock.address);
        expect(await this.mock.getSupportedTokens()).to.deep.equal([this.stToken.address]);

    });

    it('voting power check for main and sub tokens', async function () {
        // check voting power for main token
        expect(await this.token.getVotes(voter1)).to.be.bignumber.equal(web3.utils.toWei('10'));
        expect(await this.token.getVotes(voter2)).to.be.bignumber.equal(web3.utils.toWei('5'));
        expect(await this.token.getVotes(voter3)).to.be.bignumber.equal(web3.utils.toWei('4'));
        expect(await this.token.getVotes(voter4)).to.be.bignumber.equal(web3.utils.toWei('3'));

        // check voting power for sub token
        expect(await this.stToken.getVotes(voter1)).to.be.bignumber.equal(web3.utils.toWei('0'));
        expect(await this.stToken.getVotes(voter2)).to.be.bignumber.equal(web3.utils.toWei('0'));
        expect(await this.stToken.getVotes(voter3)).to.be.bignumber.equal(web3.utils.toWei('0'));
        expect(await this.stToken.getVotes(voter4)).to.be.bignumber.equal(web3.utils.toWei('0'));

    });

    it('tokens array can be replaced through governance', async function () {
        const newToken = await Token.new("temp", "temp");
        const newTokenSubset = [newToken.address];

        this.proposal = this.helper.setProposal([
            {
                target: this.mock.address,
                data: this.mock.contract.methods.setSupportedTokens(newTokenSubset).encodeABI(),
                value,
            },
        ], '<replace subset tokens array>');

        // Before
        expect(await this.mock.hasVoted(this.proposal.id, owner)).to.be.equal(false);
        expect(await this.mock.hasVoted(this.proposal.id, voter1)).to.be.equal(false);
        expect(await this.mock.hasVoted(this.proposal.id, voter2)).to.be.equal(false);
        expect(await web3.eth.getBalance(this.mock.address)).to.be.bignumber.equal(value);

        // Run proposal
        const txPropose = await this.helper.propose({ from: voter1 });

        expectEvent(
            txPropose,
            'ProposalCreated',
            {
                proposalId: this.proposal.id,
                proposer: voter1,
                targets: this.proposal.targets,
                // values: this.proposal.values,
                signatures: this.proposal.signatures,
                calldatas: this.proposal.data,
                startBlock: new BN(txPropose.receipt.blockNumber).add(votingDelay),
                endBlock: new BN(txPropose.receipt.blockNumber).add(votingDelay).add(votingPeriod),
                description: this.proposal.description,
            },
        );

        await this.helper.waitForSnapshot();

        expectEvent(
            await this.helper.vote({ support: Enums.VoteType.For, reason: 'This is nice' }, { from: voter1 }),
            'VoteCast',
            {
                voter: voter1,
                support: Enums.VoteType.For,
                reason: 'This is nice',
                weight: web3.utils.toWei('10'),
            },
        );

        expectEvent(
            await this.helper.vote({ support: Enums.VoteType.For }, { from: voter2 }),
            'VoteCast',
            {
                voter: voter2,
                support: Enums.VoteType.For,
                weight: web3.utils.toWei('5'),
            },
        );

        expectEvent(
            await this.helper.vote({ support: Enums.VoteType.Against }, { from: voter3 }),
            'VoteCast',
            {
                voter: voter3,
                support: Enums.VoteType.Against,
                weight: web3.utils.toWei('4'),
            },
        );

        expectEvent(
            await this.helper.vote({ support: Enums.VoteType.Abstain }, { from: voter4 }),
            'VoteCast',
            {
                voter: voter4,
                support: Enums.VoteType.Abstain,
                weight: web3.utils.toWei('3'),
            },
        );

        await this.helper.waitForDeadline();

        await this.helper.queue();

        await this.helper.waitForEta();

        const txExecute = await this.helper.execute();

        expectEvent(
            txExecute,
            'ProposalExecuted',
            { proposalId: this.proposal.id },
        );

        // After
        expect(await this.mock.hasVoted(this.proposal.id, owner)).to.be.equal(false);
        expect(await this.mock.hasVoted(this.proposal.id, voter1)).to.be.equal(true);
        expect(await this.mock.hasVoted(this.proposal.id, voter2)).to.be.equal(true);
        expect(await web3.eth.getBalance(this.mock.address)).to.be.bignumber.equal(value);

        expect(await this.mock.getSupportedTokens()).to.deep.equal(newTokenSubset);
    });

    it('subset token balance should update voting power', async function () {
        // check voting power for main token
        expect(await this.token.getVotes(voter1)).to.be.bignumber.equal(web3.utils.toWei('10'));
        expect(await this.token.getVotes(voter2)).to.be.bignumber.equal(web3.utils.toWei('5'));
        expect(await this.token.getVotes(voter3)).to.be.bignumber.equal(web3.utils.toWei('4'));
        expect(await this.token.getVotes(voter4)).to.be.bignumber.equal(web3.utils.toWei('3'));

        
        await this.stToken.mint(voter2, web3.utils.toWei('10'));
        await this.stToken.delegate(voter2, {from: voter2});

        // check voting power for sub token
        expect(await this.stToken.getVotes(voter1)).to.be.bignumber.equal(web3.utils.toWei('0'));
        expect(await this.stToken.getVotes(voter2)).to.be.bignumber.equal(web3.utils.toWei('10'));
        expect(await this.stToken.getVotes(voter3)).to.be.bignumber.equal(web3.utils.toWei('0'));
        expect(await this.stToken.getVotes(voter4)).to.be.bignumber.equal(web3.utils.toWei('0'));

        this.proposal = this.helper.setProposal([
            {
              target: this.receiver.address,
              data: this.receiver.contract.methods.mockFunction().encodeABI(),
              value: web3.utils.toWei('1'),
            },
          ], '<proposal description>');

        // Run proposal
        const txPropose = await this.helper.propose({ from: voter1});

        expectEvent(
            txPropose,
            'ProposalCreated',
            {
                proposalId: this.proposal.id,
                proposer: voter1,
                targets: this.proposal.targets,
                // values: this.proposal.values,
                signatures: this.proposal.signatures,
                calldatas: this.proposal.data,
                startBlock: new BN(txPropose.receipt.blockNumber).add(votingDelay),
                endBlock: new BN(txPropose.receipt.blockNumber).add(votingDelay).add(votingPeriod),
                description: this.proposal.description,
            },
        );

        await this.helper.waitForSnapshot();

        expectEvent(
            await this.helper.vote({ support: Enums.VoteType.For, reason: 'This is nice' }, { from: voter1 }),
            'VoteCast',
            {
                voter: voter1,
                support: Enums.VoteType.For,
                reason: 'This is nice',
                weight: web3.utils.toWei('10'),
            },
        );

        expectEvent(
            await this.helper.vote({ support: Enums.VoteType.For }, { from: voter2 }),
            'VoteCast',
            {
                voter: voter2,
                support: Enums.VoteType.For,
                // Voter 2 voting power should be updated with subset token
                weight: web3.utils.toWei('15'), 
            },
        );

        expectEvent(
            await this.helper.vote({ support: Enums.VoteType.Against }, { from: voter3 }),
            'VoteCast',
            {
                voter: voter3,
                support: Enums.VoteType.Against,
                weight: web3.utils.toWei('4'),
            },
        );

        expectEvent(
            await this.helper.vote({ support: Enums.VoteType.Abstain }, { from: voter4 }),
            'VoteCast',
            {
                voter: voter4,
                support: Enums.VoteType.Abstain,
                weight: web3.utils.toWei('3'),
            },
        );

        await this.helper.waitForDeadline();

        await this.helper.queue();

        await this.helper.waitForEta();

        const txExecute = await this.helper.execute({value: web3.utils.toWei('1')});

        expectEvent(
            txExecute,
            'ProposalExecuted',
            { proposalId: this.proposal.id },
        );

        await expectEvent.inTransaction(
            txExecute.tx,
            this.receiver,
            'MockFunctionCalled',
          );

    });

    it('increasing subset token balance should allow proposal creation if threshold is met', async function () {

    });

});