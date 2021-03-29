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
yarn install
# yarn circuit
yarn compile
cd ..
