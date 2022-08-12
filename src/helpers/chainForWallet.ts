import { hexValue } from 'ethers/lib/utils'
import networkChainIdToName from 'models/networkChainIdToName'

export default function (id: number) {
  const chainId = hexValue(id)

  const name = networkChainIdToName[chainId]
  const firstCapitalName = name.charAt(0).toUpperCase() + name.slice(1)
  const blockExplorerUrl =
    name === 'mainnet'
      ? 'https://etherscan.io/'
      : `https://${name}.etherscan.io/`

  const currency = `${firstCapitalName}ETH`

  return {
    chainId,
    rpcUrls: [`https://${name}.infura.io/v3/`],
    chainName: `${firstCapitalName} Test Network`,
    nativeCurrency: {
      name: currency,
      symbol: currency,
    },
    blockExplorerUrls: [blockExplorerUrl],
  }
}
