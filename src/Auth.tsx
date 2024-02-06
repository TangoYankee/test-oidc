import * as oauth from "oauth4webapi";
import { useEffect, useState } from "react";

const issuer = new URL(process.env.REACT_APP_ISSUER_URL as string);
const clientId = process.env.REACT_APP_CLIENT_ID as string;
const redirectUri = `${process.env.REACT_APP_HOST}/redirect`

export function Auth () {
    const [loginPath, setLoginPath] = useState<string | null>(null);
    const [userInfo, setUserInfo] = useState<oauth.UserInfoResponse | null>(null);
    const [shouldSignOut, setShouldSignOut] = useState(false);

    useEffect(() => {
        (async () => {
            const storedResultRaw = window.localStorage.getItem("testOidcResult");
            const storedResult: oauth.OpenIDTokenEndpointResponse | null  = storedResultRaw === null ? storedResultRaw : JSON.parse(storedResultRaw);
            const storedClaimsRaw = window.localStorage.getItem("testOidcClaims");
            const storedClaims: oauth.IDToken | null = storedClaimsRaw === null ? storedClaimsRaw : JSON.parse(storedClaimsRaw);
            const storedCodeVerifier = window.localStorage.getItem("testOidcCodeVerifier");
            const codeVerifier = storedCodeVerifier !== null ? storedCodeVerifier :  oauth.generateRandomCodeVerifier();
            window.localStorage.setItem("testOidcCodeVerifier", codeVerifier);

            const as = await oauth.discoveryRequest(issuer).then((response) => oauth.processDiscoveryResponse(issuer, response))
            if (as.code_challenge_methods_supported?.includes('S256') !== true) {
                throw new Error();
            }

            const client: oauth.Client = {
                client_id: clientId,
                token_endpoint_auth_method: 'none'
            }

            if(shouldSignOut && storedResult !== null) {
                console.debug("is signing out");
                setShouldSignOut(false);
                setUserInfo(null);
                try{
                    await oauth.revocationRequest(as, client, storedResult.access_token);
                    window.localStorage.removeItem("testOidcResult");
                    window.localStorage.removeItem("testOidcClaims");
                    window.localStorage.removeItem("testOidcCodeVerifier");

                    window.location.assign('/');
                } catch (e){
                    console.error("revocation error", e)
                }
            } else {
                const { pathname } = window.location;
                if(storedResult === null && loginPath === null) {
                    console.debug("logged out and needs login path");

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

                if (pathname.includes('redirect') && storedResult === null) {
                    console.info("is logged out but has access to auth code that could log them in");

                    const currentUrl = new URL(window.location.href);
                    const params = oauth.validateAuthResponse(as, client, currentUrl, oauth.expectNoState)
                    if (oauth.isOAuth2Error(params)) {
                        console.error("params error");
                    } else {
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
                        } else {
                            window.localStorage.setItem("testOidcResult", JSON.stringify(result));
                            const claims  = oauth.getValidatedIdTokenClaims(result);
                            window.localStorage.setItem("testOidcClaims", JSON.stringify(claims));
                            setLoginPath(null);
                            window.location.assign('/');
                        }
                    }
                }

                if(storedResult !== null && storedClaims !== null && userInfo === null) {
                    console.info("has access to tokens but needs to place user info in state")

                    const userInfoResponse = await oauth.userInfoRequest(as, client, storedResult.access_token);

                    const userChallenges = oauth.parseWwwAuthenticateChallenges(userInfoResponse);
                    if (userChallenges !== undefined) {
                        for (const challenge of userChallenges) {
                        console.info('challenge', challenge)
                        }
                        throw new Error() // Handle www-authenticate challenges as needed
                    }

                    const userInfoResult = await oauth.processUserInfoResponse(as, client, storedClaims.sub, userInfoResponse);
                    setUserInfo(userInfoResult)
                }
            }
        })();
    }, [loginPath, userInfo, shouldSignOut])

    const signOut = () => setShouldSignOut(true);
    return <div>
        <h1>
            Auth
        </h1>
        <div>
            {
                userInfo === null ?
                <>
                    {loginPath !== null && <a href={loginPath}>Login</a>} 
                </> :
                <>
                    <button onClick={signOut}>Sign Out</button>
                    <p>{userInfo.email}</p>
                </>
            }
        </div>
    </div>
}
