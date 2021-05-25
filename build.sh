#!/bin/bash -e

# expecting node v12
cd tornado-core
mkdir -p build
yarn install
yarn build:contract
cd ..

cd deployer
yarn install
yarn compile
cd ..

cd tornado-anonymity-mining
mkdir -p build/circuits
pushd build/circuits
wget https://github.com/tornadocash/tornado-anonymity-mining/releases/download/v1.0.0/RewardVerifier.sol
wget https://github.com/tornadocash/tornado-anonymity-mining/releases/download/v1.0.0/WithdrawVerifier.sol
wget https://github.com/tornadocash/tornado-anonymity-mining/releases/download/v1.0.0/TreeUpdateVerifier.sol
popd
yarn install
yarn compile
cd ..
