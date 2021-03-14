require('dotenv').config()
const ethers = require('ethers')
const { namehash } = ethers.utils
let { actions } = require('../actions.json')
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
  if (process.env.NET_ID === '5') {
    actions = actions.concat([
      { domain: 'eth-01.tornado.cash.eth', expectedAddress: '0x6Bf694a291DF3FeC1f7e69701E3ab6c592435Ae7' },
      { domain: 'eth-1.tornado.cash.eth', expectedAddress: '0x3aac1cC67c2ec5Db4eA850957b967Ba153aD6279' },
      { domain: 'eth-10.tornado.cash.eth', expectedAddress: '0x723B78e67497E85279CB204544566F4dC5d2acA0' },
      { domain: 'eth-100.tornado.cash.eth', expectedAddress: '0x0E3A09dDA6B20aFbB34aC7cD4A6881493f3E7bf7' },
      { domain: 'dai-100.tornadocash.eth', expectedAddress: '0x76D85B4C0Fc497EeCc38902397aC608000A06607' },
      { domain: 'dai-1000.tornadocash.eth', expectedAddress: '0xCC84179FFD19A1627E79F8648d09e095252Bc418' },
      // { domain: 'dai-10000.tornadocash.eth', expectedAddress: '0x435aEa5B50CBE34CaC0b42d195da587b923200C3' },
    ])
  }
  for (let { domain, expectedAddress } of actions) {
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
