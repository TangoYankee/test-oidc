import * as oauth from "oauth4webapi";
import { useEffect, useState } from "react";

const issuer = new URL(process.env.REACT_APP_ISSUER_URL as string);
const clientId = process.env.REACT_APP_CLIENT_ID as string;
const clientSecret = process.env.REACT_APP_CLIENT_SECRET as string;
const redirectUri = `${process.env.REACT_APP_HOST}/redirect`

export function Auth () {
    const [details, setDetails] = useState<{guid: string} | null>(null);
    const [loginPath, setLoginPath] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const storedAccessToken = window.localStorage.getItem("testOidcAccessToken");
            const storedSub = window.localStorage.getItem("testOidcSub");
            const storedCodeVerifier = window.localStorage.getItem("testOidcCodeVerifier");
            const codeVerifier = storedCodeVerifier !== null ? storedCodeVerifier :  oauth.generateRandomCodeVerifier();
            window.localStorage.setItem("testOidcCodeVerifier", codeVerifier);
            const as = await oauth.discoveryRequest(issuer).then((response) => oauth.processDiscoveryResponse(issuer, response))
            if (as.code_challenge_methods_supported?.includes('S256') !== true) {
                throw new Error();
            }

            const client: oauth.Client = {
                client_id: clientId,
                client_secret: clientSecret,
                token_endpoint_auth_method: 'client_secret_basic'
            }

            const { pathname } = window.location;
            if(storedAccessToken === null) {

                const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);
                const codeChallengeMethod ='S256';
                window.localStorage.setItem("testOidcCodeVerifier", codeVerifier);
                const authUrl = new URL(as.authorization_endpoint!);

                authUrl.searchParams.set('client_id', client.client_id);
                authUrl.searchParams.set('code_challenge', codeChallenge);
                authUrl.searchParams.set('code_challenge_method', codeChallengeMethod);
                authUrl.searchParams.set('redirect_uri', redirectUri);
                authUrl.searchParams.set('response_type', 'code');
                authUrl.searchParams.set('scope', 'openid email');
                setLoginPath(authUrl.href);
            }


            if (pathname.includes('redirect') && storedAccessToken === null) {
                const currentUrl = new URL(window.location.href);
                const params = oauth.validateAuthResponse(as, client, currentUrl, oauth.expectNoState)
                if (oauth.isOAuth2Error(params)) throw new Error("OAuth 2.0")

                const response = await oauth.authorizationCodeGrantRequest(
                    as,
                    client,
                    params,
                    redirectUri,
                    codeVerifier,
                )

                const challenges = oauth.parseWwwAuthenticateChallenges(response);
                if(challenges !== undefined) {
                    for (const challenge of challenges) {
                        console.info('challenge', challenge);
                    }

                    throw new Error();
                }

                const result = await oauth.processAuthorizationCodeOpenIDResponse(as, client, response);
                if(oauth.isOAuth2Error(result)) {
                    console.error('error', result);
                    throw new Error();
                }

                const { access_token: accessToken } = result;
                const claims = oauth.getValidatedIdTokenClaims(result);
                const { sub } = claims;
                window.localStorage.setItem("testOidcAccessToken", accessToken);
                window.localStorage.setItem("testOidcSub", sub);
            }
            if(storedAccessToken !== null && storedSub !== null) {

                const userInfoResponse = await oauth.userInfoRequest(as, client, storedAccessToken);

                const userChallenges = oauth.parseWwwAuthenticateChallenges(userInfoResponse);
                if (userChallenges !== undefined) {
                    for (const challenge of userChallenges) {
                    console.info('challenge', challenge)
                    }
                    throw new Error() // Handle www-authenticate challenges as needed
                }


                const userInfoResult = await oauth.processUserInfoResponse(as, client, storedSub, userInfoResponse);
                console.debug(userInfoResult)
            }
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
