'use client';

import { useState, useEffect } from 'react';
import { createConfig, EVM, getRoutes, convertQuoteToRoute, executeRoute, RouteExtended } from '@lifi/sdk';
import { createWalletClient, getAccount, http } from 'viem';
import { arbitrum, mainnet, optimism, polygon, scroll, Chain } from 'viem/chains';
import './SwapComponent.css';

declare global {
  interface Window {
    ethereum: any;
  }
}


const SwapComponent = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [fromChain, setFromChain] = useState(1); // Default: Ethereum
  const [fromToken, setFromToken] = useState('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'); // Default: WETH
  const [fromAmount, setFromAmount] = useState('10000000'); // Default: 10 USDC
  const [executionResult, setExecutionResult] = useState<RouteExtended | { error: string } | null>(null);

  useEffect(() => {
    if (walletAddress) {
      const client = createWalletClient({
        account: { address: walletAddress }, // Ensure walletAddress is used correctly
        chain: mainnet, // Use the appropriate chain
        transport: http(),
      });
  
      createConfig({
        integrator: 'Swarm',
        providers: [
          EVM({
            getWalletClient: async () => client,
            switchChain: async (chainId) => {
              const newClient = createWalletClient({
                account: { address: walletAddress }, // Pass the wallet address here too
                chain: [arbitrum, mainnet, optimism, polygon, scroll].find((chain) => chain.id === chainId) as Chain,
                transport: http(),
              });
              return newClient;
            },
          }),
        ],
      });
    }
  }, [walletAddress]);

  // MetaMask connection logic using viem
  const connectWallet = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        // Request accounts from MetaMask
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  
        // Use the first account returned by MetaMask ??
        setWalletAddress(accounts[0]);
        console.log('Connected Wallet Address:', accounts[0]);
      } catch (error) {
        console.error('Error connecting to wallet:', error);
      }
    } else {
      console.log('MetaMask is not installed.');
    }
  };
  
  

  const handleSwap = async () => {
    try {
      const settings = {
        fromChainId: fromChain,
        toChainId: 10,
        fromTokenAddress: fromToken,
        toTokenAddress: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', // DAI
        fromAmount,
        fromAddress: walletAddress,
      };

      const result = await getRoutes(settings);
      console.log('Results:', result);

      console.log('Results:', result);

      // Execute the swap (optional, commented out)
      const route = result.routes[0];
      const executedRoute = await executeRoute(route, {
        // Gets called once the route object gets new updates
        updateRouteHook(route) {
          console.log(route)
        },
      });
      setExecutionResult(executedRoute);

    } catch (error) {
      console.error('An error occurred:', error);
      setExecutionResult({ error: 'Execution failed. Check console for details.' });
    }
  };

  return (
    <div className="container">
      <h1 className="title">Token Swap</h1>

      {/* Wallet Connection */}
      <button onClick={connectWallet} className="button">
        {walletAddress ? `Connected: ${walletAddress}` : 'Connect Wallet'}
      </button>

      <label className="label">From Chain:</label>
      <select
        className="select"
        value={fromChain}
        onChange={(e) => setFromChain(Number(e.target.value))}
      >
        <option value="1">Ethereum</option>
        <option value="42161">Arbitrum</option>
        <option value="10">Optimism</option>
        <option value="8453">Base</option>
        <option value="42220">Celo</option>
      </select>

      <label className="label">From Token:</label>
      <select
        className="select"
        value={fromToken}
        onChange={(e) => setFromToken(e.target.value)}
      >
        <option value="0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2">WETH</option>
        <option value="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48">USDC</option>
        <option value="0xdAC17F958D2ee523a2206206994597C13D831ec7">USDT</option>
        <option value="0x6B175474E89094C44Da98b954EedeAC495271d0F">DAI</option>
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
        value={walletAddress}
        disabled
      />

      <button className="button" onClick={handleSwap}>
        Execute Swap
      </button>

      {/* Result Box */}
      {executionResult && (
        <pre className="result-box">{JSON.stringify(executionResult, null, 2)}</pre>
      )}
    </div>
  );
};

export default SwapComponent;
