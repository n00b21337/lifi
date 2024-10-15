"use client";

import React, { useState, useEffect } from "react";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useWalletClient,
  useSwitchChain,
} from "wagmi";
import {
  createConfig,
  EVM,
  getRoutes,
  executeRoute,
  RouteExtended,
} from "@lifi/sdk";
import { tokenAddresses } from "./tokenAddresses";
import styles from "./SwapComponent.module.css";

const SwapComponent: React.FC = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [selectedChainId, setSelectedChainId] = useState(1);
  const [fromToken, setFromToken] = useState("");
  const [fromAmount, setFromAmount] = useState("10");
  const [executionResult, setExecutionResult] = useState<
    RouteExtended | { error: string } | null
  >(null);
  const [lifiConfigInitialized, setLifiConfigInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [isClientConnected, setIsClientConnected] = useState(false);

  useEffect(() => {
    setShowAddress(true);
    setIsClientConnected(isConnected);
  }, [isConnected]);

  useEffect(() => {
    if (chainId) {
      setSelectedChainId(chainId);
    }
  }, [chainId]);

  useEffect(() => {
    if ((tokenAddresses as any)[selectedChainId]) {
      setFromToken((tokenAddresses as any)[selectedChainId].WETH.address);
    }
  }, [selectedChainId]);

  useEffect(() => {
    if (isConnected && publicClient && walletClient && !lifiConfigInitialized) {
      initializeLiFi();
    }
  }, [isConnected, publicClient, walletClient, lifiConfigInitialized]);

  const initializeLiFi = () => {
    createConfig({
      integrator: "Swarm",
      providers: [
        EVM({
          getProvider: async () => publicClient,
          getWalletClient: async () => walletClient,
          switchChain: async (chainId) => {
            if (switchChain) {
              await switchChain({ chainId });
            }
            return walletClient;
          },
        }),
      ],
    });
    setLifiConfigInitialized(true);
  };

  const handleSwap = async () => {
    if (!isConnected || !address || !publicClient || !walletClient) {
      console.error("Wallet not connected or clients not available");
      return;
    }

    setIsLoading(true);
    try {
      const selectedToken = Object.values(
        (tokenAddresses as any)[selectedChainId]
      ).find((token: any) => token.address === fromToken);

      if (!selectedToken) {
        throw new Error("Selected token not found");
      }

      const amountWithDecimals = (
        Number(fromAmount) *
        10 ** selectedToken.decimals
      ).toString();

      const settings = {
        fromChainId: selectedChainId,
        toChainId: 100,
        fromTokenAddress: fromToken,
        toTokenAddress: "0xdbf3ea6f5bee45c02255b2c26a16f300502f68da",
        fromAmount: amountWithDecimals,
        fromAddress: address,
      };

      const result = await getRoutes(settings);

      if (result.routes && result.routes.length > 0) {
        const route = result.routes[0];

        const executedRoute = await executeRoute(route, {
          updateRouteHook: (updatedRoute) => {
            console.log("Updated Route:", updatedRoute);
          },
        });

        console.log("Executed Route:", executedRoute);
        setExecutionResult(executedRoute);
      } else {
        console.error("No routes available");
        setExecutionResult({ error: "No routes available" });
      }
    } catch (error) {
      console.error("An error occurred:", error);
      setExecutionResult({
        error: "Execution failed. Check console for details.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Token Swap</h1>

      <p className={styles.address}>
        Connected Address:{" "}
        {showAddress ? address || "Not connected" : "Loading..."}
      </p>

      <div className={styles.inputGroup}>
        <label className={styles.label}>From Chain:</label>
        <select
          className={styles.select}
          value={selectedChainId}
          onChange={(e) => {
            const newChainId = Number(e.target.value);
            setSelectedChainId(newChainId);
            switchChain?.({ chainId: newChainId });
          }}
        >
          {Object.entries(tokenAddresses).map(([chainId, chainData]) => (
            <option key={chainId} value={chainId}>
              {chainData.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>From Token:</label>
        <select
          className={styles.select}
          value={fromToken}
          onChange={(e) => setFromToken(e.target.value)}
        >
          {Object.entries((tokenAddresses as any)[selectedChainId]).map(
            ([tokenSymbol, tokenData]: [string, any]) => {
              if (tokenSymbol !== "name" && typeof tokenData === "object") {
                return (
                  <option key={tokenSymbol} value={tokenData.address}>
                    {tokenSymbol}
                  </option>
                );
              }
              return null;
            }
          )}
        </select>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>Amount:</label>
        <input
          className={styles.input}
          type="text"
          value={fromAmount}
          onChange={(e) => setFromAmount(e.target.value)}
        />
      </div>

      <button
        className={styles.button}
        onClick={handleSwap}
        disabled={!isClientConnected || isLoading}
      >
        {isLoading ? <div>Loading...</div> : "Execute Swap"}
      </button>
      {executionResult && (
        <pre className={styles.resultBox}>
          {JSON.stringify(executionResult, null, 2)}
        </pre>
      )}

      <pre className={styles.noticeBox}>
        * All tokens will be converted to xBZZ on Gnosis Chain by default.{" "}
      </pre>
      <pre className={styles.noticeBox}>
        * If messaged "no routes available", this usually means there is not
        enough liquidity for the swap, need to try lower amount
      </pre>

      {isLoading && (
        <div className={styles.overlay}>
          <div className={styles.spinner}></div>
        </div>
      )}
    </div>
  );
};

export default SwapComponent;
