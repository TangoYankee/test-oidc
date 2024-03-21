import express from "express";
import cors from "cors";
import msal from "@azure/msal-node";
import "dotenv/config";

const app = express();
const port = 5500;

app.use(cors());

app.get('/', async (_req: express.Request, res: express.Response) => {
    const graphBaseUrl = "https://graph.microsoft.com";
    const clientId = process.env.SHAREPOINT_CLIENT_ID;
    const clientSecret = process.env.SHAREPOINT_CLIENT_SECRET;
    const tenantId = process.env.SHAREPOINT_TENANT_ID;
    const siteName = process.env.SHAREPOINT_SITE_NAME;
    const siteId = process.env.SHAREPOINT_SITE_ID;
    if(clientId === undefined || clientSecret === undefined || tenantId === undefined || siteName === undefined || siteId === undefined) throw new Error("Missing configuration")
    const sharepointSiteUrl = `${graphBaseUrl}/v1.0/sites/${siteId}`;
    const msalConfig = {
       auth: {
        clientId,
        clientSecret,
        authority: `https://login.microsoftonline.com/${tenantId}`
       } 
    }
    const cca = new msal.ConfidentialClientApplication(msalConfig);
    const result = await cca.acquireTokenByClientCredential({
        scopes: [`${graphBaseUrl}/.default`]
    })

    if(result === null) throw new Error("token result is null");
    const { accessToken } = result;
    const options = {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            Accept: 'application/json'
        }
    }

    try {
        const url = sharepointSiteUrl;
        const response = await fetch(url, options);
        const siteDetails = await response.json() as {};
        console.debug("site details", siteDetails);
    } catch {
        const message = {
            status: "error getting site details"
        }
        res.send(JSON.stringify(message));
    }

    // try {
    //     const url = `${sharepointSiteUrl}/lists`
    //     const response = await fetch(url, options);
    //     const listDetails = await response.json() as {};
    //     console.debug("list details", listDetails);
    // } catch {
    //     const message = {
    //         status: "error getting list details"
    //     }
    //     res.send(JSON.stringify(message));
    // }

    try {
        const url = `${sharepointSiteUrl}/lists?$filter=displayName eq 'Project'&$select=id`
        const response = await fetch(url, options);
        const projectIds = await response.json() as { value: Array<{id: string}>}
        console.debug("list project", projectIds.value[0].id)
        res.send({projectId: projectIds.value[0].id});
    } catch {
        const message = {
            status: "error getting list with project"
        }
        res.send(JSON.stringify(message));
    }
})

app.listen(port, () => {
    console.info(`listening on port: ${port}`);
})
