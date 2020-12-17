#!/bin/bash -e

# expecting node v12
cd deployer
yarn
yarn compile
cd ..

cd torn-token
yarn unlink || true
yarn link
yarn
yarn compile
cd ..

cd tornado-governance
yarn link torn-token
yarn
yarn compile
cd ..

cd tornado-anonymity-mining
yarn link torn-token
yarn
if [[ ! -f "build/circuits/TreeUpdateVerifier.sol" ]]; then
  yarn circuit
fi
yarn compile
cd ..
