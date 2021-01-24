// Toggle if running in localhost or GH pages
let isTestEnvironment = false;

console.log(`Running in ${isTestEnvironment ? 'TEST' : 'PROD'} environment`);

// PureCloud Integration type name for this app 
let appName = 'premium-app-example';

// PREFIX for provisioned PureCloud objects. Used by wizard and other app that
// test the existence of these objects
let prefix = 'PREMIUM_APP_EXAMPLE_';

// Client IDs when testing the app in localhost
let testClientID = 'a1107c69-6f99-4b50-9682-c11ce24a35f6';

// Client IDs for production
let prodClientID = 'a1107c69-6f99-4b50-9682-c11ce24a35f6';

// Determine URL for different environments
// TODO bvedad remove this variable
const root = isTestEnvironment ? 'http://localhost:8081' : 'https://inprod.github.io/premium-app-example';

export default {
    clientID: isTestEnvironment ? testClientID : prodClientID,
    isTestEnvironment: isTestEnvironment,
    appName: appName,
    prefix: prefix,
    root: root,
    landingAssetURL: `${root}/premium-app-sample/landing-page/assets`
}