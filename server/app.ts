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
    if(clientId === undefined || clientSecret === undefined || tenantId === undefined) throw new Error("Missing configuration")
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
    const url = `https://graph.microsoft.com/v1.0/sites/${process.env.SHAREPOINT_TARGET_HOST}`
    const options = {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            Accept: 'application/json'
        }
    }
    const siteDetails = await fetch(url, options);
    console.debug("siteDetails", siteDetails);
    try {
        const message = {
            status: "verified"
        }
        
        res.send(JSON.stringify(message));
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
