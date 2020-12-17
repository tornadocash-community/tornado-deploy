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
