require('dotenv').config()
const fs = require('fs')
const ethers = require('ethers')
const { parseEther } = ethers.utils
const { deploy, getContractData, expectedAddress } = require('./utils')

const {
  SALT,
  MERKLE_TREE_HEIGHT,
  L1_OMNIBRIDGE,
  L2_OMNIBRIDGE,
  GOVERNANCE,
  L2_TOKEN,
  L1_TOKEN,
  L2_AMB,
  L1_CHAIN_ID,
  MAXIMUM_DEPOSIT_AMOUNT,
  MINIMUM_WITHDRAWAL_AMOUNT,
  L2_MULTISIG,
} = process.env

const deployer = getContractData('../deployer/build/contracts/Deployer.json')
const verifier2 = getContractData('../tornado-pool/artifacts/contracts/Verifier2.sol/Verifier2.json')
const verifier16 = getContractData('../tornado-pool/artifacts/contracts/Verifier16.sol/Verifier16.json')
const hasher = getContractData('../tornado-pool/artifacts/contracts/Hasher.json')
const tornadoPool = getContractData('../tornado-pool/artifacts/contracts/TornadoPool.sol/TornadoPool.json')
const upgradeableProxy = getContractData(
  '../tornado-pool/artifacts/contracts/CrossChainUpgradeableProxy.sol/CrossChainUpgradeableProxy.json',
)

const l1Helper = getContractData('../tornado-pool/artifacts/contracts/bridge/L1Helper.sol/L1Helper.json')

const actions = []

// eip-2470
const eipDeployer = {
  tx: {
    nonce: 0,
    gasPrice: 100000000000,
    value: 0,
    data:
      '0x608060405234801561001057600080fd5b50610134806100206000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80634af63f0214602d575b600080fd5b60cf60048036036040811015604157600080fd5b810190602081018135640100000000811115605b57600080fd5b820183602082011115606c57600080fd5b80359060200191846001830284011164010000000083111715608d57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550509135925060eb915050565b604080516001600160a01b039092168252519081900360200190f35b6000818351602085016000f5939250505056fea26469706673582212206b44f8a82cb6b156bfcc3dc6aadd6df4eefd204bc928a4397fd15dacf6d5320564736f6c63430006020033',
    gasLimit: 7247000,
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
// L1
actions.push(
  deploy({
    domain: 'deployerL1.contract.tornadocash.eth',
    contract: deployer,
    args: ['0x0000000000000000000000000000000000000000'],
    dependsOn: [],
    title: 'Deployment proxy',
    description:
      'This a required contract to initialize all other contracts. It is simple wrapper around EIP-2470 Singleton Factory that emits an event of contract deployment. The wrapper also validates if the deployment was successful.',
    isL1Contract: true,
  }),
)

actions.push(
  deploy({
    domain: 'l1Helper.contract.tornadocash.eth',
    contract: l1Helper,
    title: 'L1 Omnibridge Helper',
    description: 'Utility contract for the xDAI Omnibridge on L1',
    dependsOn: ['deployerL1.contract.tornadocash.eth'],
    args: [L1_OMNIBRIDGE, L1_TOKEN, GOVERNANCE],
    isL1Contract: true,
  }),
)

// L2
// Deploy Hasher
actions.push(
  deploy({
    domain: 'deployerL2.contract.tornadocash.eth',
    contract: deployer,
    args: ['0x0000000000000000000000000000000000000000'],
    dependsOn: [],
    title: 'Deployment proxy',
    description:
      'This a required contract to initialize all other contracts. It is simple wrapper around EIP-2470 Singleton Factory that emits an event of contract deployment. The wrapper also validates if the deployment was successful.',
  }),
)

actions.push(
  deploy({
    domain: 'hasher.contract.tornadocash.eth',
    contract: hasher,
    title: 'Hasher',
    description: 'Poseidon hasher contract',
    dependsOn: ['deployerL2.contract.tornadocash.eth'],
  }),
)

// Deploy verifier
actions.push(
  deploy({
    domain: 'verifier2.contract.tornadocash.eth',
    contract: verifier2,
    title: 'Verifier2',
    description: 'zkSNARK verifier contract for 2 input operations',
    dependsOn: ['deployerL2.contract.tornadocash.eth'],
  }),
)

actions.push(
  deploy({
    domain: 'verifier16.contract.tornadocash.eth',
    contract: verifier16,
    title: 'Verifier16',
    description: 'zkSNARK verifier contract for 16 input operations',
    dependsOn: ['deployerL2.contract.tornadocash.eth'],
  }),
)

// Tornado implementation
actions.push(
  deploy({
    domain: 'tornadoPool.contract.tornadocash.eth',
    contract: tornadoPool,
    title: 'Tornado Pool implementation',
    description: 'Tornado Pool proxy implementation',
    dependsOn: [
      'deployerL2.contract.tornadocash.eth',
      'hasher.contract.tornadocash.eth',
      'verifier2.contract.tornadocash.eth',
      'verifier16.contract.tornadocash.eth',
    ],
    args: [
      expectedAddress(actions, 'verifier2.contract.tornadocash.eth'),
      expectedAddress(actions, 'verifier16.contract.tornadocash.eth'),
      MERKLE_TREE_HEIGHT,
      expectedAddress(actions, 'hasher.contract.tornadocash.eth'),
      L2_TOKEN,
      L2_OMNIBRIDGE,
      expectedAddress(actions, 'l1Helper.contract.tornadocash.eth'),
      GOVERNANCE,
      L1_CHAIN_ID,
      L2_MULTISIG,
    ],
  }),
)

// Deploy Proxy
const tornadoInterface = new ethers.utils.Interface(tornadoPool.abi)
const initData = tornadoInterface.encodeFunctionData('initialize', [
  parseEther(MINIMUM_WITHDRAWAL_AMOUNT),
  parseEther(MAXIMUM_DEPOSIT_AMOUNT),
])

actions.push(
  deploy({
    domain: 'proxy.contract.tornadocash.eth',
    contract: upgradeableProxy,
    title: 'Cross-chain Upgradeable Proxy',
    description: 'Upgradability proxy contract for Tornado Pool owned by TornadoCash governance',
    dependsOn: ['deployerL2.contract.tornadocash.eth', 'tornadoPool.contract.tornadocash.eth'],
    args: [
      expectedAddress(actions, 'tornadoPool.contract.tornadocash.eth'),
      GOVERNANCE,
      initData,
      L2_AMB,
      L1_CHAIN_ID,
    ],
  }),
)

// Write output
const result = {
  eipDeployer,
  deployer: eipDeployer.expectedAddress,
  salt: SALT,
  actions: actions,
}
fs.writeFileSync('actions.json', JSON.stringify(result, null, 2))
console.log('Created actions.json')
