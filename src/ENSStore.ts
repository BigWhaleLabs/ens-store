import { providers } from 'ethers'

export class ENSStore {
  provider: providers.Provider
  ensNames: { [address: string]: Promise<string | null> | undefined } = {}

  constructor(provider: providers.Provider) {
    this.provider = provider
  }

  fetchEnsName(address: string) {
    if (this.ensNames[address]) {
      return
    }
    this.ensNames[address] = this.provider.lookupAddress(address)
  }
}
