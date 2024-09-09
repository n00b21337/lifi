'use client';

import { useState, useEffect } from 'react';
import { createConfig, EVM, getQuote, convertQuoteToRoute, executeRoute, RouteExtended } from '@lifi/sdk';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrum, mainnet, optimism, polygon, scroll, Chain } from 'viem/chains';
import 'dotenv/config';
import './SwapComponent.css';


// Retrieve and format the private key from environment variables
const PRIVATE_KEY = process.env.NEXT_PUBLIC_PRIVATE_KEY?.trim(); // Ensure it's properly trimmed

// Validate that the private key is defined and correctly formatted
if (!PRIVATE_KEY) {
  throw new Error('Private key is not defined. Please set it in the .env file.');
}

if (!PRIVATE_KEY.startsWith('0x')) {
  throw new Error('Private key must start with 0x.');
}

if (PRIVATE_KEY.length !== 66) {
  throw new Error('Private key must be 64 characters long after the 0x prefix.');
}

// Set up the account using the private key
const account = privateKeyToAccount(PRIVATE_KEY);
const walletAddress = account.address; 

// Define the chains you will interact with
const chains = [arbitrum, mainnet, optimism, polygon, scroll];

// Create the initial wallet client with the mainnet chain
const client = createWalletClient({
  account,
  chain: mainnet,
  transport: http(),
});

// Configure the LiFi SDK with the EVM provider using the created wallet client
createConfig({
  integrator: 'Swarm', // Replace with your dApp or company name
  providers: [
    EVM({
      getWalletClient: async () => client,
      switchChain: async (chainId) => {
        // Switch chain by creating a new wallet client with the appropriate chain
        const newClient = createWalletClient({
          account,
          chain: chains.find((chain) => chain.id === chainId) as Chain,
          transport: http(),
        });
        return newClient;
      },
    }),
  ],
});

// Chains and Tokens
const fromChains = [
  { id: 1, name: 'Ethereum' },
  { id: 42161, name: 'Arbitrum' },
  { id: 10, name: 'Optimism' },
  { id: 8453, name: 'Base' },
  { id: 42220, name: 'Celo' },
];

const fromTokens = [
  { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', name: 'WBTC' },
  { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', name: 'WETH' },
  { address: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', name: 'USDC' },
  { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', name: 'USDT' },
  { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', name: 'DAI' },
];

// Fixed Chain and Token
const toChain = { id: 100, name: 'Gnosis' };
const toToken = { address: '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d', name: 'xDAI' };

// Define the type for the execution result state
type ExecutionResultType = RouteExtended | { error: string } | null;

const SwapComponent = () => {
  const [fromChain, setFromChain] = useState(fromChains[0].id);
  const [fromToken, setFromToken] = useState(fromTokens[0].address);
  const [fromAmount, setFromAmount] = useState('10000000'); // 10 USDC by default
  const [fromAddress, setFromAddress] = useState(walletAddress); 
  const [executionResult, setExecutionResult] = useState<ExecutionResultType>(null);

  const handleSwap = async () => {
    try {
      const quoteRequest = {
        fromChain,
        toChain: toChain.id,
        fromToken,
        toToken: toToken.address,
        fromAmount,
        fromAddress,
      };

      const quote = await getQuote(quoteRequest);
      console.log('Quote:', quote);

      const route = convertQuoteToRoute(quote);
      console.log('Route:', route);

      const executedRoute = await executeRoute(route, {
        updateRouteHook(route) {
          console.log('Updated Route:', route);
        },
      });

      console.log('Executed Route:', executedRoute);
      setExecutionResult(executedRoute);
    } catch (error) {
      console.error('An error occurred:', error);
      setExecutionResult({ error: 'Execution failed. Check console for details.' });
    }
  };

  return (
    <div className="container">
      <h1 className="title">Token Swap</h1>

      <label className="label">From Chain:</label>
      <select
        className="select"
        value={fromChain}
        onChange={(e) => setFromChain(Number(e.target.value))}
      >
        {fromChains.map((chain) => (
          <option key={chain.id} value={chain.id}>
            {chain.name}
          </option>
        ))}
      </select>

      <label className="label">From Token:</label>
      <select
        className="select"
        value={fromToken}
        onChange={(e) => setFromToken(e.target.value)}
      >
        {fromTokens.map((token) => (
          <option key={token.address} value={token.address}>
            {token.name}
          </option>
        ))}
      </select>

      <label className="label">Amount:</label>
      <input
        className="input"
        type="text"
        value={fromAmount}
        onChange={(e) => setFromAmount(e.target.value)}
      />

      <label className="label">From Address:</label>
      <input
        className="input"
        type="text"
        value={fromAddress}
        onChange={(e) => setFromAddress(e.target.value)}
      />

      <button className="button" onClick={handleSwap}>
        Execute Swap
      </button>

      <label className="label">To Chain:</label>
      <p>{toChain.name}</p> {/* Display fixed Gnosis chain */}

      <label className="label">To Token:</label>
      <p>{toToken.name}</p> {/* Display fixed xDAI token */}

      {/* Result Box */}
      {executionResult && (
        <pre className="result-box">{JSON.stringify(executionResult, null, 2)}</pre>
      )}
    </div>
  );
};

export default SwapComponent;
