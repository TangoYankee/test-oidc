import express from "express";
import cors from "cors";
import msal from "@azure/msal-node";
import "dotenv/config";

const app = express();
const port = 5500;

app.use(cors());

app.get('/', async (_req: express.Request, res: express.Response) => {
    const clientId = process.env.SHAREPOINT_CLIENT_ID;
    const clientSecret = process.env.SHAREPOINT_CLIENT_SECRET;
    const tenantId = process.env.SHAREPOINT_TENANT_ID;
    const siteName = process.env.SHAREPOINT_SITE_NAME;
    const siteId = process.env.SHAREPOINT_SITE_ID;
    if(clientId === undefined || clientSecret === undefined || tenantId === undefined || siteName === undefined || siteId === undefined) throw new Error("Missing configuration")
    const msalConfig = {
       auth: {
        clientId,
        clientSecret,
        authority: `https://login.microsoftonline.com/${tenantId}`
       } 
    }
    const cca = new msal.ConfidentialClientApplication(msalConfig);
    const result = await cca.acquireTokenByClientCredential({
        scopes: ["https://graph.microsoft.com/.default"]
    })
    // console.debug("result", result);
    // console.debug("clientId", clientId);
    // console.debug("clientSecret", clientSecret);
    // console.debug("tenantId", tenantId);
    if(result === null) throw new Error("token result is null");
    const { accessToken } = result;
    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}`
    const options = {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            Accept: 'application/json'
        }
    }

    try {
        // const sitesUrl = `https://graph.microsoft.com/v1.0/sites?search=${siteName}&$select=id`
        const sitesUrl = `https://graph.microsoft.com/v1.0/sites`
        const sitesSearchResponse = await fetch(sitesUrl, options)
        const sitesSearchDetails = await sitesSearchResponse.json() as {}
        console.debug("sitesSearchDetails", sitesSearchDetails)
    } catch {
        throw new Error("unable to fetch site ids");
    }
    try {
        console.debug("site url", url);
        const response = await fetch(url, options);
        console.debug("sites response", response);
        const siteDetails = await response.json() as {};
        console.debug("siteDetails", siteDetails);
        const message = {
            status: "verified"
        }
        
        res.json({accessToken, ...siteDetails})
    } catch {
        const message = {
            status: "error"
        }
        res.send(JSON.stringify(message));
    }
})

app.listen(port, () => {
    console.info(`listening on port: ${port}`);
})
