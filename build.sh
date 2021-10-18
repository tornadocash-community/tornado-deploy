#!/bin/bash -e

# expecting node v12
cd deployer
yarn install
yarn compile
cd ..

cd tornado-pool
yarn install
yarn circuit_prod
npx hardhat compile
cd ..
