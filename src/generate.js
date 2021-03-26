require('dotenv').config()
const fs = require('fs')
const ethers = require('ethers')
const { formatUnits, commify } = ethers.utils
const { deploy, getContractData, expectedAddress } = require('./utils')

const { DEPLOYER, SALT, HASHER, VERIFIER, COMP_ADDRESS } = process.env

const instances = require('../instances')
const deployer = getContractData('../deployer/build/contracts/Deployer.json')
const verifier = getContractData('../tornado-core/build/contracts/Verifier.json')
const hasher = getContractData('../tornado-core/build/contracts/Hasher.json')
const ethTornado = getContractData('../tornado-core/build/contracts/ETHTornado.json')
const ercTornado = getContractData('../tornado-core/build/contracts/ERC20Tornado.json')
const compTornado = getContractData('../tornado-core/build/contracts/cTornado.json')

const actions = []

// eip-2470
const eipDeployer = {
  tx: {
    nonce: 0,
    gasPrice: 100000000000,
    value: 0,
    data:
      '0x608060405234801561001057600080fd5b50610134806100206000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80634af63f0214602d575b600080fd5b60cf60048036036040811015604157600080fd5b810190602081018135640100000000811115605b57600080fd5b820183602082011115606c57600080fd5b80359060200191846001830284011164010000000083111715608d57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550509135925060eb915050565b604080516001600160a01b039092168252519081900360200190f35b6000818351602085016000f5939250505056fea26469706673582212206b44f8a82cb6b156bfcc3dc6aadd6df4eefd204bc928a4397fd15dacf6d5320564736f6c63430006020033',
    gasLimit: 247000,
  },
  signature: {
    v: 27,
    r: '0x247000',
    s: '0x2470',
  },
  from: '0xBb6e024b9cFFACB947A71991E386681B1Cd1477D', // needs to have 0.0247 ETH
  expectedAddress: '0xce0042B868300000d44A59004Da54A005ffdcf9f',
}

// Actions needed for new blockchains
// Assumes that EIP-2470 deployer is already present on the chain
actions.push(
  deploy({
    domain: 'deployer.contract.tornadocash.eth',
    contract: deployer,
    args: ['0x0000000000000000000000000000000000000000'],
    dependsOn: [],
    title: 'Deployment proxy',
    description:
      'This a required contract to initialize all other contracts. It is simple wrapper around EIP-2470 Singleton Factory that emits an event of contract deployment. The wrapper also validates if the deployment was successful.',
  }),
)

// Deploy Hasher
actions.push(
  deploy({
    domain: 'hasher.contract.tornadocash.eth',
    contract: hasher,
    title: 'Hasher',
    description: 'MiMC hasher contract',
    dependsOn: [],
  }),
)

// Deploy verifier
actions.push(
  deploy({
    domain: 'verifier.contract.tornadocash.eth',
    contract: verifier,
    title: 'Verifier',
    description: 'zkSNARK verifier contract for withdrawals',
  }),
)

// Deploy instances
for (const instance of instances) {
  const args = [
    expectedAddress(actions, 'verifier.contract.tornadocash.eth'),
    expectedAddress(actions, 'hasher.contract.tornadocash.eth'),
    instance.denomination,
    20,
  ]
  if (!instance.isETH) {
    args.push(instance.tokenAddress)
  }
  if (instance.isCToken) {
    args.unshift(COMP_ADDRESS)
  }
  actions.push(
    deploy({
      domain: instance.domain,
      contract: instance.isETH ? ethTornado : instance.isCToken ? compTornado : ercTornado,
      args,
      title: `Tornado.cash instance for ${commify(
        formatUnits(instance.denomination, instance.decimals),
      ).replace(/\.0$/, '')} of ${instance.symbol}`,
      description: `Tornado cash instance for ${commify(
        formatUnits(instance.denomination, instance.decimals),
      ).replace(/\.0$/, '')} of ${instance.symbol}${
        instance.isETH ? '' : ` at address ${instance.tokenAddress}`
      }`,
    }),
  )
}

// Write output
const result = {
  eipDeployer,
  deployer: DEPLOYER,
  salt: SALT,
  actions: actions,
}
fs.writeFileSync('actions.json', JSON.stringify(result, null, 2))
console.log('Created actions.json')
