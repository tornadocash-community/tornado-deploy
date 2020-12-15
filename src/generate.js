require('dotenv').config()
const fs = require('fs')
const ethers = require('ethers')
const { namehash } = ethers.utils
const config = require('../torn-token/config')
const get = require('get-value')
const { deploy, getContractData, zeroMerkleRoot } = require('./utils')

const { DEPLOYER, SALT } = process.env

const deployer = getContractData('../deployer/build/contracts/Deployer.json')
const torn = getContractData('../torn-token/build/contracts/TORN.json')
const vesting = getContractData('../torn-token/build/contracts/Vesting.json')
const voucher = getContractData('../torn-token/build/contracts/Voucher.json')
const governance = getContractData('../tornado-governance/build/contracts/Governance.json')
const governanceProxy = getContractData('../tornado-governance/build/contracts/LoopbackProxy.json')
const miner = getContractData('../tornado-anonymity-mining/build/contracts/Miner.json')
const rewardSwap = getContractData('../tornado-anonymity-mining/build/contracts/RewardSwap.json')
const tornadoTrees = getContractData('../tornado-anonymity-mining/build/contracts/TornadoTrees.json')
const tornadoProxy = getContractData('../tornado-anonymity-mining/build/contracts/TornadoProxy.json')
const poseidonHasher2 = getContractData('../tornado-anonymity-mining/build/contracts/Hasher2.json')
const poseidonHasher3 = getContractData('../tornado-anonymity-mining/build/contracts/Hasher3.json')
const rewardVerifier = getContractData('../tornado-anonymity-mining/build/contracts/RewardVerifier.json')
const withdrawVerifier = getContractData('../tornado-anonymity-mining/build/contracts/WithdrawVerifier.json')
const treeUpdateVerifier = getContractData(
  '../tornado-anonymity-mining/build/contracts/TreeUpdateVerifier.json',
)
const airdrop = require('../airdrop.json')

const actions = []

actions.push(
  deploy({
    domain: config.deployer.address,
    contract: deployer,
    args: ['0x0000000000000000000000000000000000000000'],
    dependsOn: [],
    title: 'Deployment proxy',
    description:
      'This a required contract to initialize all other contracts. It is simple wrapper around EIP-2470 Singleton Factory that emits an event of contract deployment. The wrapper also validates if the deployment was successful.',
  }),
)

// Deploy TORN
const distribution = Object.values(config.torn.distribution).map(({ to, amount }) => ({
  to: namehash(get(config, to).address),
  amount,
}))
console.log(distribution)
actions.push(
  deploy({
    domain: config.torn.address,
    contract: torn,
    args: [namehash(config.governance.address), config.torn.pausePeriod, distribution],
    title: 'TORN token',
    description: 'Tornado.cash governance token',
  }),
)

// Deploy Governance implementation
actions.push(
  deploy({
    domain: config.governanceImpl.address,
    contract: governance,
    title: 'Governance implementation',
    description: 'Initial implementation of upgradable governance contract',
  }),
)

// Deploy Governance proxy
const governanceContract = new ethers.utils.Interface(governance.abi)
const initData = governanceContract.encodeFunctionData('initialize', [namehash(config.torn.address)])
actions.push(
  deploy({
    domain: config.governance.address,
    contract: governanceProxy,
    args: [namehash(config.governanceImpl.address), initData],
    dependsOn: [config.deployer.address, config.governanceImpl.address],
    title: 'Governance Upgradable Proxy',
    description:
      'EIP-1167 Upgradable Proxy for Governance. It can only be upgraded through a proposal by TORN holders',
  }),
)

// Deploy Verifiers
actions.push(
  deploy({
    domain: config.rewardVerifier.address,
    contract: rewardVerifier,
    title: 'Reward Verifier',
    description: 'ZkSnark verifier smart contract for mining rewards',
  }),
)
actions.push(
  deploy({
    domain: config.withdrawVerifier.address,
    contract: withdrawVerifier,
    title: 'Withdraw Verifier',
    description: 'ZkSnark verifier smart contract for reward withdrawals',
  }),
)
actions.push(
  deploy({
    domain: config.treeUpdateVerifier.address,
    contract: treeUpdateVerifier,
    title: 'Tree Update Verifier',
    description: 'ZkSnark verifier smart contract for validation for account merkle tree updates',
  }),
)

// Deploy RewardSwap
actions.push(
  deploy({
    domain: config.rewardSwap.address,
    contract: rewardSwap,
    args: [
      namehash(config.torn.address),
      namehash(config.miningV2.address),
      config.torn.distribution.miningV2.amount,
      config.miningV2.initialBalance,
      config.rewardSwap.poolWeight,
    ],
    title: 'Reward Swap',
    description: 'AMM that allows to swap Anonymity Points to TORN',
  }),
)

// Deploy PoseidonHasher2
actions.push(
  deploy({
    domain: config.poseidonHasher2.address,
    contract: poseidonHasher2,
    title: 'Poseidon hasher 2',
    description: 'Poseidon hash function for 2 arguments',
  }),
)

// Deploy PoseidonHasher3
actions.push(
  deploy({
    domain: config.poseidonHasher3.address,
    contract: poseidonHasher3,
    title: 'Poseidon hasher 3',
    description: 'Poseidon hash function for 3 arguments',
  }),
)

// Deploy TornadoProxy
const instances = config.miningV2.rates.map((rate) => namehash(rate.instance))
actions.push(
  deploy({
    domain: config.tornadoProxy.address,
    contract: tornadoProxy,
    args: [namehash(config.tornadoTrees.address), namehash(config.governance.address), instances],
    title: 'TornadoCash Proxy',
    description:
      'Proxy contract for tornado.cash deposits and withdrawals that records block numbers for mining',
  }),
)

// Deploy TornadoTrees
actions.push(
  deploy({
    domain: config.tornadoTrees.address,
    contract: tornadoTrees,
    args: [
      namehash(config.tornadoProxy.address),
      namehash(config.poseidonHasher2.address),
      namehash(config.poseidonHasher3.address),
      config.tornadoTrees.levels,
    ],
    title: 'TornadoTrees',
    description: 'Merkle tree with information about tornado cash deposits and withdrawals',
  }),
)

// Deploy Miner
const rates = config.miningV2.rates.map((rate) => ({
  instance: namehash(rate.instance),
  value: rate.value,
}))

actions.push(
  deploy({
    domain: config.miningV2.address,
    contract: miner,
    args: [
      namehash(config.rewardSwap.address),
      namehash(config.governance.address),
      namehash(config.tornadoTrees.address),
      [
        namehash(config.rewardVerifier.address),
        namehash(config.withdrawVerifier.address),
        namehash(config.treeUpdateVerifier.address),
      ],
      zeroMerkleRoot,
      rates,
    ],
    title: 'Miner',
    description: 'Mining contract for Anonymity Points',
  }),
)

// Deploy Voucher
const airdrops = airdrop.actions.map((a) => ({ to: a.expectedAddress, amount: a.amount }))
actions.push(
  deploy({
    domain: config.voucher.address,
    contract: voucher,
    args: [
      namehash(config.torn.address),
      namehash(config.governance.address),
      config.voucher.duration * 2592000, // 60 * 60 * 24 * 30
      airdrops,
    ],
    title: 'Voucher',
    description: 'TornadoCash voucher contract for early adopters',
  }),
)

// Deploy Vestings
config.vesting.governance.beneficiary = actions.find(
  (a) => a.domain === 'governance.contract.tornadocash.eth',
).expectedAddress
const vestings = Object.values(config.vesting)
for (const [i, vest] of vestings.entries()) {
  actions.push(
    deploy({
      domain: vest.address,
      contract: vesting,
      args: [namehash(config.torn.address), vest.beneficiary, 0, vest.cliff, vest.duration],
      title: `Vesting ${i + 1} / ${vestings.length}`,
      description: `Vesting contract for ${vest.address}`,
    }),
  )
}

// Write output
const result = {
  deployer: DEPLOYER,
  salt: SALT,
  actions: actions.concat(airdrop.actions),
}
fs.writeFileSync('actions.json', JSON.stringify(result, null, '  '))
console.log('Created actions.json')
