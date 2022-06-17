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
    const value = 0; // web3.utils.toWei('1');
    const proposalThreshold = web3.utils.toWei('100');

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

        // only timelock can send eth to governance contract in receive function
        // but timelock controller can receive eth
        // await web3.eth.sendTransaction({ from: owner, to: this.mock.address, value });

        await this.token.mint(owner, tokenSupply);
        await this.helper.delegate({ token: this.token, to: voter1, value: web3.utils.toWei('10') }, { from: owner });
        await this.helper.delegate({ token: this.token, to: voter2, value: web3.utils.toWei('7') }, { from: owner });
        await this.helper.delegate({ token: this.token, to: voter3, value: web3.utils.toWei('5') }, { from: owner });
        await this.helper.delegate({ token: this.token, to: voter4, value: web3.utils.toWei('2') }, { from: owner });

        this.proposal = this.helper.setProposal([
            {
                target: this.receiver.address,
                // use non payable version
                // data: this.receiver.contract.methods.mockFunction().encodeABI(),
                data: this.receiver.contract.methods.mockFunctionNonPayable().encodeABI(),
                value,
            },
        ], '<proposal description>');

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
});