import * as oauth from "oauth4webapi";
import { useEffect, useState } from "react";

const issuer = new URL(process.env.REACT_APP_ISSUER_URL as string);
const clientId = process.env.REACT_APP_CLIENT_ID as string;
const redirectUrl = `${process.env.REACT_APP_HOST}/redirect`

export function Auth () {
    const [details, setDetails] = useState<{guid: string} | null>(null);
    const [loginPath, setLoginPath] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const as = await oauth.discoveryRequest(issuer).then((response) => oauth.processDiscoveryResponse(issuer, response))
            if (as.code_challenge_methods_supported?.includes('S256') !== true) {
                throw new Error();
            }
            const codeVerifier = oauth.generateRandomCodeVerifier();
            const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);
            const codeChallengeMethod = 'S256'

            const authUrl = new URL(as.authorization_endpoint!);
            const client: oauth.Client = {
                client_id: clientId,
                token_endpoint_auth_method: 'none'
            }

            authUrl.searchParams.set('client_id', client.client_id);
            authUrl.searchParams.set('code_challenge', codeChallenge);
            authUrl.searchParams.set('code_challenge_method', codeChallengeMethod);
            authUrl.searchParams.set('redirect_uri', redirectUrl);
            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('scope', 'openid email');
            setLoginPath(authUrl.href);

            console.debug(authUrl);
        })();
    }, [])

    const signIn = () => setDetails({ guid: "12345"});
    const signOut = () => setDetails(null);
    return <div>
        <h1>
            Auth
        </h1>
        <div>
            {
                details === null ?
                <>
                    <button onClick={signIn}>Sign In</button>
                    {loginPath !== null && <a href={loginPath}>login</a>} 
                </> :
                <>
                    <button onClick={signOut}>Sign Out</button>
                    <p>{details.guid}</p>
                </>
            }
        </div>
    </div>
}
