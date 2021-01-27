import config from '../config/config.js';
import view from './view.js';

// Module scripts
import roleModule from './modules/role.js';
import groupModule from './modules/group.js';
import OAuthClientModule from './modules/oauth-client.js';
import dataTableModule from './modules/data-table.js';

// Add new modules here
// This will later be filtered in setup() to only use
// what's in the config
let modules = [
  roleModule,
  groupModule,
  OAuthClientModule,
  dataTableModule
];

const jobOrder = config.provisioningInfo;
const prefix = config.prefix;

// PureCloud
const platformClient = require('platformClient');
let client = null;
const integrationsApi = new platformClient.IntegrationsApi();


// Global data
let userMe = null; // PureCloud user object
let integrationId = ''; // Integration instance ID
let installedData = {}; // Everything that's installed after


/**
 * Get's all the currently installed items as defined in the
 * job order.
 * @returns {Promise} Array of the installed objects
 */
function getInstalledObjects() {
  let promiseArr = [];

  modules.forEach((module) => {
    if (jobOrder[module.provisioningInfoKey]) {
      promiseArr.push(module.getExisting());
    }
  });

  return Promise.all(promiseArr);
}

/**
 * Run against the global installedData so it will just contain id and
 * name of the installed PureCLoud objects
 * @returns {Object} Simplified object data of installed items
 */
function simplifyInstalledData() {
  let result = {};
  Object.keys(installedData).forEach(modKey => {
    let modItems = installedData[modKey];
    result[modKey] = {};

    Object.keys(modItems).forEach(itemName => {
      let itemVal = modItems[itemName];
      result[modKey][itemName] = {
        id: itemVal.id,
        name: itemVal.name,
      }
    })
  });

  return result;
}

export default {
  /**
   * Setup the wizard with references
   * @param {Object} pcClient PureCloud API Client
   * @param {Object} user PureCloud user object
   * @param {String} instanceId ID of the working integration instance
   */
  setup(pcClient, user, instanceId) {
    client = pcClient;
    userMe = user;
    integrationId = instanceId;

    // Use only modules in provisioning info
    modules = modules.filter((module) => {
      return Object.keys(config.provisioningInfo)
        .includes(module.provisioningInfoKey);
    });
  },

  getInstalledObjects: getInstalledObjects,

  /**
   * Checks if any installed objects are still existing
   * @returns {Promise<boolean>}
   */
  isExisting() {
    let exists = false;

    return getInstalledObjects()
      .then((installed) => {
        console.log(installed);
        installed.forEach(item => {
          if (item.total && item.total > 0) {
            // If it's  a purecloud search reslts
            exists = true;
          } else {
            // if it's just an array
            exists = item.length > 0 ? true : exists;
          }
        });

        return exists;
      })
      .catch((e) => console.error(e));
  },

  customSetup() {
    let protocol = 'http://';
    let authProperties = JSON.parse(localStorage.getItem("authentication_properties"));

    localStorage.setItem("genesysBasePath", client.instance.basePath);
    return $.ajax({
      url: `https://app.test.inprod.io/api/customers/genesys-create/`,
      type: 'post',
      data: JSON.stringify({
        "base_path": client.instance.basePath,
        "access_token": client.instance.authData.accessToken,
        ...authProperties
      }),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      dataType: 'json'
    })
  },

  /**
   * Installs all the modules
   * @returns {Promise<Array>} array of finally function resolves
   */
  install(sendEmailToPureCloud) {
    let creationPromises = [];
    let configurationPromises = [];
    let finalFunctionPromises = [];

    // Create all the items
    modules.forEach((module) => {
      let moduleProvisioningData = config.provisioningInfo[module.provisioningInfoKey];

      if (!moduleProvisioningData) return;

      creationPromises.push(
        module.create(
          view.showLoadingModal,
          moduleProvisioningData
        )
      );
    });


    return Promise.all(creationPromises)
      .then((result) => {
        // Configure all items
        modules.forEach((module, i) => {
          installedData[module.provisioningInfoKey] = result[i];
        });

        modules.forEach((module) => {
          configurationPromises.push(
            module.configure(
              view.showLoadingModal,
              installedData,
              userMe.id
            )
          );
        });

        return Promise.all(configurationPromises);
      })
      .then(() => {
        view.showLoadingModal('Executing Final Steps...');

        // Loop through all items with finally
        Object.keys(config.provisioningInfo).forEach(key => {
          let provisionItems = config.provisioningInfo[key];
          provisionItems.forEach((item) => {
            if (item.registeredRedirectUri) {
              console.log("PRINTAMO_______----_____----_____" + localStorage.getItem("portal_address") + "/oauth-callback/purecloud")
              item.registeredRedirectUri.push(localStorage.getItem("portal_address") + "/oauth-callback/purecloud");
              item.registeredRedirectUri.push(localStorage.getItem("portal_address") + "/oauth-connect-callback/purecloud");
              console.log(item.registeredRedirectUri);
            }
            if (item.finally) {
              finalFunctionPromises.push(
                item.finally(installedData[key][item.name], sendEmailToPureCloud)
              );
            }
          })
        });

        return Promise.all(finalFunctionPromises);
      })
      // Change the premium app URL to point to the right domain
      .then(() => {
          console.log(installedData)
          return integrationsApi.getIntegrationConfigCurrent(integrationId)
          .then((instance) => {
              let body = instance;
              body.properties.url = localStorage.getItem("portal_address");

              return integrationsApi.putIntegrationConfigCurrent(
                          integrationId, { body: body });
          });
      })
      .catch((e) => {
        console.error(e);
      });
  },

  /**
   * Uninstall all the modules
   * @returns {Promise<Array>} module remove promises
   */
  uninstall() {
    let promiseArr = [];

    modules.forEach((module) => {
      promiseArr.push(
        module.remove(view.showLoadingModal)
      );
    });

    return Promise.all(promiseArr);
  }
}