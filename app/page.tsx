'use client'

import Image from 'next/image';
import { useEffect, useState } from 'react';

import Quotes from './Quotes'

type GlobalState = {
  apiKey: string;
  tenant: string;
  backgroundColor: string;
  tenantDisplayName: string;
  tenantIcon: string;
}

export const globalState: GlobalState = {
  apiKey: 'qw90ulkfaslkjdf983r',
  tenant: 'tenant0',
  backgroundColor: '#000',
  tenantDisplayName: 'Tenant 0',
  tenantIcon: 'Briefcase'
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
  return { data: personalizationDetails };
}

// This would be the Next.js built-in function to get the tenant
// out of the callback url we specify when calling the SSO or require to be sent
function useParams() {
  if (Math.random() > 0.5) {
    return { tenant: 'tenant0' }
  }
  return { tenant: 'swtichback' }
}

export default function Home() {
  const params = useParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchPersonalizationAppDetails() {
      setLoading(true)
      try {
        const { data } = fetch(`baseurl/v1/personalize/${params.tenant}`, {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${globalState.apiKey}`
          }
        })
        const { tenant, backgroundColor, tenantDisplayName, tenantIcon } = data
        setGlobalState({ tenant, backgroundColor, tenantDisplayName, tenantIcon })
      } catch (err) {
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

  return (
    <main className="flex min-h-screen flex-col items-center p-12">
      <div>Tenant: {globalState.tenantDisplayName}</div>
      <Quotes />
    </main>
  );
}
