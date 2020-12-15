require('dotenv').config()
const config = require('../torn-token/config')
const path = require('path')
const { getCreate2Address } = require('@ethersproject/address')
const { keccak256 } = require('@ethersproject/solidity')
const ethers = require('ethers')
const MerkleTree = require('fixed-merkle-tree')
const { poseidon } = require('circomlib')

const DEPLOYER = process.env.DEPLOYER
const SALT = process.env.SALT

const poseidonHash = (items) => poseidon(items)
const poseidonHash2 = (a, b) => poseidonHash([a, b])
const merkleTree = new MerkleTree(20, [], { hashFunction: poseidonHash2 })
const zeroMerkleRoot =
  '0x' +
  merkleTree
    .root()
    .toString(16)
    .padStart(32 * 2, '0')

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
  return getCreate2Address(DEPLOYER, SALT, initHash)
}

function deploy({
  domain,
  amount,
  contract,
  args,
  title = '',
  description = '',
  dependsOn = [config.deployer.address],
}) {
  console.log('Generating deploy for', contract.name)
  let bytecode = contract.bytecode
  if (args) {
    const c = new ethers.ContractFactory(contract.abi, contract.bytecode)
    bytecode = c.getDeployTransaction(...args).data
  }
  return {
    domain,
    amount,
    contract: contract.name + '.sol',
    bytecode,
    expectedAddress: getAddress(bytecode),
    title,
    description,
    dependsOn,
  }
}

module.exports = {
  deploy,
  getContractData,
  zeroMerkleRoot,
}
