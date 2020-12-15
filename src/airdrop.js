require('dotenv').config()
const fs = require('fs')
const ethers = require('ethers')
const { namehash, formatEther } = ethers.utils
const config = require('../torn-token/config')
const { deploy, getContractData } = require('./utils')

const DEPLOYER = process.env.DEPLOYER
const SALT = process.env.SALT
const AIRDROP_CHUNK_SIZE = process.env.AIRDROP_CHUNK_SIZE

const airdrop = getContractData('../torn-token/build/contracts/Airdrop.json')

const actions = []

const list = fs
  .readFileSync('./airdrop/airdrop.csv')
  .toString()
  .split('\n')
  .map((a) => a.split(','))
  .filter((a) => a.length === 2)
  .map((a) => ({ to: a[0], amount: ethers.BigNumber.from(a[1]) }))

const total = list.reduce((acc, a) => acc.add(a.amount), ethers.BigNumber.from(0))
const expectedAirdrop = ethers.BigNumber.from(config.torn.distribution.airdrop.amount)
if (total.gt(expectedAirdrop)) {
  console.log(
    `Total airdrop amount ${formatEther(total)} is greater than expected ${formatEther(expectedAirdrop)}`,
  )
  process.exit(1)
}
console.log('Airdrop amount:', formatEther(total))
console.log('Airdrop expected:', formatEther(expectedAirdrop))

let i = 0
while (list.length) {
  i++
  const chunk = list.splice(0, AIRDROP_CHUNK_SIZE)
  const total = chunk.reduce((acc, a) => acc.add(a.amount), ethers.BigNumber.from(0))
  actions.push(
    deploy({
      amount: total.toString(),
      contract: airdrop,
      args: [namehash(config.voucher.address), chunk],
      dependsOn: [config.deployer.address, config.voucher.address],
      title: `Airdrop Voucher ${i}`,
      description: 'Early adopters voucher coupons',
    }),
  )
}

// Write output
const result = {
  deployer: DEPLOYER,
  salt: SALT,
  actions,
}
fs.writeFileSync('airdrop.json', JSON.stringify(result, null, '  '))
console.log('Created airdrop.json')
