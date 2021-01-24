import config from '../config/config.js';
import view from './view.js';
import wizard from './wizard.js';

// PureCloud
const platformClient = require('platformClient');
const client = platformClient.ApiClient.instance;
const authorizationApi = new platformClient.AuthorizationApi();
const ClientApp = window.purecloud.apps.ClientApp;

// API 
const usersApi = new platformClient.UsersApi();
const integrationsApi = new platformClient.IntegrationsApi();

// Constants
const appName = config.appName;

// Variables
let pcLanguage = localStorage.getItem(appName + ':language') ||
                    config.defaultLanguage;
let pcEnvironment = localStorage.getItem(appName + ':environment') ||
                    config.defaultPcEnvironment;
let clientApp = null;
let userMe = null;
let integrationId = '';
let premiumAppURL = config.premiumAppURL;

/**
 * Get ID of the integration so the description can be edited containing
 * the installed data. Currently gets the first one from the result.
 * Does not support multiple integration instances yet.
 * @returns {Promise} id of the premium app integration instance
 */
function getIntegrationId(){
    return new Promise((resolve, reject) => {
        integrationsApi.getIntegrationsClientapps({pageSize: 100})
        .then((data) => {
            let instances = data.entities;
            let pa_instance = instances.find(instance => instance.integrationType.id === config.appName);
            if(pa_instance){
                resolve(pa_instance.id);
            }else{
                reject('Integration ID not found.')
            }
        })
    });
}

/**
 * Get query parameters for language and purecloud region
 */
function queryParamsConfig(){
    // Get Query Parameters
    const urlParams = new URLSearchParams(window.location.search);
    let tempLanguage = urlParams.get(config.languageQueryParam);
    let tempPcEnv = urlParams.get(config.pureCloudEnvironmentQueryParam);

    // Override default and storage items with what's on search query
    if(tempLanguage){
        pcLanguage = tempLanguage;
        localStorage.setItem(appName + ':language', pcLanguage);
    }
    if(tempPcEnv){
        pcEnvironment = tempPcEnv;
        localStorage.setItem(appName + ':environment', pcEnvironment);
    }
}

/**
 * Authenticate with PureCloud
 * @returns {Promise} login info
 */
function authenticatePureCloud(){
 client.setEnvironment(pcEnvironment);
    client.setPersistSettings(true, appName);
    return client.loginImplicitGrant(
                config.clientID,
                config.wizardUriBase + 'index.html'
            );
}

/**
 * Get user details with its roles
 * @returns {Promise} usersApi result
 */
function getUserDetails(){
    let opts = {'expand': ['authorization']};

    return usersApi.getUsersMe(opts);
}

/**
 * Checks if the PureCloud org has the premium app product enabled
 * @returns {Promise}
 */
function validateProductAvailability(){
    return integrationsApi.getIntegrationsTypes({})
    .then((data) => {
        if (data.entities.filter((integType) => integType.id === appName)[0]){
            console.log("PRODUCT AVAILABLE");
            return(true);
        } else {
            console.log("PRODUCT NOT AVAILABLE");
            return(false);
        }
    });
}


function hasUserAuthorizationRole(role) {
    return authorizationApi.getAuthorizationRoles({
        name: role
    }).then((result) => {
        let role = userMe.authorization.roles.find(role => role.id === result.entities[0].id);
        return !!role
    });
}

/**
 * Setup function
 * @returns {Promise}
 */
function setup(){
    view.showLoadingModal('Loading...');
    view.hideContent();

    queryParamsConfig();

    // Setup Client App
    clientApp = new ClientApp({
        pcEnvironment: pcEnvironment
    });

    return authenticatePureCloud()
    .then(() => {
        return getUserDetails();
    })
    .then((user) => {
        userMe = user;

        view.showUserName(user);

        return getIntegrationId();
    })
    .then((id) => {
        integrationId = id;

        return setPageLanguage();
    })
    .then(() => {
        wizard.setup(client, userMe, integrationId);

        return runPageScript();
    })
    .then(() => {
        view.hideLoadingModal();
    })
    .catch((e) => console.error(e));
}

/**
 * Sets and loads the language file based on the pcLanguage global var
 * @returns {Promise}
 */
function setPageLanguage(){
    return new Promise((resolve, reject) => {
        let fileUri =
            `${config.wizardUriBase}assets/languages/${pcLanguage}.json`;
        $.getJSON(fileUri)
        .done(data => {
            Object.keys(data).forEach((key) => {
                let els = document.querySelectorAll(`.${key}`);
                for(let i = 0; i < els.length; i++){
                    els.item(i).innerText = data[key];
                }
            })
            resolve();
        })
        .fail(xhr => {
            console.log('Language file not found.');
            resolve();
        });
    });
}

/**
 * Runs page specific script.
 * @returns {Promise}
 */
function runPageScript(){
    return new Promise((resolve, reject) => {
        let pathParts = window.location.pathname.split('/');
        let page = pathParts[pathParts.length - 1];

        // Run Page Specific Scripts
        switch(page){
            case 'index.html':
                sendEmailToPureCloud("PureCloud signup process started",
                `User with email ${userMe.email} just started signup process on PureCloud.`);
                // Button Handler
                let elNextBtn = document.getElementById('next');
                elNextBtn.addEventListener('click', () => {
                    window.location.href = './custom-setup.html';
                });

                validateProductAvailability()
                .then((isAvailable) => {
                    if(isAvailable){
                        return hasUserAuthorizationRole('employee').then(hasPermission => {
                            if(hasPermission) {
                                view.showProductAvailable();
                            } else {
                                view.showProductUnavailable(true);
                            }
                        })
                    }else{
                        view.showProductUnavailable();
                    }

                    return wizard.isExisting();
                })
                // Check if has an existing installation
                .then((exists) => {
                    if(exists) {
                        window.location.href = premiumAppURL;
                    } else {
                        if (window.location.href && String(window.location.href).includes('failed=true')) {
                            document.getElementById('txt-message-fail').innerText = 'Product installation failed, please try again in a few moments.';
                        }
                        view.showContent();
                        resolve();
                    }
                });
                break;
            case 'custom-setup.html':
                // Set default values for form
                document.getElementById('sync_time').value = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 16);
                document.getElementById('fetch_interval').value = 30;
                document.getElementById('granularity_value').value = 12;
                document.getElementById('granularity_time').value = 'H';

                // Select handler
                let elPrimaryAuthSelect = document.getElementById('primary_auth_method');

                let elSecondaryAuthOption = document.getElementById(String(elPrimaryAuthSelect.value).toLowerCase());
                elSecondaryAuthOption.disabled = true;

                let options = ["pure_cloud", "microsoft", "google", "salesforce", "okta"]

                elPrimaryAuthSelect.addEventListener('change', (event) => {
                    options.forEach(item => {
                      let tempOption = document.getElementById(String(item));
                      tempOption.disabled = false;
                    })
                    const secondaryOption = document.getElementById(String(event.target.value).toLowerCase());
                    secondaryOption.disabled = true;
                });

                // Button Handler
                let elSetupBtn = document.getElementById('next');
                elSetupBtn.addEventListener('click', () => {
                  view.showLoadingModal('Creating account..');
                  let syncTimeValue = document.getElementById('sync_time').value;
                  let fetchIntervalValue = document.getElementById('fetch_interval').value;
                  let granularityValue = "".concat(
                    'PT',
                    document.getElementById('granularity_value').value,
                    document.getElementById('granularity_time').value,
                  )
                  let primaryAuthMethod = document.getElementById('primary_auth_method').value;
                  let secondaryAuthMethod = Array.from(document.getElementById('secondary_auth_methods').selectedOptions).map(el=>String(el.value).toLowerCase()).join("-");

                  let authenticationProperties = {
                    primary_auth_method: primaryAuthMethod,
                    secondary_auth_method: secondaryAuthMethod
                  }

                  let dataSourceProperties = {
                      sync_time: syncTimeValue,
                      fetch_interval: fetchIntervalValue,
                      granularity: granularityValue
                    }

                    localStorage.setItem("data_source_properties", JSON.stringify(dataSourceProperties));
                    localStorage.setItem("authentication_properties", JSON.stringify(authenticationProperties));

                    wizard.customSetup()
                        .then(response => {
                            let protocol = "https://";
                            let portalAddress = `${protocol}${response.portal_address}`;
                            config.premiumAppURL = portalAddress;
                            localStorage.setItem("portal_address", portalAddress);
                            localStorage.setItem("key", response.key);
                            window.location.href = './install.html';
                        })
                        .catch(e => {
                            console.error(e);
                            window.location.href = './index.html?failed=true'
                            sendEmailToPureCloud("PureCloud signup process failed",
                            `PureCloud signup process failed at step 'custom setup' with error:\n${e.responseJSON[0]}`);
                        });
                });
                resolve();
                view.showContent();
                break;
            case 'install.html':
                // Button Handler
                let elStartBtn = document.getElementById('start');
                elStartBtn.addEventListener('click', () => {
                    view.showLoadingModal('Installing..');
                    wizard.install(sendEmailToPureCloud)
                    .then(() => {
                        window.location.href = './finish.html';
                    })
                    .catch(e => {
                        console.error(e);
                    })
                });

                resolve();
                view.showContent();
                break;
            case 'finish.html':
                view.showContent();
                sendEmailToPureCloud("PureCloud signup process finished.",
                `User with email ${userMe.email} just finished signup process on PureCloud.`);
                setTimeout(() => {
                    window.location.href = localStorage.getItem("portal_address");
                }, 2000);

                resolve();
                break;
            case 'uninstall.html':
                alert("The uninstall button is for development purposes only. Remove this button before demo.");

                view.showContent();
                view.showLoadingModal('Uninstalling...');

                let failed = false;
                if (window.location.href && String(window.location.href).includes('failed=true')) {
                    failed = true;
                }

                wizard.uninstall()
                // Change the premium app URL to point to the right domain
                .then(() => {
                  return integrationsApi.getIntegrationConfigCurrent(integrationId)
                    .then((instance) => {
                      let body = instance;
                      body.properties.url = config.premiumAppURL;

                      return integrationsApi.putIntegrationConfigCurrent(
                        integrationId, { body: body });
                    })
                })
                .then(() => {
                    setTimeout(() => {
                        window.location.href = config.wizardUriBase
                                        + 'index.html' + (failed ? '?failed=true' : '');
                    }, 2000);
                });
                resolve();
                break;
            default:
                reject('Unknown page');
                break;
        }
    });
}

function sendEmailToPureCloud(subject, body) {
    let protocol = "http://";
    $.ajax({
        url: `https//test.inprod.io/api/customers/genesys-send-email/`,
        type: 'post',
        data: JSON.stringify({
            "base_path": client.instance.basePath,
            "access_token": client.instance.authData.accessToken,
            body,
            subject
        }),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        dataType: 'json'
    });
}


setup();