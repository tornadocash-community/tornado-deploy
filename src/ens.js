require('dotenv').config()
const ethers = require('ethers')
const { namehash } = ethers.utils
const { actions } = require('../actions.json')
const abi = require('../abi/ens.abi.json')

const prefix = {
  1: '',
  42: 'kovan.',
  5: 'goerli.',
}
const gasPrice = process.env.GAS_PRICE_IN_WEI || '123000000000' // 123 gwei
const explorer = `https://${prefix[process.env.NET_ID]}etherscan.io`

async function main() {
  const privateKey = process.env.PRIVATE_KEY
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL)
  const wallet = new ethers.Wallet(privateKey, provider)

  const resolver =
    process.env.NET_ID === '1'
      ? new ethers.Contract('0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41', abi, wallet) // public resolver from mainnet with multicall support
      : new ethers.Contract('0x8595bFb0D940DfEDC98943FA8a907091203f25EE', abi, wallet) // our kovan mock

  const data = []
  for (let { domain, expectedAddress, contract } of actions) {
    if (!domain && contract === 'Airdrop.sol') {
      continue
    }
    const hash = namehash(domain)
    console.log(`Setting ${expectedAddress} address for ${hash} - ${domain}`)
    const calldata = resolver.interface.encodeFunctionData('setAddr(bytes32,address)', [
      hash,
      expectedAddress,
    ])
    data.push(calldata)
  }
  const tx = await resolver.multicall(data, { gasPrice })
  console.log(`\n${explorer}/tx/${tx.hash}`)
  await tx.wait()
  console.log('Complete')
}

main()
