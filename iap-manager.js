(function() {
  'use strict';

  var REVENUECAT_API_KEY     = 'goog_RISxOQrsnGvInNGhynIjLdrCwIZ';
  var REMOVE_ADS_ENTITLEMENT = 'no_ads';
  var REMOVE_ADS_PACKAGE_ID  = 'remove_ads_package';
  var STORAGE_KEY            = 'bingoningo_ads_removed';

  var _plugin    = null;   // set after configure() resolves
  var _ready     = false;  // true once configure() succeeds

  function isNative() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform());
  }

  function isFullAds() {
    return (typeof APP_EDITION !== 'undefined' && APP_EDITION === 'full') &&
           (typeof APP_ADS    !== 'undefined' && APP_ADS    === 'true');
  }

  function getRawPlugin() {
    return window.Capacitor &&
           window.Capacitor.Plugins &&
           window.Capacitor.Plugins.Purchases;
  }

  function isAdsRemoved() {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }

  function setAdsRemoved(val) {
    localStorage.setItem(STORAGE_KEY, val ? 'true' : 'false');
    console.log('[IAPManager] ads_removed=' + val);
  }

  function applyEntitlements(customerInfo) {
    var active = customerInfo && customerInfo.entitlements && customerInfo.entitlements.active;
    var hasRemoveAds = !!(active && active[REMOVE_ADS_ENTITLEMENT]);
    setAdsRemoved(hasRemoveAds);
    updateUI();
    return hasRemoveAds;
  }

  function updateUI() {
    var section    = document.getElementById('iapSection');
    var removeBtn  = document.getElementById('removeAdsBtn');
    var restoreBtn = document.getElementById('restorePurchasesBtn');
    if (!section) return;

    section.style.display = '';

    if (removeBtn) {
      if (isAdsRemoved()) {
        removeBtn.textContent = '✓ Ads Removed';
        removeBtn.disabled    = true;
      } else {
        removeBtn.textContent = 'Remove Ads';
        removeBtn.disabled    = false;
      }
    }
    if (restoreBtn) {
      restoreBtn.textContent = 'Restore Purchase';
      restoreBtn.disabled    = false;
    }
  }

  function purchaseRemoveAds() {
    console.log('[IAPManager] purchaseRemoveAds: ready=' + _ready + ' plugin=' + (!!_plugin));
    if (!_ready || !_plugin) {
      console.warn('[IAPManager] purchaseRemoveAds: not ready yet');
      return;
    }
    var removeBtn = document.getElementById('removeAdsBtn');
    if (removeBtn) { removeBtn.textContent = 'Loading…'; removeBtn.disabled = true; }

    _plugin.getOfferings()
      .then(function(result) {
        console.log('[IAPManager] offerings received, current=' + (result.current ? result.current.identifier : 'null'));
        var packages = result.current && result.current.availablePackages;
        if (packages) {
          console.log('[IAPManager] packages available: ' + packages.map(function(p) { return p.identifier; }).join(', '));
        }
        var pkg = packages && packages.find(function(p) {
          return p.identifier === REMOVE_ADS_PACKAGE_ID;
        });
        if (!pkg) throw new Error('Package ' + REMOVE_ADS_PACKAGE_ID + ' not found in default offering');
        console.log('[IAPManager] purchasing package:', pkg.identifier);
        return _plugin.purchasePackage({ aPackage: pkg });
      })
      .then(function(result) {
        applyEntitlements(result.customerInfo);
      })
      .catch(function(e) {
        console.warn('[IAPManager] purchaseRemoveAds failed:', JSON.stringify(e));
        updateUI();
      });
  }

  function restorePurchases() {
    console.log('[IAPManager] restorePurchases: ready=' + _ready + ' plugin=' + (!!_plugin));
    if (!_ready || !_plugin) {
      console.warn('[IAPManager] restorePurchases: not ready yet');
      return;
    }
    var restoreBtn = document.getElementById('restorePurchasesBtn');
    if (restoreBtn) { restoreBtn.textContent = 'Restoring…'; restoreBtn.disabled = true; }

    _plugin.restorePurchases()
      .then(function(result) {
        applyEntitlements(result.customerInfo);
      })
      .catch(function(e) {
        console.warn('[IAPManager] restorePurchases failed:', JSON.stringify(e));
        updateUI();
      });
  }

  function init() {
    console.log('[IAPManager] init: isFullAds=' + isFullAds() + ' isNative=' + isNative());
    if (!isFullAds() || !isNative()) return;

    // Show buttons immediately so user can see them
    updateUI();
    var removeBtn  = document.getElementById('removeAdsBtn');
    var restoreBtn = document.getElementById('restorePurchasesBtn');
    if (removeBtn)  removeBtn.addEventListener('click', purchaseRemoveAds);
    if (restoreBtn) restoreBtn.addEventListener('click', restorePurchases);

    var raw = getRawPlugin();
    console.log('[IAPManager] raw plugin=' + (raw ? 'found' : 'NOT FOUND') +
      ' keys=' + (raw ? JSON.stringify(Object.keys(raw)) : 'n/a'));
    if (!raw) return;

    // configure() is void in RevenueCat Capacitor v12 — call it then proceed immediately
    try {
      raw.configure({ apiKey: REVENUECAT_API_KEY });
      console.log('[IAPManager] configure called');
    } catch(e) {
      console.warn('[IAPManager] configure threw:', JSON.stringify(e));
    }
    _plugin = raw;
    _ready  = true;

    raw.getCustomerInfo()
      .then(function(result) {
        console.log('[IAPManager] getCustomerInfo ok');
        applyEntitlements(result.customerInfo);
      })
      .catch(function(e) {
        console.warn('[IAPManager] getCustomerInfo error:', JSON.stringify(e));
        updateUI();
      });

    raw.addCustomerInfoUpdateListener(function(customerInfo) {
      console.log('[IAPManager] customerInfo update');
      applyEntitlements(customerInfo);
    });
  }

  window.IAPManager = {
    init:               init,
    isAdsRemoved:       isAdsRemoved,
    purchaseRemoveAds:  purchaseRemoveAds,
    restorePurchases:   restorePurchases
  };

})();
