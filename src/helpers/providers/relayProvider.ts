import { Eip1193Bridge } from '@ethersproject/experimental'
import {
  GSN_PAYMASTER_CONTRACT_ADDRESS,
  GSN_SC_RELAY,
} from '@big-whale-labs/constants'
import { RelayProvider } from '@opengsn/provider'
import { Web3Provider } from '@ethersproject/providers'
import { WrapBridge } from '@opengsn/provider/dist/WrapContract'

export default function relayProvider(provider: Web3Provider) {
  return RelayProvider.newProvider({
    provider: new WrapBridge(new Eip1193Bridge(provider.getSigner(), provider)),
    config: {
      paymasterAddress: GSN_PAYMASTER_CONTRACT_ADDRESS,
      preferredRelays: [GSN_SC_RELAY],
      blacklistedRelays: ['https://goerli.v3.opengsn.org/v3'],
    },
  }).init()
}
