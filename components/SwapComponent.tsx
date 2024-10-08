"use client";

// try https://github.com/lifinance/sdk/blob/main/examples/node/examples/polynomialDeposit.ts
// Can also use direct API https://docs.li.fi/li.fi-api/li.fi-api/requesting-a-quote/cross-chain-contract-calls


import { useEffect, useState } from 'react';
import { getRoutes, RoutesRequest } from '@lifi/sdk';

const HomePage: React.FC = () => {
  const [routes, setRoutes] = useState<any[]>([]);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const routesRequest: RoutesRequest = {
          fromChainId: 42161, // Arbitrum
          toChainId: 10, // Optimism
          fromTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC on Arbitrum
          toTokenAddress: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', // DAI on Optimism
          fromAmount: '10000000', // 10 USDC
        };

        const result = await getRoutes(routesRequest);
        const fetchedRoutes = result.routes;

        console.log('Fetched Routes:', fetchedRoutes);
        setRoutes(fetchedRoutes);
      } catch (error) {
        console.error('Error fetching routes:', error);
      }
    };

    fetchRoutes();
  }, []);

  return (
    <div>
      <h1>Routes Information</h1>
      <div>
        {routes.length === 0 ? (
          <p>Loading routes...</p>
        ) : (
          <pre>{JSON.stringify(routes, null, 2)}</pre>
        )}
      </div>
    </div>
  );
};

export default HomePage;