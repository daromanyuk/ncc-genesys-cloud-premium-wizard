export default {
    clientID: 'a25d93b0-7a4e-485a-bdf3-dcf27fb2b3b3',

    'wizardUriBase': 'https://inprod.github.io/premium-app-example/wizard/',
    // 'wizardUriBase': 'https://inprod.github.io/premium-app-example/wizard/',

    // The actual URL of the landing page of your web app.
    'premiumAppURL': 'https://inprod.github.io/premium-app-example/premium-app-sample/index.html',
    // 'premiumAppURL': 'https://inprod.github.io/premium-app-example/premium-app-sample/index.html',

    // PureCloud assigned name for the premium app
    // This should match the integration type name of the Premium App
    'appName': 'premium-app-example',

    // Default Values for fail-safe/testing. Shouldn't have to be changed since the app
    // must be able to determine the environment from the query parameter
    // of the integration's URL
    'defaultPcEnvironment': 'mypurecloud.com.au',
    'defaultLanguage': 'en-us',

    // The names of the query parameters to check in
    // determining language and environment
    // Ex: www.electric-sheep-app.com?language=en-us&environment=mypurecloud.com
    'languageQueryParam': 'language',
    'pureCloudEnvironmentQueryParam': 'environment',

    // Permissions required for running the Wizard App
    'setupPermissionsRequired': ['admin'],

    // To be added to names of PureCloud objects created by the wizard
    'prefix': 'Arkis ',

    // These are the PureCloud items that will be added and provisioned by the wizard
    'provisioningInfo': {
        'role': [
            {
                'name': 'Role',
                'description': 'Generated role for access to the app.',
                'permissionPolicies': [
                    {
                        'domain': 'integration',
                        'entityName': 'examplePremiumApp',
                        'actionSet': ['*'],
                        'allowConditions': false
                    },
                    {
                        "domain":"analytics",
                        "entityName":"conversationAggregate",
                        "actionSet":[
                          "*"
                        ],
                        "allowConditions":false
                    },
                    {
                        "domain":"analytics",
                        "entityName":"userAggregate",
                        "actionSet":[
                          "*"
                        ],
                        "allowConditions":false
                    },
                    {
                        "domain":"analytics",
                        "entityName":"evaluationAggregate",
                        "actionSet":[
                          "*"
                        ],
                        "allowConditions":false
                    }
                ]
            }
        ],
        'group': [
            {
                'name': 'Users',
                'description': 'Users that use Arkis application.',
            },
            {
                'name': 'Supervisors',
                'description': 'Supervisors have the ability to watch a queue for ACD conversations.',
                'assignToSelf': true
            }
        ],
        'app-instance': [
            {
                'name': 'Supervisor Widget',
                'url': 'https://inprod.github.io//premium-app-sample/supervisor.html?lang={{pcLangTag}}&environment={{pcEnvironment}}',
                'type': 'standalone',
                'groups': ['Supervisors']
            }
        ],
        'oauth-client': [
            {
                'name': 'OAuth Client',
                'description': 'Generated Client that\'s passed to the App Backend',
                'roles': ['Role'],
                'authorizedGrantType': 'CLIENT_CREDENTIALS',

                /**
                 * This function is for other processing that needs
                 * to be done after creating an object.
                 * 'finally' is available for all the other
                 * resources configured in this config file.
                 * NOTE: Finally functions must return a Promise.
                 * For Client Credentials, normally it means
                 * passing the details to the backend.
                 * @param {Object} installedData the PureCloud resource created
                 * @param {Function} sendEmailToPureCloud - the method used for sending a callback email no matter what happens
                 * @returns {Promise}
                 */
                'finally': function(installedData, sendEmailToPureCloud){
                    return new Promise((resolve, reject) => {
                        let protocol = 'http://';
                        return $.ajax({
                            url: `https://app.test.inprod.io/api/customers/genesys-client-update/`,
                            type: 'post',
                            data: JSON.stringify({
                                "client_id": installedData.id,
                                "secret": installedData.secret,
                                "base_path": localStorage.getItem("genesysBasePath"),
                                "key": localStorage.getItem("key"),
                                "is_social_app_update": false,
                                ...JSON.parse(localStorage.getItem("data_source_properties"))
                            }),
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json'
                            }
                        }).done(() => {
                          console.log('Successfully installed');
                        }).fail(e => {
                          window.location.href = './uninstall.html?failed=true'
                          sendEmailToPureCloud("PureCloud signup process failed",
                            `PureCloud signup process failed at step 'oauth client' with error:\n${JSON.stringify(e)}`);
                          console.error(e);
                        }).always(() => {
                          resolve();
                        })
                    });
                }
            },
            {
                "name":`GC OAuth - Arkis`,
                "description":"OAuth for Arkis Provider, generated automatically to provide login",
                "authorizedGrantType":"CODE",
                "registeredRedirectUri":[
                    "https://inprod.github.io//oauth-callback/purecloud",
                    "https://inprod.github.io//oauth-connect-callback/purecloud",
                    "https://inprod.github.io//premium-app-sample/index.html",
                    "https://inprod.github.io//wizard/index.html",
                    "https://inprod.github.io//wizard/supervisor.html",
                    "https://inprod.github.io//index.html",
                    "https://inprod.github.io//supervisor.html",
                    "http://localhost:8081/oauth-callback/purecloud",
                    "http://localhost:8081/oauth-connect-callback/purecloud",
                    "http://localhost:8081/premium-app-sample/index.html",
                    "http://localhost:8081/wizard/index.html",
                    "http://localhost:8081/wizard/supervisor.html",
                    "http://localhost:8081/index.html",
                    "https://localhost:8081/supervisor.html",
                    "https://localhost:8080/oauth-callback/purecloud",
                    "https://localhost:8080/oauth-connect-callback/purecloud",
                    "https://localhost:8080/premium-app-sample/index.html",
                    "https://localhost:8080/wizard/index.html",
                    "https://localhost:8080/wizard/supervisor.html",
                    "https://localhost:8080/index.html",
                    "https://localhost:8080/supervisor.html",
                    "https://localhost:8081/oauth-callback/purecloud",
                    "https://localhost:8081/oauth-connect-callback/purecloud",
                    "https://localhost:8081/premium-app-sample/index.html",
                    "https://localhost:8081/wizard/index.html",
                    "https://localhost:8081/wizard/supervisor.html",
                    "https://localhost:8081/index.html",
                    "https://localhost:8081/supervisor.html",
                    "https://inprod.github.io/premium-app-example/premium-app-sample/index.html",
                    "https://inprod.github.io/premium-app-example/wizard/index.html",
                    "https://inprod.github.io/premium-app-example/wizard/supervisor.html"
                ],
                "scope":[
                    "alerting",
                    "alerting:readonly",
                    "analytics",
                    "analytics:readonly",
                    "architect",
                    "architect:readonly",
                    "assistants",
                    "assistants:readonly",
                    "audits:readonly",
                    "authorization",
                    "authorization:readonly",
                    "billing:readonly",
                    "coaching",
                    "coaching:readonly",
                    "content-management",
                    "content-management:readonly",
                    "conversations",
                    "conversations:readonly",
                    "devices",
                    "devices:readonly",
                    "dialog",
                    "dialog:readonly",
                    "external-contacts",
                    "external-contacts:readonly",
                    "fax",
                    "fax:readonly",
                    "gdpr",
                    "gdpr:readonly",
                    "geolocation",
                    "geolocation:readonly",
                    "greetings",
                    "greetings:readonly",
                    "groups",
                    "groups:readonly",
                    "identity-providers:readonly",
                    "integrations",
                    "integrations:readonly",
                    "journey",
                    "journey:readonly",
                    "knowledge",
                    "knowledge:readonly",
                    "language-understanding",
                    "language-understanding:readonly",
                    "learning",
                    "learning:readonly",
                    "license",
                    "license:readonly",
                    "locations",
                    "locations:readonly",
                    "messaging",
                    "messaging-platform",
                    "messaging-platform:readonly",
                    "messaging:readonly",
                    "notifications",
                    "oauth",
                    "oauth:readonly",
                    "organization",
                    "organization-authorization",
                    "organization-authorization:readonly",
                    "organization:readonly",
                    "outbound",
                    "outbound:readonly",
                    "presence",
                    "presence:readonly",
                    "quality",
                    "quality:readonly",
                    "recordings",
                    "recordings:readonly",
                    "response-management",
                    "response-management:readonly",
                    "routing",
                    "routing:readonly",
                    "scim",
                    "scim:readonly",
                    "scripts",
                    "scripts:readonly",
                    "search:readonly",
                    "speech-and-text-analytics",
                    "speech-and-text-analytics:readonly",
                    "stations",
                    "stations:readonly",
                    "streaming-events:readonly",
                    "telephony",
                    "telephony:readonly",
                    "textbots",
                    "textbots:readonly",
                    "upload",
                    "user-basic-info",
                    "user-recordings",
                    "user-recordings:readonly",
                    "users",
                    "users:readonly",
                    "voicemail",
                    "voicemail:readonly",
                    "web-chat",
                    "web-chat:readonly",
                    "widgets",
                    "widgets:readonly",
                    "workforce-management",
                    "workforce-management:readonly"
                ],
                "finally": function(installedData, sendEmailToPureCloud){
                    return new Promise((resolve, reject) => {
                        let protocol = 'http://';
                        return $.ajax({
                            url: `https://app.test.inprod.io/api/customers/genesys-client-update/`,
                            type: 'post',
                            data: JSON.stringify({
                                "client_id": installedData.id,
                                "secret": installedData.secret,
                                "base_path": localStorage.getItem("genesysBasePath"),
                                "key": localStorage.getItem("key"),
                                "is_social_app_update": true,
                                ...JSON.parse(localStorage.getItem("data_source_properties"))
                            }),
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json'
                            }
                        }).done(() => {
                            console.log('Successfully installed');
                        }).fail(e => {
                            window.location.href = './uninstall.html?failed=true'
                            sendEmailToPureCloud("PureCloud signup process failed",
                              `PureCloud signup process failed at step 'oauth client' with error:\n${JSON.stringify(e)}`);
                            console.error(e);
                        }).always(() => {
                            resolve();
                        })
                    });
                }
            }
        ]
    }
};
