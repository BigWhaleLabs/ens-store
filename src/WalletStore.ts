import { NotificationsStore } from './NotificationStore'
import { PersistableStore } from './PersistableStore'
import { Web3Provider } from '@ethersproject/providers'
import { proxy } from 'valtio'
import { serializeError } from 'eth-rpc-errors'
import chainForWallet from 'helpers/chainForWallet'
import handleError, { ErrorList } from 'helpers/handleError'
import networkChainIdToName from 'models/networkChainIdToName'
import setBeforeUnload from 'helpers/setBeforeUnload'
import web3Modal from 'helpers/web3Modal'

let provider: Web3Provider
const storeProxy = proxy(new NotificationsStore()).makePersistent()
setBeforeUnload(() => (storeProxy.showTwitterShare = false))

export class WalletStore extends PersistableStore {
  account?: string
  ethNetwork: string
  appName: string
  walletLoading = false
  mintLoading = false
  needNetworkChange = false
  walletsToNotifiedOfBeingDoxxed = {} as {
    [address: string]: boolean
  }

  constructor(ethNetwork: string, appName: string) {
    super()
    this.ethNetwork = ethNetwork
    this.appName = appName
  }

  replacer = (key: string, value: unknown) => {
    const disallowList = [
      'account',
      'cachedProvider',
      'provider',
      'walletLoading',
    ]
    return disallowList.includes(key) ? undefined : value
  }

  get cachedProvider() {
    return web3Modal(this.appName).cachedProvider
  }

  async connect(clearCachedProvider = false) {
    this.walletLoading = true
    try {
      if (clearCachedProvider) web3Modal(this.appName).clearCachedProvider()

      const instance = await web3Modal(this.appName).connect()
      provider = new Web3Provider(instance)
      const userNetwork = (await provider.getNetwork()).name
      await this.checkNetwork(provider, userNetwork)
      if (this.needNetworkChange)
        throw new Error(ErrorList.wrongNetwork(userNetwork, this.ethNetwork))
      this.account = (await provider.listAccounts())[0]
      this.subscribeProvider(instance)
    } catch (error) {
      if (error !== 'Modal closed by user') {
        handleError(error)
        this.clearData()
      }
    } finally {
      this.walletLoading = false
    }
  }

  async signMessage(message: string) {
    if (!provider) throw new Error('No provider')

    const signer = provider.getSigner()
    const signature = await signer.signMessage(message)
    return signature
  }

  private async checkNetwork(provider: Web3Provider, userNetwork: string) {
    if (userNetwork === this.ethNetwork) return (this.needNetworkChange = false)

    this.needNetworkChange = true
    await this.requestChangeNetwork(provider)
  }

  private async requestChangeNetwork(provider: Web3Provider) {
    const index = Object.values(networkChainIdToName).findIndex(
      (name) => name === this.ethNetwork
    )
    const chainId = Object.keys(networkChainIdToName)[index]

    try {
      await provider.send('wallet_switchEthereumChain', [{ chainId }])
      this.needNetworkChange = false
    } catch (error) {
      const code = serializeError(error).code
      if (code !== 4902) return

      await provider.send('wallet_addEthereumChain', [
        chainForWallet(Number(chainId)),
      ])
      this.needNetworkChange = false
    }
  }

  private async handleAccountChanged() {
    if (!provider) return

    this.walletLoading = true
    const accounts = await provider.listAccounts()
    this.account = accounts[0]
    storeProxy.showTwitterShare = false
    this.walletLoading = false
  }

  get provider() {
    return provider
  }

  private subscribeProvider(provider: Web3Provider) {
    if (!provider.on) return

    provider.on('error', (error: Error) => {
      handleError(error)
    })

    provider.on('accountsChanged', (accounts: string[]) => {
      if (!accounts.length) this.clearData()

      this.account = undefined
      void this.handleAccountChanged()
    })
    provider.on('disconnect', (error: unknown) => {
      if (provider) provider.removeAllListeners()
      handleError(error)
      this.clearData()
    })
    provider.on('chainChanged', async () => {
      this.account = undefined
      await this.connect()
    })
  }

  private clearData() {
    storeProxy.showTwitterShare = false
    web3Modal(this.appName).clearCachedProvider()
    this.account = undefined
  }
}
