## Dependencies

1. node 12
2. yarn
3. zkutil (`brew install rust && cargo install zkutil`)

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

## Verify addresses

```
cat actions.json | jq '.actions[] | {domain,expectedAddress,contract} '
```
