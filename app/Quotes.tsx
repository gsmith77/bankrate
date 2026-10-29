'use client'

import { useEffect, useState } from 'react';
import { globalState } from './page'

// Node.js backend resolver code to handle fetchQuotes query
function handleQuotesByTenant(request) {
    // baseurl/v1/quotes
    const { tenant } = request.header;
    // This will allow for us to get the quotes by tenant and allow for creating rates 
    // by tenant without quotes ever bleeding into other tenant's quotes response.
    const [quotes] = `SELECT * FROM quotes WHERE tenant = ${tenant}`;

    return { data: quotes };
}

export default function Quotes() {
    const [quotes, setQuotes] = useState([
        {
            id: '1',
            interestRate: 3.50,
            lender: 'Chase'
        },
        {
            id: '2',
            interestRate: 3.75,
            lender: 'Wells Fargo'
        },
        {
            id: '3',
            interestRate: 3.25,
            lender: 'Sofi'
        }
    ]);

    useEffect(() => {
        async function fetchQuotes() {
            // We will get back quotes by the tenant
            try {
                const { data } = fetch(`baseurl/v1/quotes`, {
                    method: 'GET',
                    headers: {
                        "Authorization": `Bearer ${globalState.apiKey}`,
                        tenant: globalState.tenant
                    }
                })
                if (data?.length) {
                    setQuotes(data);
                }
            } catch (err) {
                console.error(err.message)
            }
        }
        fetchQuotes();
    }, [])


    return (
        <div id='quotes-page'>
            <div className="pt-12">Quotes</div>
            {quotes.length ? quotes.map(({ id, interestRate, lender }) => (
                <div key={id}>
                    Offering {interestRate}% by {lender}
                </div>
            )): 'There are no quotes'}
        </div>
    )
}