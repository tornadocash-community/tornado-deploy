## Dependencies

1. node 12
2. yarn

## Usage

```
git clone --recursive https://github.com/tornadocash/tornado-deploy -b arbitrum
cd tornado-deploy
cp .env.example .env
yarn
```

Edit `instances.js` config to choose what Tornado pool you would like to deploy

When you are ready, run

```
yarn build
```

The result of the build is `actions.json` file, that contains everything that is needed to deploy contracts on Ethereum along with expected deploy addresses.

## Reproducible build

In order to generate exactly the same actions.json the code has to be compiled in `/private/tmp/tornado-deploy` dir because solidity compiler includes a hash of full path to files into contact bytecode as swarm hash. If you compile in other dir this swarm hash will be different. It doesn't affect contract execution but your `actions.json` will have a different hash from the initiation version.

## Verify addresses

```
cat actions.json | jq '.actions[] | {domain,expectedAddress,contract} '
```
