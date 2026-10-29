# Shape of the service Understandings
1. The React frontend will send the tenant, the bearer token that is stored in global state, and the page we are wanting (ex: 'Homepage', 'Account Details').
2. The Typescript Node.js backend will being return
3. The React Frontend will receive 




# Functional Prototype Understandings
1. `POST /v1/personalize` => This can be used to return the whitelabeling details such as the colors to use for the buttons, navigation bars, the background for all pages, etc. In addition it can return the tenant display name, the tenant's icon that can be at the top left next to the tenant display name, and other things. => This will be called on the HomePage to get 


## Implementation Details

### Frontend
1. What: Know the tenant and get back personalization details to correctly whitelabel the site per tenant. How: Fetch `POST /v1/personalize` endpoint on the Homepage => This will be used return the whitelabeling details such as the colors to use for the buttons, navigation bars, the background for all pages, etc. In addition it can return the tenant display name, the tenant's icon that can be at the top left next to the tenant display name, and other things. We set this in our root component to set the personalization details in global state to then be used across the application.