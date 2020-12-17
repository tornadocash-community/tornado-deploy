## Dependencies

1. node 12
2. yarn
3. zkutil (`brew install rust && cargo install zkutil`) (needed only for circuit compilation and setup)

## Usage

```
git clone --recursive https://github.com/tornadocash/tornado-deploy
cd tornado-deploy
cp .env.example .env
yarn

# optionally copy production snark circuits
mkdir -p tornado-anonymity-mining/build && cp -R ~/Downloads/circuits ./tornado-anonymity-mining/build

yarn build
```

Note: build script will globally `yarn link` `torn-token` package

Note: build script will not recompile snark circuit if compilation result already exists

The result of the build is `actions.json` file, that contains everything that is needed to deploy contracts on Ethereum along with expected deploy addresses.

## Reproducible build

In order to generate exactly the same actions.json the code has to be compiled in `/private/tmp/tornado-deploy` dir because solidity compiler includes a hash of full path to files into contact bytecode as swarm hash. If you compile in other dir this swarm hash will be different. It doesn't affect contract execution but your `actions.json` will have a different hash from the initiation version.

## Verify addresses

```
cat actions.json | jq '.actions[] | {domain,expectedAddress,contract} '
```
