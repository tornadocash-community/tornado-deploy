require('dotenv').config()
const fs = require('fs')
const ethers = require('ethers')
const { formatUnits, commify } = ethers.utils
const { deploy, getContractData } = require('./utils')

const { DEPLOYER, SALT, HASHER, VERIFIER, COMP_ADDRESS, NET_ID } = process.env

const instancesFile = NET_ID == 1 ? 'instancesMainnet' : 'instancesGoerli'
const instances = require(`../${instancesFile}`)
// const deployer = getContractData('../deployer/build/contracts/Deployer.json')
// const verifier = getContractData('../tornado-core/build/contracts/Verifier.json')
// const hasher = getContractData('../tornado-core/build/contracts/Hasher.json')
const ethTornado = getContractData('../tornado-core/build/contracts/ETHTornado.json')
const ercTornado = getContractData('../tornado-core/build/contracts/ERC20Tornado.json')
const compTornado = getContractData('../tornado-core/build/contracts/cTornado.json')

const actions = []

// Actions needed for new blockchains
// Assumes that EIP-2470 deployer is already present on the chain
// actions.push(
//   deploy({
//     domain: config.deployer.address,
//     contract: deployer,
//     args: ['0x0000000000000000000000000000000000000000'],
//     dependsOn: [],
//     title: 'Deployment proxy',
//     description:
//       'This a required contract to initialize all other contracts. It is simple wrapper around EIP-2470 Singleton Factory that emits an event of contract deployment. The wrapper also validates if the deployment was successful.',
//   }),
// )
//
// // Deploy Hasher
// actions.push(
//   deploy({
//     domain: 'hasher.contract.tornadocash.eth',
//     contract: hasher,
//     title: 'Hasher',
//     description: 'MiMC hasher contract',
//     dependsOn: [
//
//     ]
//   }),
// )
//
// // Deploy verifier
// actions.push(
//   deploy({
//     domain: 'verifier.contract.tornadocash.eth',
//     contract: verifier,
//     title: 'Verifier',
//     description: 'zkSNARK verifier contract for withdrawals',
//   }),
// )

// Deploy instances
for (const instance of instances) {
  const args = [VERIFIER, HASHER, instance.denomination, 20]
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
  deployer: DEPLOYER,
  salt: SALT,
  actions: actions,
}
fs.writeFileSync('actions.json', JSON.stringify(result, null, 2))
console.log('Created actions.json')
