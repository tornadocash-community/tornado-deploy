## Dependencies

1. node 12
2. yarn
3. zkutil (`brew install rust && cargo install zkutil`)

## Usage

```
git clone --recursive https://github.com/tornadocash/tornado-deploy
cd tornado-deploy
npm i
cp .env.example .env
npm run start
```

Note: build script will globally `yarn link` `torn-token` package
Note: build script will not recompile snark circuit if compilation result already exists

## How to use local npm packages:

```
# Remember that torn-token packages links to here
cd torn-token
yarn link

# Install torn-token package from local source (create symlink ./node_modules/torn-token -> <remembered torn-token path>)
cd ../tornado-governance
yarn link torn-token
```

## Verify addresses

```
cat actions.json | jq '.actions[] | {domain,expectedAddress,contract} '
```
