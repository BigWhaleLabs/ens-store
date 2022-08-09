import { subscribe } from 'valtio'
import SequreLS from 'secure-ls'

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

  makePersistent(encryptionKey?: string, encrypt = true) {
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
