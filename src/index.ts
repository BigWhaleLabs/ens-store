import { ERC721__factory } from '@big-whale-labs/seal-cred-ledger-contract'
import { RESERVED_CONTRACT_METADATA } from '@big-whale-labs/constants'
import { providers } from 'ethers'
import { subscribe } from 'valtio'
import SequreLS from 'secure-ls'
import type { Provider } from '@ethersproject/providers'

export class EnsStore {
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

export class PersistableStore {
  reviver = (_: string, value: unknown) => value
  replacer = (_: string, value: unknown) => value

  static ls: SequreLS

  get persistanceName() {
    return this.constructor.name
  }

  persist(encrypt: boolean) {
    const json = JSON.stringify(this, this.replacer)
    encrypt
      ? PersistableStore.ls.set(this.persistanceName, json)
      : localStorage.setItem(this.persistanceName, json)
  }

  makePersistent(encrypt = false, encryptionKey?: string) {
    if (encrypt) {
      if (!encryptionKey)
        throw new Error('Encryption key is required if encryption is enabled')
      if (!PersistableStore.ls) {
        PersistableStore.ls = new SequreLS({
          encodingType: 'des',
          isCompression: false,
          encryptionSecret: encryptionKey,
        })
      }
    }
    // Start persisting
    subscribe(this, () => {
      this.persist(encrypt)
    })
    // Recover the store
    if (encrypt && this.checkIfJsonFormat(this.persistanceName)) {
      PersistableStore.ls.set(
        this.persistanceName,
        localStorage.getItem(this.persistanceName)
      )
    }
    const savedString = encrypt
      ? PersistableStore.ls.get(this.persistanceName)
      : localStorage.getItem(this.persistanceName)
    if (savedString) {
      const savedState = JSON.parse(savedString, this.reviver)
      Object.assign(this, savedState)
    }
    // Persist just in case
    this.persist(encrypt)
    // Allow chaining
    return this
  }

  checkIfJsonFormat(name: string) {
    const savedString = localStorage.getItem(name)
    if (savedString === null) return false
    try {
      JSON.parse(savedString, this.reviver)
    } catch (error) {
      return false
    }
    return true
  }
}

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

  private disallowList: string[]

  constructor(disallowList: string[]) {
    super()
    this.disallowList = disallowList
  }

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
