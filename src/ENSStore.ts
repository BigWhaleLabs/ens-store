import { providers } from 'ethers'

export class ENSStore {
  provider: providers.Provider
  ENSNames: { [address: string]: Promise<string | null> | undefined } = {}

  constructor(provider: providers.Provider) {
    this.provider = provider
  }

  fetchENSName(address: string) {
    if (this.ENSNames[address]) {
      return
    }
    this.ENSNames[address] = this.provider.lookupAddress(address)
  }
}
