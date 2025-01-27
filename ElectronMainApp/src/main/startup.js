const whitelist = require('./app/whitelist');
const filters = require('./app/filters-manager');
const antibanner = require('./app/antibanner');
const filterState = require('./app/filters/filters-state');
const log = require('./app/utils/log');
const contentBlockerListener = require('./app/content-blocker/content-blocker-listener');
const notificationController = require('./notification-controller');
const safariToolbar = require('safari-ext');
const toolbarController = require('./toolbar-controller');

/**
 * Application startup
 */
module.exports = (() => {

    /**
     * Initialize application services
     */
    const init = (showWindow) => {
        log.info('Application initialization..');

        safariToolbar.busyStatus(true);

        whitelist.init();
        contentBlockerListener.init();
        filterState.init();
        notificationController.init(showWindow);

        antibanner.start({
            onInstall: function (callback) {
                log.debug('On application install..');

                // Retrieve filters and install them
                filters.offerGroupsAndFilters(function (groupIds) {
                    groupIds.forEach(groupId => filters.enableFiltersGroup(groupId));
                });

                showWindow();

                log.info('Application installed');
            }
        }, function () {
            log.info('Application initialization finished');

            safariToolbar.busyStatus(false);
            safariToolbar.sendReady();

            // Check safari extensions
            toolbarController.getExtensionsState((result) => {
                if (!result || !result.contentBlockersEnabled) {
                    log.warn('Safari content blockers are turned off!');

                    showWindow();
                }
            });
        });
    };

    return {
        init
    };

})();
