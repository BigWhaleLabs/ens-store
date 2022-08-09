import { ERC721__factory } from '@big-whale-labs/seal-cred-ledger-contract'
import { PersistableStore } from './PersistableStore'
import { RESERVED_CONTRACT_METADATA } from '@big-whale-labs/constants'
import type { Provider } from '@ethersproject/providers'

export class ContractNamesStore extends PersistableStore {
  savedContractNames = {} as {
    [contractAddress: string]: string | undefined
  }
  savedContractSymbols = {} as {
    [contractAddress: string]: string | undefined
  }
  requestedNames = {} as {
    [contractAddress: string]: Promise<string | undefined> | undefined
  }
  requestedSymbols = {} as {
    [contractAddress: string]: Promise<string | undefined> | undefined
  }

  private disallowList = [
    'requestedNames',
    'contractNames',
    'requestedSymbols',
    'contractSymbols',
  ]

  get contractNames() {
    return {
      ...this.savedContractNames,
      ...this.requestedNames,
    }
  }

  get contractSymbols() {
    return {
      ...this.savedContractSymbols,
      ...this.requestedSymbols,
    }
  }

  replacer = (key: string, value: unknown) => {
    return this.disallowList.includes(key) ? undefined : value
  }

  fetchContractName(address: string, provider: Provider) {
    if (this.contractNames[address]) return

    if (RESERVED_CONTRACT_METADATA[address]) {
      this.savedContractNames[address] =
        RESERVED_CONTRACT_METADATA[address].name
      return
    }
    const contract = ERC721__factory.connect(address, provider)
    this.requestedNames[address] = contract
      .name()
      .then((result) => {
        this.savedContractNames[address] = result || address
        return result || address
      })
      .catch(() => {
        this.savedContractNames[address] = address
        return address
      })
  }

  fetchContractSymbol(address: string, provider: Provider) {
    if (this.contractSymbols[address]) return

    if (RESERVED_CONTRACT_METADATA[address]) {
      this.savedContractSymbols[address] =
        RESERVED_CONTRACT_METADATA[address].symbol
      return
    }
    const contract = ERC721__factory.connect(address, provider)
    this.requestedSymbols[address] = contract
      .symbol()
      .then((result) => {
        const symbol = result.replace(/-d$/, '') || address
        this.savedContractSymbols[address] = symbol
        return symbol
      })
      .catch(() => address)
  }
}
