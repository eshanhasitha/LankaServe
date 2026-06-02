# Testing Guide

## Unit and Integration Tests

- Run all tests: `npm test`
- Run auth integration only: `npm run test:integration -- tests/integration/auth.test.js`
- Run job flow integration only: `npm run test:integration -- tests/integration/jobflow.test.js`

## API Manual Test

- Import `docs/postman/LankaServe.postman_collection.json` into Postman.
- Set `baseUrl` variable.
- Run auth login and copy tokens from response.
- Set `accessToken` and `refreshToken` variables in Postman.
- Test protected endpoints with `Authorization: Bearer {{accessToken}}`.

## Provider Job Browsing Checks

- Assigned jobs: `GET {{baseUrl}}/api/providers/jobs`
- Open jobs browse: `GET {{baseUrl}}/api/providers/browse-jobs`
- Suggestions: `GET {{baseUrl}}/api/providers/suggestions`
