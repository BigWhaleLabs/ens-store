import CoinbaseWalletSDK from '@coinbase/wallet-sdk'
import WalletConnect from '@walletconnect/web3-provider'
import Web3Modal from 'web3modal'

let web3modal: Web3Modal

export default function (rpc: string, network: string, appName: string) {
  if (web3modal) return web3modal
  web3modal = new Web3Modal({
    cacheProvider: true,
    theme: 'dark',
    disableInjectedProvider: false,
    network,
    providerOptions: {
      walletconnect: {
        package: WalletConnect,
        options: {
          rpc: {
            5: rpc,
          },
        },
      },
      coinbasewallet: {
        package: CoinbaseWalletSDK,
        options: {
          appName,
          rpc: {
            5: rpc,
          },
          darkMode: true,
        },
      },
    },
  })
  return web3modal
}
