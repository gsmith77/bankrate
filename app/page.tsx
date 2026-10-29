'use client'

import Image from 'next/image';
import { useEffect, useState } from 'react';

import Quotes from './Quotes'

const SWITCHBACK_TENANT = 'switchback'

type GlobalState = {
  apiKey: string;
  tenant: string;
  backgroundColor: string;
  tenantDisplayName: string;
  tenantIcon: string;
  stylesByTenant: {
    [key as string]: {
      [key as string]: {
        backgroundColor: string;
      }
    }
  }
}

export const globalState: GlobalState = {
  apiKey: 'qw90ulkfaslkjdf983r',
  tenant: SWITCHBACK_TENANT,
  backgroundColor: '#000',
  tenantDisplayName: 'Switchback',
  tenantIcon: 'Briefcase',
  stylesByTenant: {
    tenant0: {
      home: {
        backgroundColor: 'red'
      }
    },
    [SWITCHBACK_TENANT]: {
      home: {
        backgroundColor: 'blue'
      }
    }
  }
}

export function setGlobalState(state: GlobalState) {
  Object.keys(state).forEach((key: string) => {
    globalState[`${key}`] = state[key]
  })
}

// Node.js backend resolver code to handle fetchPersonalizationAppDetails query
function handlePersonalizationByTenant(request) {
  // baseurl/v1/personalize
  const { tenant } = request.params;
  // This will allow for us to get the quotes by tenant and allow for creating rates 
  // by tenant without quotes ever bleeding into other tenant's quotes response.
  const [personalizationDetails] = `SELECT * FROM personalize WHERE tenant = ${tenant}`;

  if (!personalizationDetails) {
    throw new Error("Tenant has not been configured")
  }

  return { data: personalizationDetails };
}

// This would be the Next.js built-in function to get the tenant
// out of the callback url we specify when calling the SSO or require to be sent
function useParams() {
  if (Math.random() > 0.5) {
    return { tenant: 'tenant0' }
  }
  return { tenant: SWITCHBACK_TENANT }
}

export default function Home() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [tenantNotConfigured, setTenantNotConfigured] = useState(false);

  const styles = globalState.tenant ? globalState.stylesByTenant[globalState.tenant] : {}

  useEffect(() => {
    async function fetchPersonalizationAppDetails() {
      setLoading(true)
      setTenantNotConfigured(false);
      try {
        const {
          // hardcoding until endpoint is configured
          data = {
            tenant: SWITCHBACK_TENANT, tenantDisplayName: SWITCHBACK_TENANT, tenantIcon: 'Briefcase'
          }
        } = fetch(`baseurl/v1/personalize/${params.tenant}`, {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${globalState.apiKey}`
          }
        })
        const { tenant, tenantDisplayName, tenantIcon } = data
        setGlobalState({ tenant, tenantDisplayName, tenantIcon })
      } catch (err) {
        if (err.message.includes("Tenant has not been configured"))
          console.error(err.message)
      }
      finally {
        setLoading(false);
      }
    }
    fetchPersonalizationAppDetails();
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!tenantNotConfigured) {
    return <div>Tenant has not been configured. Please come back once it has</div>
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-12" style={{ backgroundColor: styles?.home?.backgroundColor }}>
      <div>Tenant: {globalState.tenantDisplayName}</div>
      <Quotes />
    </main>
  );
}
