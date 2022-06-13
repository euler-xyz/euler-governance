const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
const { expect } = require('chai');
const { ethers, web3 } = require('hardhat');
const { Euler } = require("@eulerxyz/euler-sdk");

require("dotenv").config();
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL_ROPSTEN);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const e = new Euler(signer, 3); // chainId = 3 for ropsten, default is 1 for mainnet

const Stub = artifacts.require('StubEulerGovernance');
// ropsten defender mock proposal data
// Proposal Description:
const proposalDescription = 'eIP 4: Update USDC collateral factor to 0.8';
// batch items hex data:
const proposalHexData = '0xeb937aeb000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000078ee171d6c8d3808b72dab8ce647719db3bb4cc9000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c4b533461c00000000000000000000000095689faeed6691757df1ad48b7bea1b8acf2dabe000000000000000000000000638ecfe7857f83160615d50a905bfcb40662efc1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000bebc200000000000000000000000000000000000000000000000000000000000d693a4000000000000000000000000000000000000000000000000000000000000000708000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
// batch items tx hex data is encoded batch items array and address array, 
// e.g., const encodedBatchTxData = exec.interface.encodeFunctionData('batchDispatch', [batch, []]);

contract('MockEulerGovernance', function (accounts) {
    const [ owner, governor, user1, user2] = accounts;

    beforeEach(async function () {
        this.stub = await Stub.new(governor);
    });

    it('deployment check', async function () {
        expect(this.stub.address).to.not.be.equal(ZERO_ADDRESS);
        expect(await this.stub.governor()).to.be.equal(governor);
    });

    it('executeProposal reverts if not governor', async function () {
        await expectRevert(
            this.stub.executeProposal(
                proposalDescription, proposalHexData, {from: user1}
            ), 
            'GovernanceStub: only governor can call'
        );
    });

    it('executeProposal emits correct event and event parameters', async function () {
        const executeTx = await this.stub.executeProposal(
            proposalDescription, proposalHexData, {from: governor}
        );
        const executeEvent = executeTx.logs[0];
        expect(executeEvent.event).to.be.equal('ProposalExecuted');
        expect(executeEvent.args[0].toString()).to.be.equal("1");
        expect(executeEvent.args[1]).to.be.equal(proposalDescription);
        expect(executeEvent.args[2]).to.be.equal(proposalHexData);


        const executeTx2 = await this.stub.executeProposal(
            proposalDescription, proposalHexData, {from: governor}
        );
        const executeEvent2 = executeTx2.logs[0];
        expect(executeEvent2.event).to.be.equal('ProposalExecuted');
        expect(executeEvent2.args[0].toString()).to.be.equal("2");
        expect(executeEvent2.args[1]).to.be.equal(proposalDescription);
        expect(executeEvent2.args[2]).to.be.equal(proposalHexData);
    });

    it('can correctly debug bytes from proposal executed event', async function () {
        const executeTx = await this.stub.executeProposal(
            proposalDescription, proposalHexData, {from: governor}
        );
        const txReceipt = executeTx;
        // get batch items hex from tx receipt
        // console.log("transaction receipt logs", txReceipt.receipt.logs);
        expect(txReceipt.receipt.logs[0].args.proposalData).to.be.equal(proposalHexData);
        // decode batch items hex using Euler SDK
        // await getContract('0x78eE171d6c8d3808B72dAb8CE647719dB3bb4cC9'); // testing getContract with ropsten governance address
        console.log(`Debugging batchItems hex on Ropsten: ${txReceipt.receipt.logs[0].args.proposalData}`);

        const formatArg = (arg, decimals) => ethers.BigNumber.isBigNumber(arg)
            ? (arg.eq(et.MaxUint256) ? 'max_uint' : arg.toString() + (decimals ? ` (${ethers.utils.formatUnits(arg, decimals)} in token decimals)` : ''))
            : arg;

        const decodeBatchTxData = async () => {
            const { fn, args, contractName, contract, symbol, decimals } = await decodeBatchItem(e.contracts.exec.address, proposalHexData.toString())

            console.log(`${contractName}.${fn.name} @ ${contract.address}`);
            if (symbol && decimals) {
                console.log(`token symbol: ${symbol}, token decimal: ${decimals}`);
            }

            let batchItems;
            if (fn.name === 'batchDispatch') {
                batchItems = await Promise.all(args[0]['data'].map(async ([allowError, proxy, data]) => ({
                    allowError,
                    proxy,
                    ...await decodeBatchItem(proxy, data)
                })));

                console.log(`\n  deferred liquidity for the following addresses:`, args[1]['data']);

                batchItems.map((item, i) => {
                    console.log(`\n  ${i + 1}. ${item.symbol || item.contractName}.${item.fn.name} (allowError: ${String(item.allowError)}) @ ${item.proxy}`);
                    item.args.map(({ arg, data }) => console.log(`     ${arg.name}: ${formatArg(data, item.decimals)}`));
                })
            }
            // console.log(batchItems[0])

            let batchArray = [];
            // NOTE: remember we need to remove the object keys to match contract abi
            for (let item of batchItems) {
                let temp = [];
                temp.push(item.allowError);
                temp.push(item.proxy);
                let data = [];
                for (i of item.args) {
                    data.push(i.data);
                }
                temp.push(item.contract.interface.encodeFunctionData(item.fn.name, data));
                batchArray.push(temp);
            }
            console.log('batch array for defender', batchArray);
            console.log('addresses to defer liquidity checks for', []);
        }
        await decodeBatchTxData();
    });

});

const decodeBatchItem = async (proxy, data) => {
    const { contract, contractName } = await getContract(proxy);
    
    if (!contract) throw `Unrecognized contract at ${proxy}`
    // console.log(contract.interface)
    const fn = contract.interface.getFunction(data.slice(0, 10));
    const d = contract.interface.decodeFunctionData(data.slice(0, 10), data);
    const args = fn.inputs.map((arg, i) => ({ arg, data: d[i] }));

    const symbol = contract.symbol ? await contract.symbol() : '';
    const decimals = contract.decimals ? await contract.decimals() : '';

    return { fn, args, contractName, contract, symbol, decimals };
}


const getContract = async (proxy) => {
    const cache = {};
    if (!cache[proxy]) {
        let [contractName, contract] = Object.entries(e.contracts)
                                        .find(([, c]) => c.address === proxy) || [];
        if (!contract) {
            let moduleId
            try {
                moduleId = await e.contracts.exec.attach(proxy).moduleId();
            } catch {
                return {};
            }
            contractName = {500_000: 'EToken', 500_001: 'DToken', 4: 'Governance'}[moduleId];
            if (!contractName) throw `Unrecognized moduleId! ${moduleId}`;

            // contract = await ethers.getContractAt(contractName, proxy);

            contractName = contractName[0].toUpperCase() + contractName.slice(1);
            contractABI = require(`../../euler-contracts/artifacts/contracts/modules/${contractName}.sol/${contractName}.json`);
            contract = new ethers.Contract(proxy, contractABI.abi, signer)
        }
        cache[proxy] = {contract, contractName};
    }
    return cache[proxy];
}
