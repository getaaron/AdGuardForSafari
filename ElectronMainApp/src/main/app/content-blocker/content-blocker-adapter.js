const config = require('config');
const listeners = require('../../notifier');
const events = require('../../events');
const settings = require('../settings-manager');
const antibanner = require('../antibanner');
const {jsonFromFilters} = require('../libs/JSConverter');
const whitelist = require('../whitelist');
const log = require('../utils/log');
const concurrent = require('../utils/concurrent');
const {groupRules, rulesGroupsBundles} = require('./rule-groups');

/**
 * Safari Content Blocker Adapter
 *
 * @type {{updateContentBlocker}}
 */
module.exports = (function () {

    const RULES_LIMIT = 50000;
    const DEBOUNCE_PERIOD = 500;

    const emptyBlockerJSON = [
        {
            "action": {
                "type": "ignore-previous-rules"
            },
            "trigger": {
                "url-filter": "none"
            }
        }
    ];

    /**
     * Load content blocker
     */
    const updateContentBlocker = () => {

        loadRules(rules => {

            const grouped = groupRules(rules);
            let overlimit = false;

            for (let group of grouped) {
                let json = emptyBlockerJSON;

                const result = jsonFromFilters(group.rules.map(x => x.ruleText), RULES_LIMIT, false, false);
                if (result && result.converted) {
                    json = JSON.parse(result.converted);
                    if (result.overLimit) {
                        overlimit = true;
                    }
                }

                setSafariContentBlocker(rulesGroupsBundles[group.key], json);

                listeners.notifyListeners(events.CONTENT_BLOCKER_EXTENSION_UPDATED, {
                    rulesCount: group.rules.length,
                    bundleId: rulesGroupsBundles[group.key],
                    overlimit: result && result.overLimit,
                    filterGroups: group.filterGroups
                });
            }

            const advancedBlocking = setAdvancedBlocking(rules.map(x => x.ruleText));

            listeners.notifyListeners(events.CONTENT_BLOCKER_UPDATED, {
                rulesCount: rules.length,
                rulesOverLimit: overlimit,
                advancedBlockingRulesCount: advancedBlocking.length
            });

        });
    };

    /**
     * Activates advanced blocking json
     *
     * @param rules
     * @return {Array}
     */
    const setAdvancedBlocking = (rules) => {
        const result = jsonFromFilters(rules, RULES_LIMIT, false, true);
        const advancedBlocking = result ? JSON.parse(result.advancedBlocking) : [];

        setSafariContentBlocker(rulesGroupsBundles["advancedBlocking"], advancedBlocking);

        return advancedBlocking;
    };

    /**
     * Load rules from requestFilter and WhiteListService
     * @private
     */
    const loadRules = concurrent.debounce((callback) => {

        if (settings.isFilteringDisabled()) {
            log.info('Disabling content blocker.');
            callback(null);
            return;
        }

        log.info('Loading content blocker.');

        let rules = antibanner.getRules();

        log.info('Rules loaded: {0}', rules.length);
        if (settings.isDefaultWhiteListMode()) {
            rules = rules.concat(whitelist.getRules().map(r => {
                return { filterId: 0, ruleText: r }
            }));
        } else {
            const invertedWhitelistRule = constructInvertedWhitelistRule();
            if (invertedWhitelistRule) {
                rules = rules.concat({
                    filterId: 0, ruleText: invertedWhitelistRule
                });
            }
        }

        callback(rules);

    }, DEBOUNCE_PERIOD);

    /**
     * Activates json for bundle
     *
     * @param bundleId
     * @param json
     */
    const setSafariContentBlocker = (bundleId, json) => {
        try {
            log.info(`Setting content blocker json for ${bundleId}. Length=${json.length};`);

            listeners.notifyListeners(events.CONTENT_BLOCKER_UPDATE_REQUIRED, {
                bundleId,
                json
            });
        } catch (ex) {
            log.error(`Error while setting content blocker ${bundleId}: ` + ex);
        }
    };

    /**
     * Constructs rule for inverted whitelist
     *
     * @private
     */
    const constructInvertedWhitelistRule = () => {
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
        updateContentBlocker
    };

})();

