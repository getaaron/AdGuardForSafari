const listeners = require('../../notifier');
const settings = require('../settings-manager');
const filters = require('../filters-manager');
const jsonFromFilters = require('../libs/JSConverter');
const whitelist = require('../whitelist');

/**
 * Safari Content Blocker Adapter
 */
module.exports = (function () {

    const RULES_LIMIT = 50000;

    const emptyBlockerUrl = 'config/empty.json';
    let emptyBlockerJSON = null;

    const debounce = function (func, wait) {
        let timeout;
        return function () {
            const context = this, args = arguments;
            const later = () => {
                timeout = null;
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    /**
     * Load content blocker
     */
    const updateContentBlocker = () => {

        loadAndConvertRules(RULES_LIMIT, result => {

            if (!result) {
                clearFilters();
                return;
            }

            const json = JSON.parse(result.converted);
            setSafariContentBlocker(json);
            listeners.notifyListeners(listeners.CONTENT_BLOCKER_UPDATED, {
                rulesCount: json.length,
                rulesOverLimit: result.overLimit
            });

        });
    };

    /**
     * Disables content blocker
     * @private
     */
    const clearFilters = () => {
        setSafariContentBlocker(getEmptyBlockerJson());
    };

    /**
     * @returns JSON for empty content blocker
     * @private
     */
    const getEmptyBlockerJson = () => {
        if (!emptyBlockerJSON) {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", emptyBlockerUrl, false);
            xhr.send(null);
            emptyBlockerJSON = JSON.parse(xhr.responseText);
        }
        return emptyBlockerJSON;
    };

    /**
     * Load rules from requestFilter and WhiteListService and convert for ContentBlocker
     * @private
     */
    const loadAndConvertRules = debounce((rulesLimit, callback) => {

        if (settings.isFilteringDisabled()) {
            console.info('Disabling content blocker.');
            callback(null);
            return;
        }

        console.info('Starting loading content blocker.');

        let rules = filters.getRules();

        if (settings.isDefaultWhiteListMode()) {
            rules = rules.concat(whitelist.getRules());
        } else {
            const invertedWhitelistRule = _constructInvertedWhitelistRule();
            if (invertedWhitelistRule) {
                rules = rules.concat(invertedWhitelistRule);
            }
        }

        const result = jsonFromFilters(rules, rulesLimit);
        if (result && result.converted) {
            callback(result);
        } else {
            callback(null);
        }

    }, 500);

    const setSafariContentBlocker = json => {
        try {
            console.info('Setting content blocker. Length=' + json.length);
            //safari.extension.setContentBlocker(json);
            //TODO: Implement setContentBlocker(json);
            console.info('Content blocker has been set.');
        } catch (ex) {
            console.error('Error while setting content blocker: ' + ex);
        }
    };

    /**
     *
     * @private
     */
    const _constructInvertedWhitelistRule = () => {
        const domains = whitelist.getWhiteListDomains();
        let invertedWhitelistRule = '@@||*$document';
        if (domains && domains.length > 0) {
            invertedWhitelistRule += ",domain=";
            let i = 0;
            const len = domains.length;
            for (; i < len; i++) {
                if (i > 0) {
                    invertedWhitelistRule += '|';
                }

                invertedWhitelistRule += '~' + domains[i];
            }
        }

        return invertedWhitelistRule;
    };

    return {
        updateContentBlocker: updateContentBlocker
    };

})();

