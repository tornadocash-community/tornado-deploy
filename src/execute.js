require('dotenv').config()
const ethers = require('ethers')
const actions = require('../actions.json')
const abi = require('../abi/deployer.abi.json')

const {
  L1_EXPLORER,
  L2_EXPLORER,
  L1_RPC_URL,
  L2_RPC_URL,
  L1_GAS_PRICE_IN_WEI,
  L2_GAS_PRICE_IN_WEI,
} = process.env

async function execute(isL1) {
  const RPC_URL = isL1 ? L1_RPC_URL : L2_RPC_URL
  const explorer = isL1 ? L1_EXPLORER : L2_EXPLORER
  const privateKey = process.env.PRIVATE_KEY
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
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
    if ((isL1 && !action.isL1Contract) || (!isL1 && action.isL1Contract)) {
      continue
    }

    code = await provider.getCode(action.expectedAddress)
    if (code && code !== '0x') {
      console.log(`${action.contract} is already deployed at ${explorer}/address/${action.expectedAddress}`)
      continue
    }
    console.log(`Deploying ${action.contract} to ${action.domain} (${action.expectedAddress})`)
    const tx = await deployer.deploy(action.bytecode, actions.salt, {
      gasLimit: 4e6,
      gasPrice: isL1 ? L1_GAS_PRICE_IN_WEI : L2_GAS_PRICE_IN_WEI,
    })
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
      const tx2 = await wallet.sendTransaction({
        gasLimit: 5e6,
        gasPrice: isL1 ? L1_GAS_PRICE_IN_WEI : L2_GAS_PRICE_IN_WEI,
        data: action.bytecode,
      })
      console.log(`TX hash ${explorer}/tx/${tx2.hash}`)
      await tx2.wait()
      console.log('Mined, check revert reason on etherscan')
      return
      // throw new Error(`Failed to deploy ${action.contract}`)
    }
  }
}

async function main() {
  await execute(true)
  await execute(false)
}

main()
