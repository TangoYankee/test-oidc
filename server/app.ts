import express from "express";
import cors from "cors";
import "dotenv/config";
import jsonwebtoken from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";

const jwtVerifyEndpoint =`${process.env.ISSUER_URL}/.well-known/jwks.json`

const app = express();
const port = 5500;

app.use(cors());

app.get('/', async (req: express.Request, res: express.Response) => {
    try {
        const response  = await fetch(jwtVerifyEndpoint);
        const content = await response.json();

        // @ts-ignore
        const key  = content.keys[0];
        
        const headers = req.headers;
        const authorization = headers.authorization;
        const [_, accessToken ] = authorization !== undefined ? authorization?.split(" ") : [];
        
        const verify = jsonwebtoken.verify(accessToken, jwkToPem(key), {
            algorithms: [key.alg],
            audience: `http://localhost:${port}`
        });
        
        console.info(verify);

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
