import { ContractReceipt } from 'ethers'
import MintedToken from '../models/MintedToken'
import getOwnedERC721, { isTransferEvent, parseLogData } from './getOwnedERC721'
import type { Filter, Log } from '@ethersproject/providers'

export interface ContractSynchronizerSchema {
  account: string
  synchronizedBlockId: number
  mapAddressToTokenIds: { [address: string]: string[] }
  startBlock: number
}

export type GetLog = (filter: Filter) => Promise<Log[]>

export default class ContractSynchronizer {
  account: string
  locked = false
  startBlock = 0
  synchronizedBlockId?: number
  mapAddressToTokenIds?: { [address: string]: string[] }

  skipTransactions = new Set<string>()

  constructor(
    account: string,
    startBlock = 0,
    mapAddressToTokenIds?: { [address: string]: string[] },
    synchronizedBlockId?: number
  ) {
    this.account = account
    this.synchronizedBlockId = synchronizedBlockId
    this.mapAddressToTokenIds = mapAddressToTokenIds
    this.startBlock = startBlock
  }

  static fromJSON({
    account,
    startBlock,
    synchronizedBlockId,
    mapAddressToTokenIds,
  }: {
    account: string
    startBlock: number
    synchronizedBlockId: number
    mapAddressToTokenIds: { [address: string]: string[] }
  }) {
    return new ContractSynchronizer(
      account,
      startBlock,
      mapAddressToTokenIds,
      synchronizedBlockId
    )
  }

  toJSON() {
    return {
      account: this.account,
      startBlock: this.startBlock,
      synchronizedBlockId: this.synchronizedBlockId,
      mapAddressToTokenIds: this.mapAddressToTokenIds,
    }
  }

  async syncAddressToTokenIds(
    blockId: number,
    getLogs: GetLog,
    getHeavyLogs: GetLog
  ) {
    if (!this.locked && blockId !== this.synchronizedBlockId) {
      this.locked = true

      const fromBlock =
        typeof this.synchronizedBlockId !== 'undefined'
          ? this.synchronizedBlockId + 1
          : this.startBlock

      this.mapAddressToTokenIds = await getOwnedERC721(
        this.account,
        fromBlock,
        blockId,
        { ...this.mapAddressToTokenIds },
        fromBlock === 0 ? getHeavyLogs : getLogs,
        this.skipTransactions
      )

      this.synchronizedBlockId = blockId
      this.locked = false
    }

    return this.mapAddressToTokenIds
  }

  applyTransaction(transaction: ContractReceipt) {
    const minted: MintedToken[] = []
    for (const { data, topics, transactionHash, address } of transaction.logs) {
      if (!isTransferEvent(topics)) continue
      if (this.skipTransactions.has(transactionHash)) continue
      const {
        args: { tokenId },
      } = parseLogData({ data, topics })

      if (!this.mapAddressToTokenIds) this.mapAddressToTokenIds = {}
      if (!this.mapAddressToTokenIds[address])
        this.mapAddressToTokenIds[address] = []

      const value = tokenId.toString()
      minted.push({
        address,
        tokenId,
      })
      if (!this.mapAddressToTokenIds[address].includes(value))
        this.mapAddressToTokenIds[address].push(value)
      this.skipTransactions.add(transactionHash)
    }
    return minted
  }
}
