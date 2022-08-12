import BalanceSignature from 'models/BalanceSignature'
import Network from 'models/Network'
import PublicKey from 'models/PublicKey'
import Signature from 'models/Signature'
import axios from 'axios'

const baseURLVersion = `/v0.2.1/verify`

export async function requestAddressOwnershipAttestation(
  signature: string,
  message: string,
  verifyURL: string
) {
  const { data } = await axios.post<Signature>(
    `${verifyURL}${baseURLVersion}/ethereum-address`,
    {
      signature,
      message,
    }
  )
  return data
}

export async function requestBalanceAttestation(
  tokenAddress: string,
  network: Network,
  ownerAddress: string,
  verifyURL: string
) {
  const { data } = await axios.post<BalanceSignature>(
    `${verifyURL}${baseURLVersion}/balance`,
    {
      tokenAddress,
      network,
      ownerAddress,
    }
  )
  return data
}

export async function requestContractMetadata(
  network: Network,
  tokenAddress: string,
  verifyURL: string
) {
  const { data } = await axios.post<Signature>(
    `${verifyURL}${baseURLVersion}/contract-metadata`,
    {
      tokenAddress,
      network,
    }
  )
  return data
}

export async function getEddsaPublicKey(verifyURL: string) {
  const { data } = await axios.get<PublicKey>(
    `${verifyURL}${baseURLVersion}/eddsa-public-key`
  )
  return data
}

export function sendEmail(email: string, verifyURL: string) {
  return axios.post(`${verifyURL}${baseURLVersion}/email`, {
    email,
  })
}
