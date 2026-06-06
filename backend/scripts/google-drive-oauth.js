import dotenv from 'dotenv';
import { google } from 'googleapis';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

dotenv.config();

const scope = 'https://www.googleapis.com/auth/drive';

const clientId = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET;
const getRedirectUri = () => {
    const redirectUri = (process.env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI || 'http://localhost').trim();

    if (/^https?:\/\/localhost\/\d+\/?$/i.test(redirectUri)) {
        console.error(
            'Invalid GOOGLE_DRIVE_OAUTH_REDIRECT_URI. Use http://localhost or http://localhost:5174, not http://localhost/5174/.',
        );
        process.exit(1);
    }

    return redirectUri;
};

const redirectUri = getRedirectUri();

if (!clientId || !clientSecret) {
    console.error(
        'Missing GOOGLE_DRIVE_OAUTH_CLIENT_ID or GOOGLE_DRIVE_OAUTH_CLIENT_SECRET in backend .env.',
    );
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [scope],
});

console.log('\nOpen this URL in a browser with the Google Drive owner account:\n');
console.log(authUrl);
console.log('\nAfter approval, paste the authorization code here.\n');

const rl = readline.createInterface({ input, output });

try {
    const code = await rl.question('Authorization code: ');
    const { tokens } = await oauth2Client.getToken(code.trim());

    if (!tokens.refresh_token) {
        console.error(
            '\nGoogle did not return a refresh token. Re-run this script and make sure the consent screen is accepted.',
        );
        process.exit(1);
    }

    console.log('\nAdd this to backend .env, then restart the backend:\n');
    console.log(`GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
} catch (error) {
    console.error(`\nFailed to exchange authorization code: ${error.message}`);
    process.exit(1);
} finally {
    rl.close();
}
