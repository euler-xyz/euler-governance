#!/bin/bash

npm run deploy-staging

timelockAddress=$(cat euler-addresses.json | grep -i timelock | awk -F ':' '{print $2}' | sed 's/,//g' | sed 's/"//g')

cd euler-contracts

npm run deploy-staging

awk '!/NEWGOVADDR/' .env > temp.txt && mv temp.txt .env
echo "NEWGOVADDR=$timelockAddress" >> .env

npx hardhat run --network localhost scripts/set-gov-admin.js

cd ..

# npx hardhat test test/Governance/eulerGovernorAdmin.js --network localhost

npx hardhat test --network localhost