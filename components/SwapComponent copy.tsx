import * as lifiDataTypes from '@lifi/data-types'
import type { ContractCallsQuoteRequest, StatusResponse } from '@lifi/sdk'
import {
  ChainId,
  CoinKey,
  createConfig,
  EVM,
  getContractCallsQuote,
  getStatus,
} from '@lifi/sdk'
import type { Address, Chain } from 'viem'
import {
  createWalletClient,
  encodeFunctionData,
  http,
  parseAbi,
  publicActions,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet, arbitrum, optimism, polygon, gnosis } from 'viem/chains'
import 'dotenv/config'
import { promptConfirm } from './utils/promptConfirm'
import { checkTokenAllowance } from './utils/checkTokenAllowance'
import { transformTxRequestToSendTxParams } from './utils/transformTxRequestToSendTxParams'
import { randomBytes } from 'crypto';

const { findDefaultToken } = (lifiDataTypes as any).default

const run = async () => {
  console.info('>> Starting Swarm Demo: Create new Batch from any chain')
  console.info('>> Initialize LiFi SDK')

  try {
    const privateKey = process.env.PRIVATE_KEY as Address

    const account = privateKeyToAccount(privateKey)

    const client = createWalletClient({
      account,
      chain: arbitrum,
      transport: http(),
    }).extend(publicActions)

    const switchChains = [mainnet, arbitrum, optimism, polygon, gnosis]

    createConfig({
      integrator: 'lifi-sdk-example',
      providers: [
        EVM({
          getWalletClient: () => Promise.resolve(client),
          switchChain: (chainId) =>
            Promise.resolve(
              createWalletClient({
                account,
                chain: switchChains.find((chain) => {
                  if (chain.id == chainId) {
                    return chain
                  }
                }) as Chain,
                transport: http(),
              })
            ),
        }),
      ],
    })

    // config for swarm
    const config = {
      fromChain: ChainId.ARB,
      toChain: ChainId.DAI,
      fromToken: findDefaultToken(CoinKey.USDCe, ChainId.ARB).address,
      amount: '100000000000000', // BZZ amount that we want to have used in contract
      swarmContractAddress: '0x45a1502382541Cd610CC9068e88727426b696293', // PostageStamp on Gnosis
      swarmToken: '0x45a1502382541Cd610CC9068e88727426b696293', // xBZZ on Gnosis
      swarmContractGasLimit: '1000000',
      swarmContractAbi: [
        'function createBatch(address _owner, uint256 _initialBalancePerChunk, uint8 _depth, uint8 _bucketDepth, bytes32 _nonce, bool _immutable) external',
      ],
      swarmBatchOwner: account.address,
      swarmBatchInitialBalance: '477774720',  // lastPrice x 17280 is minimum for one day
      swarmBatchDepth: '20',  // This gives you size
      swarmBatchBucketDepth: '16',  // This is minimum
      swarmBatchNonce: '0x' + randomBytes(32).toString('hex'),  // Random nonce in hex
      swarmBatchImmutable: 'false' // Default to false
    }

    const stakeTxData = encodeFunctionData({
      abi: parseAbi(config.swarmContractAbi),
      functionName: 'createBatch',
      args: [config.swarmBatchOwner, config.swarmBatchInitialBalance, config.swarmBatchDepth, config.swarmBatchBucketDepth, config.swarmBatchNonce, config.swarmBatchImmutable],
    })

    const contractCallsQuoteRequest: ContractCallsQuoteRequest = {
      fromChain: config.fromChain,
      fromToken: config.fromToken,
      fromAddress: account.address,
      toChain: config.toChain,
      toToken: config.swarmToken,
      toAmount: config.amount,
      contractCalls: [
        {
          fromAmount: config.amount,
          fromTokenAddress: config.swarmToken,
          toContractAddress: config.swarmContractAddress,
          toContractCallData: stakeTxData,
          toContractGasLimit: config.swarmContractGasLimit,
        },
      ],
    }
    console.info(
      '>> create contract calls quote request',
      contractCallsQuoteRequest
    )

    const contactCallsQuoteResponse = await getContractCallsQuote(
      contractCallsQuoteRequest
    )
    console.info('>> Contract Calls Quote', contactCallsQuoteResponse)

    if (!(await promptConfirm('Execute Quote?'))) {
      return
    }

    await checkTokenAllowance(contactCallsQuoteResponse, account, client)

    console.info(
      '>> Execute transaction',
      contactCallsQuoteResponse.transactionRequest
    )

    const hash = await client.sendTransaction(
      transformTxRequestToSendTxParams(
        client.account,
        contactCallsQuoteResponse.transactionRequest
      )
    )
    console.info('>> Transaction sent', hash)

    const receipt = await client.waitForTransactionReceipt({
      hash,
    })
    console.info('>> Transaction receipt', receipt)

    // wait for execution
    let result: StatusResponse
    do {
      await new Promise((res) => {
        setTimeout(() => {
          res(null)
        }, 5000)
      })

      result = await getStatus({
        txHash: receipt.transactionHash,
        bridge: contactCallsQuoteResponse.tool,
        fromChain: contactCallsQuoteResponse.action.fromChainId,
        toChain: contactCallsQuoteResponse.action.toChainId,
      })

      console.info('>> Status update', result)
    } while (result.status !== 'DONE' && result.status !== 'FAILED')

    console.info('>> DONE', result)
  } catch (e) {
    console.error(e)
  }
}

run()