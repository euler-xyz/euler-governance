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


## EUL

EUL (Euler Token) is an ERC-20 token that allows the owner to delegate voting rights to any address, including their own address. Changes to the owner’s token balance automatically adjust the voting rights of the delegate.
