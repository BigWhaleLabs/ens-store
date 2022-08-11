import { providers } from 'ethers'

export class ENSStore {
  provider: providers.Provider
  eNSNames: { [address: string]: Promise<string | null> | undefined } = {}

  constructor(provider: providers.Provider) {
    this.provider = provider
  }

  fetchENSName(address: string) {
    if (this.eNSNames[address]) {
      return
    }
    this.eNSNames[address] = this.provider.lookupAddress(address)
  }
}
