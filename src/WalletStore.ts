import { ErrorList, handleError } from '@big-whale-labs/frontend-utils'
import { ExternalProvider, Web3Provider } from '@ethersproject/providers'
import { PersistableStore } from './PersistableStore'
import { hexValue } from 'ethers/lib/utils'
import Web3Modal from 'web3modal'
import getWeb3Modal from './helpers/getWeb3Modal'
import type { RelayProvider } from '@opengsn/provider'
import type { providers } from 'ethers'

let provider: Web3Provider

export class WalletStore extends PersistableStore {
  account?: string
  walletLoading = false
  needNetworkChange = false
  web3modal: Web3Modal
  network: string
  chainId: number
  disallowList = [
    'disallowList',
    'account',
    'cachedProvider',
    'provider',
    'walletLoading',
    'web3modal',
  ]

  constructor(
    rpc: string,
    network: string,
    appName: string,
    chainId: number,
    extendDisallowList: string[] = []
  ) {
    super()
    this.web3modal = getWeb3Modal(rpc, network, appName)
    this.network = network
    this.chainId = chainId
    this.disallowList = this.disallowList.concat(extendDisallowList)
  }

  changeAccount(account?: string) {
    this.account = account
  }

  replacer = (key: string, value: unknown) => {
    return this.disallowList.includes(key) ? undefined : value
  }

  get cachedProvider() {
    return this.web3modal.cachedProvider
  }

  async connect(clearCachedProvider = false) {
    this.walletLoading = true
    try {
      if (provider) provider.removeAllListeners()
      if (clearCachedProvider) this.web3modal.clearCachedProvider()

      const instance = await this.web3modal.connect()
      // We need this "any" networks so we could handle when users switch between networks with listeners without errors
      provider = new Web3Provider(instance, 'any')

      this.changeAccount(await this.getAccount())
      if (!(await this.isNetworkRight(provider))) {
        this.setNetworkAndDropAccount()
        handleError(
          new Error(
            ErrorList.wrongNetwork(
              await this.getUserNetworkName(provider),
              this.network
            )
          )
        )
      }
      this.subscribeProvider(instance)
    } catch (error) {
      if (error === 'Modal closed by user') return
      handleError(error)
      this.clearData()
    } finally {
      this.walletLoading = false
    }
  }

  private async isNetworkRight(provider: Web3Provider) {
    const userNetwork = await this.getUserNetworkName(provider)
    return this.network === userNetwork
  }

  private async getUserNetworkName(provider: Web3Provider) {
    return (await provider.getNetwork()).name
  }

  private async handleAccountChanged() {
    if (!provider) return

    this.walletLoading = true
    this.changeAccount(await this.getAccount())
    this.walletLoading = false
  }

  async signMessage(message: string) {
    if (!provider) throw new Error('No provider')

    const signer = provider.getSigner()
    const signature = await signer.signMessage(message)
    return signature
  }

  private async getAccount() {
    return (await provider.listAccounts())[0]
  }

  private async switchNetwork() {
    const chainId = hexValue(this.chainId)
    await provider.send('wallet_switchEthereumChain', [{ chainId }])
  }

  async getSigner(
    relayProvider: (
      provider: providers.JsonRpcProvider | Web3Provider
    ) => Promise<RelayProvider>
  ) {
    if (!provider) throw new Error(ErrorList.noProvider)

    const gsnProvider = await relayProvider(provider)

    return new Web3Provider(
      gsnProvider as unknown as ExternalProvider
    ).getSigner(0)
  }

  private setNetworkAndDropAccount() {
    this.needNetworkChange = true
    this.changeAccount()
  }

  private subscribeProvider(localProvider: Web3Provider) {
    if (!localProvider.on) return

    localProvider.on('error', (error: Error) => {
      handleError(error)
    })

    localProvider.on('accountsChanged', (accounts: string[]) => {
      if (!accounts.length) this.clearData()

      this.changeAccount()
      void this.handleAccountChanged()
    })
    localProvider.on('disconnect', (error: Error) => {
      // Sometimes this error fires when user switching between networks too fast, we should not clean data in this case
      if (error.message.includes('Attempting to connect.'))
        return handleError(error)

      if (localProvider) localProvider.removeAllListeners()
      handleError(error)
      this.clearData()
    })
    localProvider.on('chainChanged', async () => {
      if (await this.isNetworkRight(provider)) {
        this.needNetworkChange = false
        this.changeAccount(await this.getAccount())
        return
      }
      this.setNetworkAndDropAccount()
    })
  }

  private clearData() {
    this.web3modal.clearCachedProvider()
    this.changeAccount()
  }

  getProvider() {
    return provider
  }

  exit() {
    this.clearData()
  }

  changeNetworkOrConnect({
    clearCachedProvider = false,
    needNetworkChange,
  }: {
    clearCachedProvider: boolean
    needNetworkChange?: boolean
  }) {
    if (needNetworkChange || this.needNetworkChange) return this.switchNetwork()
    return this.connect(clearCachedProvider)
  }
}
