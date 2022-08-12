import type { Provider } from '@ethersproject/providers'

export class ENSStore {
  provider: Provider
  eNSNames: { [address: string]: Promise<string | null> | undefined } = {}

  constructor(provider: Provider) {
    this.provider = provider
  }

  fetchENSName(address: string) {
    if (this.eNSNames[address]) {
      return
    }
    this.eNSNames[address] = this.provider.lookupAddress(address)
  }
}
