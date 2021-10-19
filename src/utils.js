require('dotenv').config()
const path = require('path')
const { getCreate2Address } = require('@ethersproject/address')
const { keccak256 } = require('@ethersproject/solidity')
const ethers = require('ethers')

const EIP_DEPLOYER = '0xce0042B868300000d44A59004Da54A005ffdcf9f'
const SALT = process.env.SALT

function getContractData(contractPath) {
  const json = require(contractPath)
  return {
    bytecode: json.bytecode,
    abi: json.abi,
    name: path.basename(contractPath, '.json'),
  }
}

function getAddress(bytecode) {
  const initHash = keccak256(['bytes'], [bytecode])
  return getCreate2Address(EIP_DEPLOYER, SALT, initHash)
}

function deploy({
  domain,
  amount,
  contract,
  args,
  title = '',
  description = '',
  dependsOn = [], //[config.deployer.address],
  isL1Contract = false,
}) {
  console.log('Generating deploy for', contract.name)
  let bytecode = contract.bytecode
  let constructorArgs
  if (args) {
    const c = new ethers.ContractFactory(contract.abi, contract.bytecode)
    bytecode = c.getDeployTransaction(...args).data
    constructorArgs = c.interface.encodeDeploy(args)
  }
  return {
    domain,
    amount,
    contract: contract.name + '.sol',
    bytecode,
    expectedAddress: getAddress(bytecode),
    title,
    constructorArgs,
    description,
    dependsOn,
    isL1Contract,
  }
}

function expectedAddress(actions, action) {
  const result = actions.find((a) => a.domain === action)
  if (!result) {
    throw new Error(`Address not found: ${action}`)
  }
  return result.expectedAddress
}

module.exports = {
  deploy,
  getContractData,
  expectedAddress,
}
