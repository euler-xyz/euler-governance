# Table of contents

* [Repository Overview](../README.md)
* [Introduction](#introduction)
    * [Snapshot](#)
    * [WithTally](#)
* [Eul](#eul)
* [Delegate](#)
* [Delegate by Signature](#)
* [Get Current Votes](#)
* [Get Prior Votes](#)
* [Key Events](#)
* [Quorum Votes](#)
* [Proposal Threshold](#)
* [Proposal Max Operations](#)
* [Voting Delay](#)
* [Voting Period](#)
* [Propose](#propose)
* [Queue](#)
* [Execute](#)
* [Cancel](#)
* [Get Actions](#)
* [Get Receipt](#)
* [State](#)
* [Cast Vote](#cast-vote)
* [Cast Vote By Signature](#)
* [Timelock](#)
* [Guardian](#)


## Introduction

The [Euler protocol](https://www.euler.xyz/) is governed and upgraded by EUL token-holders, using three distinct components; the EUL token, governance module, and Timelock. Together, these contracts allow the community to propose, vote, and implement changes. Proposals can modify system parameters, support new markets, or add entirely new functionality to the protocol.

Euler will be managed by holders of a protocol native governance token called Euler Token (EUL). EUL tokens represent voting shares. A holder can vote on a governance proposal themselves or delegate their votes to a third party.

EUL token-holders can delegate their voting rights to themselves, or an address of their choice. Addresses delegated at least 100,000 COMP can create governance proposals; any address can lock 100 EUL to create an Autonomous Proposal, which becomes a governance proposal after being delegated 100,000 COMP.

When a governance proposal is created, it enters a 2 day review period, after which voting weights are recorded and voting begins. Voting lasts for 3 days; if a majority, and at least 400,000 votes are cast for the proposal, it is queued in the Timelock, and can be implemented 2 days later. In total, any change to the protocol takes at least one week.


## EUL 

EUL (Euler Token) is an ERC-20 token that allows the owner to delegate voting rights to any address, including their own address. Changes to the owner’s token balance automatically adjust the voting rights of the delegate.


## Propose

The first step is to canvas support from the wider community for making an upgrade. This will usually involve submission of a description of the general idea to the Euler Forum, here. 

Once the idea has been debated and refined with input from others, it can be put forward for an off-chain vote via Snapshot, here. Off-chain voting is non-binding, but helps the community verify that there is real support for a proposal before it goes to the final stage.

The final stage of a proposal requires a governance action to be created and submitted as a formal on-chain proposal. An on-chain proposal requires a user to have 0.5% of the total EUL supply owned or delegated to them.
A governance action is a package of executable code that can be used to alter the state of the protocol in some way or transfer funds from the Euler Treasury. For example, it could be code that alters an interest rate parameter (see Euler Parameters), or promotes an asset from Isolation Tier to Collateral Tier (see Asset Tiers), or a much more involved proposal that adds an entirely new module to the Euler smart contracts (see Euler Smart Contracts).


## Cast Vote

Once an on-chain proposal has been successfully made, 3% of the EUL supply is required to vote ‘yes’ on the proposal in order for it to reach quorum. There is a 7 day period in which people can vote. If a vote passes, there is a 2 day time lock delay on execution during which Euler users can prepare for the change. 
