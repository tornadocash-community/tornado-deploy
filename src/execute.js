require('dotenv').config()
const ethers = require('ethers')
const actions = require('../actions.json')
const abi = require('../abi/deployer.abi.json')

const prefix = {
  1: '',
  42: 'kovan.',
  5: 'goerli.',
}

const explorer = `https://${prefix[process.env.NET_ID]}etherscan.io`

async function main() {
  const privateKey = process.env.PRIVATE_KEY
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL)
  const wallet = new ethers.Wallet(privateKey, provider)
  let deployer = new ethers.Contract(actions.deployer, abi, wallet)
  console.log('actions.deployer', actions.deployer)

  let code = await provider.getCode(actions.eipDeployer.expectedAddress)
  if (!code || code === '0x') {
    console.log('Deploying EIP-2470 deployer')
    const balance = await provider.getBalance(actions.eipDeployer.from)
    if (balance.lt(ethers.utils.parseEther('0.0247'))) {
      console.log('Insufficient balance on deploy address, sending some eth')
      const tx = await wallet.sendTransaction({
        to: actions.eipDeployer.from,
        value: ethers.utils.parseEther('0.0247').sub(balance).toHexString(),
        gasLimit: ethers.BigNumber.from(800000).toHexString(), // 800k because of arbitrum
        gasPrice: 1e6,
      })
      console.log('Tx hash:', tx.hash)
    }
    const serialized = ethers.utils.serializeTransaction(
      actions.eipDeployer.tx,
      actions.eipDeployer.signature,
    )
    const tx = await provider.sendTransaction(serialized)
    console.log('Tx hash:', tx.hash)
  }

  for (const action of actions.actions) {
    code = await provider.getCode(action.expectedAddress)
    if (code && code !== '0x') {
      console.log(`${action.contract} is already deployed at ${explorer}/address/${action.expectedAddress}`)
      continue
    }
    console.log(`Deploying ${action.contract} to ${action.domain} (${action.expectedAddress})`)
    const tx = await deployer.deploy(action.bytecode, actions.salt, { gasLimit: 70e6, gasPrice: 1e9 })
    console.log(`TX hash ${explorer}/tx/${tx.hash}`)
    try {
      await tx.wait()
      console.log(`Deployed ${action.contract} to ${explorer}/address/${action.expectedAddress}\n`)
      if (action.contract === 'Deployer.sol') {
        deployer = deployer.attach(action.expectedAddress)
      }
    } catch (e) {
      console.error(`Failed to deploy ${action.contract}, sending debug tx`)
      // const trace = await provider.send('debug_traceTransaction', [ tx.hash ])
      // console.log(trace)
      const tx2 = await wallet.sendTransaction({ gasLimit: 70e6, gasPrice: 1e9, data: action.bytecode })
      console.log(`TX hash ${explorer}/tx/${tx2.hash}`)
      await tx2.wait()
      console.log('Mined, check revert reason on etherscan')
      return
      // throw new Error(`Failed to deploy ${action.contract}`)
    }
  }
}

main()
