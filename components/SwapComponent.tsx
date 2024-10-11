'use client';

import React, { useState, useEffect } from 'react';
import { createConfig, EVM, getRoutes, convertQuoteToRoute, executeRoute, RouteExtended } from '@lifi/sdk';
import { createWalletClient, http, custom, WalletClient } from 'viem';
import { arbitrum, mainnet, optimism, base, gnosis, Chain } from 'viem/chains';
import './SwapComponent.css';
import { tokenAddresses } from './utils/tokenAddresses'; 

declare global {
  interface Window {
    ethereum: any;
  }
}

const SwapComponent: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [selectedChainId, setSelectedChainId] = useState(1); // Default: Ethereum
  const [fromToken, setFromToken] = useState('');
  const [fromAmount, setFromAmount] = useState('10'); // Default: 10 tokens
  const [executionResult, setExecutionResult] = useState<RouteExtended | { error: string } | null>(null);

  useEffect(() => {
    if (walletAddress) {
      initializeWalletClient();
    }
  }, [walletAddress]);

  useEffect(() => {
    // Set default token when chain changes
    if (tokenAddresses[selectedChainId]) {
      setFromToken(tokenAddresses[selectedChainId].WETH.address);
    }
  }, [selectedChainId]);

  const initializeWalletClient = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const client = createWalletClient({
        account: walletAddress as `0x${string}`,
        chain: mainnet,
        transport: custom(window.ethereum)
      });
      setWalletClient(client);

      createConfig({
        integrator: 'Swarm',
        providers: [
          EVM({
            getWalletClient: async () => client,
            switchChain: async (chainId) => {
              const chainMap = { 1: mainnet, 42161: arbitrum, 10: optimism, 8453: base, 100: gnosis };
              const newChain = chainMap[chainId as keyof typeof chainMap] || mainnet;
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${chainId.toString(16)}` }],
              });
              const newClient = createWalletClient({
                account: walletAddress as `0x${string}`,
                chain: newChain,
                transport: custom(window.ethereum)
              });
              setWalletClient(newClient);
              return newClient;
            },
          }),
        ],
      });
    }
  };

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
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
    if (!walletClient) {
      console.error('Wallet client not initialized');
      return;
    }

    try {
      // Find the selected token's decimals
      const selectedToken = Object.values(tokenAddresses[selectedChainId]).find(
        token => token.address === fromToken
      );

      if (!selectedToken) {
        throw new Error('Selected token not found');
      }

      // Calculate the amount with decimals
      const amountWithDecimals = (Number(fromAmount) * 10 ** selectedToken.decimals).toString();

      const settings = {
        fromChainId: selectedChainId,
        toChainId: 100, // Default to Gnosis
        fromTokenAddress: fromToken,
        toTokenAddress: '0xdbf3ea6f5bee45c02255b2c26a16f300502f68da', // xBZZ on Gnosis
        fromAmount: amountWithDecimals,
        fromAddress: walletAddress,
      };

      const result = await getRoutes(settings);

      if (result.routes && result.routes.length > 0) {
        const route = result.routes[0];

        const executedRoute = await executeRoute(route, {
          updateRouteHook: (updatedRoute) => {
            console.log('Updated Route:', updatedRoute);
          },
        });

        console.log('Executed Route:', executedRoute);
        setExecutionResult(executedRoute);
      } else {
        console.error('No routes available');
        setExecutionResult({ error: 'No routes available' });
      }
    } catch (error) {
      console.error('An error occurred:', error);
      setExecutionResult({ error: 'Execution failed. Check console for details.' });
    }
  };

  return (
    <div className="container">
      <h1 className="title">Token Swap</h1>

      <button onClick={connectWallet} className="button">
        {walletAddress ? `Connected: ${walletAddress}` : 'Connect Wallet'}
      </button>

      <label className="label">From Chain:</label>
      <select
        className="select"
        value={selectedChainId}
        onChange={(e) => setSelectedChainId(Number(e.target.value))}
      >
        {Object.entries(tokenAddresses).map(([chainId, chainData]) => (
          <option key={chainId} value={chainId}>
            {chainData.name}
          </option>
        ))}
      </select>

      <label className="label">From Token:</label>
      <select
        className="select"
        value={fromToken}
        onChange={(e) => setFromToken(e.target.value)}
      >
        {Object.entries(tokenAddresses[selectedChainId]).map(([tokenSymbol, tokenData]) => {
          if (tokenSymbol !== 'name') {
            return (
              <option key={tokenSymbol} value={tokenData.address}>
                {tokenSymbol}
              </option>
            );
          }
          return null;
        })}
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

      {executionResult && (
        <pre className="result-box">{JSON.stringify(executionResult, null, 2)}</pre>
      )}
    </div>
  );
};

export default SwapComponent;