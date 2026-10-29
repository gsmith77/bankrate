## RFC for Extending the Personalization Service

For years our flagship property was an affiliate-driven site monetized through SEO. As that landscape has shifted, we’ve become a multi-tenant platform: we power financial offerings inside other companies’ products, and our own flagship site is just one tenant among many (internally, “tenant 0”). We want to extebd this service to other tenants in a safe, feature flagging rollout.

## Technologies used:
1. Next.js and Typescript frontend
2. REST API, Typescript, Node.js and SQL databaes.


## Assumptions:
1. Both frontend and backend have LaunchDarkly setup to use feature flags
2. We use a REST. I went with REST for the typescript code.


## Requirements:
1. Tenant cross-pollination is unacceptable.
2. Have an endpoint to get personalization details to whitelabel the UI. `GET /v1/personalize`
3. Have all endpoints grab the new `tenant` request header in the request.headers for querying the database by `tenant` to avoid tenant cross-pollination.
4. Implement backend middleware to decode the JWT and verify that the signed issuer for the JWT is the same as the tenant passed in request headers to prevent a user from curling urls with a different `tenant`request.header to try and get a different expierence and rate quotes. (I have not implemented a node.js backend middleware in the code but this is a requirement in a real app that I would want implemented.).
5. Be able to change styling based on Tenant.
6. These must be configurable by the tenantFeatureFlag:
- Axios request header
- UI Styling
- Backend Middleware
- Backend resolvers
- Backend resolver SQL Queries



## Implementation Details

### Frontend:
1. 
    What: Know the tenant and get back personalization details to correctly whitelabel the site per tenant. 
    How: Fetch `GET /v1/personalize` endpoint on the Homepage => This will be used return the whitelabeling details such as the colors to use for the buttons, navigation bars, the background for all pages, etc. In addition it can return the tenant display name, the tenant's icon that can be at the top left next to the tenant display name, and other things. We set this in our root component to set the personalization details in global state to then be used across the application.

2. 
    What: Get quotes per tenent to display
    How: Fetch `GET /v1/quotes` => Map over the quotes and display them based on the tenant allowing.


### Backend:
1. 
    What: Have an endpoint that returns the personalization details for the frontend to use. Examples: tenant, tenantDisplayName, tenantIcon
    How: Endpoint will query the `peronsonalize` DB table to get these details with a `WHERE tenant = :tenantId` to get tenant specific detais. Throwing an error if we do not get a result which means we do not support this tenant in general, otherwise we retun the personalization details for the frontend to use for styling and UI whitelabeling.

2.  What: Have an endpoint to get quotes per tenant
    How: Endpoint will query the `quotes` with a `WHERE tenant = :tenantId` to get tenant specific quotes. Return the quotes for the frontend to map over them and display "There are no quotes" if there are not quotes for that tenant.


## RFC questions with answers

1. Tenant-aware personalization. How does your service serve both tenant 0 and Switchback users through one coherent code path, while keeping each tenant’s data and configuration separated? Where’s the seam between shared personalization logic and tenant-specific configuration — and why did you put it there?
Response:
    **shared personalization logic**
        1. Global state. We will hold the apiKey, tenant, tenantDisplayName and tenantIcon.
        **Why did I put this here:** These keys (apiKey, tenant, etc.) will be universal and not tenant dependent.
    **tenant-specific configuration**
        1. Styling => `stylesByTenant` will hold the different styling based on screen, ex: for tenant0 on the home screen, the background color will be 'red' and for Switchback the background color will be 'blue'. 
        2. Screen specific data => the endpoints will check the request.header for the `tenant` header to use in the endpoint's sql query `WHERE tenant = :tenantId` to return tenant specific for each page. Ex: the `<Quotes />` page gets quotes specific to a tenant and not quotes that are universal.
        **Why did I put this here:** 
            - Styling => whitelabeling needs to be tenant specific so we need to use the tenant as a key in `stylesByTenant` to only get styles associated with that tenant. 
            - `tenant` request header: this makes sure that we only query data for that tenant and allows the backend to throw errors if we don't have that tenant configured where have the UI display a tenant has not been configured.
    


2. Isolation and data boundaries. Switchback’s exclusive rates must never surface to tenant 0, and their sensitive signals are contractually constrained. How do you make an isolation breach hard to cause by accident, and how would you detect and recover from one quickly if it happened anyway?
    1.  Q: How do you make an tenant isolation breach hard to cause by accident?
        A: By having the tenant url query param be set in the SSO callback url (switchback in this case) or be set in the successful login redirect for tenant0. After having a valid ApiKey (successfully logged in), if the url to get to the authenticated expierence is copied and the tenant url query param is switched from say tenant0 -> switchback or vice versa, we will have a backend middleware that decodes the JWT and verifies that the signed issuer for the JWT is the same as the tenant passed in the request headers. This safeguards from an attacker changing the url query param to another tenant to try and get a different expierence and rate quotes.
    2.  Q: How would you detect and recover from one quickly if it happened anyway?
        A: If they somehow got passed the "JWT middleware tenant verifier", which sounds solid tbh, but if they did, a Datadog alert would emit. We would have this Datadog alert Monitor send a slack message to our #p0-monitoring channel that would ping our team to see how often this is happening and for us to investigate, using RUM how this person was able to switch tenants. For recovering, we would create a `emailsToBlock` DB table and in the same code path that the Datadog alert Monitor log is emitted, we write the person's email that is stored in the JWT to be able to block any JWTs that have that email. When the same attacker requests another endpoint, the "JWT middleware tenant verifier" decodes the JWT and checks the `emailsToBlock` DB table and throws an error if the same email switched tenants. Also in the "JWT middleware tenant verifier" we could regex the email to plus addressing so we can protect against the same email trying to work around the email check. **There could be other ways to handle this that could be better. I'm not saying this is a 100% perfect solution.**

3. Extending, not rewriting. You own an existing, working service. Be concrete about what you’d change in place, what you’d wrap behind an adapter, and what you’d deliberately leave alone — and give a rollout plan that never puts tenant 0’s experience at risk (flags, shadow traffic, staged rollout — your call).
    Answer: Go with Feature flagging to be used on the frontend and backend
    1. **Frontend tenant request header:** By adding the `tenant` as a request header when the FF is ON and not have it when the FF is OFF which can be instantiated as a default header when we use `createAxios` to not add any risk to existing API calls. By passing `tenant` as a request header, we only have to change ONE file in the UI for ALL backend endpoints to now receive the `tenant` request header.
    2. **Backend:** Incrementally having backend resolvers add `WHERE tenant = :tenant` in their SQL Queries when the feature flag is ON.
    3. **Backend Middleware:** When the feature flag is ON we can have the "JWT middleware tenant verifier" middleware be added to the list of middlewares to run on each request.
    4. **Frontend Styling:** Put Whitelabeling styling behind FF. When ON use the `stylesByTenant` to add styling to different parts of the UI.


4. Degraded mode and performance. The service has a p99 latency budget under 200ms and depends on a couple of downstream calls (member/profile data, a pricing/quoting service). What does it return when a dependency is slow or down? Design a fallback that stays safe per tenant — a generic offer is fine; leaking or fabricating a partner-exclusive one is not.
    Answer that is safe per tenant: 
        - If the member/profile data service is down or timesout, we can't connect who is clicking on a quote, this is a blocker, We need to fix that service to not be down or timeout. Showing a "We are experiencing a problem, please try again or check back later." UI error and not showing anything else on the screen.
        - If the pricing/quoting service is down or timesout, we do know who is clicking a quote so we can either show a generic offer, if there is one OR we show "We are experiencing a problem, please try again or check back later." UI error and not showing anything else on the screen.

5. Explainable decisions. For each decision, emit enough structured information that a support engineer (or an AI agent) could later answer “why did this user get / not get this offer?” from the record alone. Tell us where it lands and how long you’d keep it. -> **Did not get to this**


Bring your Squad along:

You wouldn’t build this alone. Assume you have a mid-level engineer and an associate engineer on it with you for the next few sprints. Briefly: how would you split this work, what would you keep versus delegate and why, where are the risky parts you’d want to review closely, and how would you set the two of them up to succeed (and grow) rather than just handing out tickets?

Delegation:
- Have mid-eng do a spike if there is a better option than addigg `tenant` as a request.header simple backend resolver feature flagging. Create a ticket and write a TDD with a different way to handle this if he/she came up with one.
- Have mid-eng do a spike/implementation POC how to do white labeling per tenant and not affect the current tenant and show one UI area demoing this.
- Have associate finish all the other places to implement the white labeling styling after the mid-eng creates the POC/demo.
- Have associate/mid-eng update backend resolvers to use new `tenant` request.header in SQL Queries, conditionally if the FF is ON.
- Have mid-eng implement the "JWT middleware tenant verifier" middleware
- Have mid-eng or myself implement the Datadog alert Monitor for if someone did get successfully access another tenant.
- Ran out of time: there could be more things to delegate, have myself do and monitor myself.