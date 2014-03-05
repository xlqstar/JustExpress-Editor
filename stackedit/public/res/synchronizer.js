define([
    "jquery",
    "underscore",
    "utils",
    "storage",
    "eventMgr",
    "fileSystem",
    "fileMgr",
    "classes/Provider",
    "providers/dropboxProvider",
    "providers/gdriveProvider",
    "providers/gdrivesecProvider",
    "providers/gdriveterProvider"
], function($, _, utils, storage, eventMgr, fileSystem, fileMgr, Provider) {

    var synchronizer = {};

    // Create a map with providerId: providerModule
    var providerMap = _.chain(arguments).map(function(argument) {
        return argument instanceof Provider && [
            argument.providerId,
            argument
        ];
    }).compact().object().value();

    // Retrieve sync locations from storage
    _.each(fileSystem, function(fileDesc) {
        _.each(utils.retrieveIndexArray(fileDesc.fileIndex + ".sync"), function(syncIndex) {
            try {
                var syncAttributes = JSON.parse(storage[syncIndex]);
                // Store syncIndex
                syncAttributes.syncIndex = syncIndex;
                // Replace provider ID by provider module in attributes
                var provider = providerMap[syncAttributes.provider];
                if(!provider) {
                    throw new Error("Invalid provider ID: " + syncAttributes.provider);
                }
                syncAttributes.provider = provider;
                fileDesc.syncLocations[syncIndex] = syncAttributes;
            }
            catch(e) {
                // storage can be corrupted
                eventMgr.onError(e);
                // Remove sync location
                utils.removeIndexFromArray(fileDesc.fileIndex + ".sync", syncIndex);
                storage.removeItem(syncIndex);
            }
        });
    });
    
    // AutoSync configuration
    _.each(providerMap, function(provider) {
        provider.autosyncConfig = utils.retrieveIgnoreError(provider.providerId + ".autosyncConfig") || {};
    });
    
    // Returns true if at least one file has synchronized location
    synchronizer.hasSync = function(provider) {
        return _.some(fileSystem, function(fileDesc) {
            return _.some(fileDesc.syncLocations, function(syncAttributes) {
                return provider === undefined || syncAttributes.provider === provider;
            });
        });
    };

    /***************************************************************************
     * Standard synchronization
     **************************************************************************/

    // Recursive function to upload a single file on multiple locations
    var uploadSyncAttributesList = [];
    var uploadContent;
    var uploadContentCRC;
    var uploadTitle;
    var uploadTitleCRC;
    function locationUp(callback) {

        // No more synchronized location for this document
        if(uploadSyncAttributesList.length === 0) {
            fileUp(callback);
            return;
        }

        // Dequeue a synchronized location
        var syncAttributes = uploadSyncAttributesList.pop();

        var providerSyncUpFunction = syncAttributes.provider.syncUp;
        // Call a special function in case of a real time synchronized location
        if(syncAttributes.isRealtime === true) {
            providerSyncUpFunction = syncAttributes.provider.syncUpRealtime;
        }

        // Use the specified provider to perform the upload
        providerSyncUpFunction(uploadContent, uploadContentCRC, uploadTitle, uploadTitleCRC, syncAttributes, function(error, uploadFlag) {
            if(uploadFlag === true) {
                // If uploadFlag is true, request another upload cycle
                uploadCycle = true;
            }
            if(error) {
                callback(error);
                return;
            }
            if(uploadFlag) {
                // Update syncAttributes in storage
                utils.storeAttributes(syncAttributes);
            }
            locationUp(callback);
        });
    }

    // Recursive function to upload multiple files
    var uploadFileList = [];
    function fileUp(callback) {

        // No more fileDesc to synchronize
        if(uploadFileList.length === 0) {
            syncUp(callback);
            return;
        }

        // Dequeue a fileDesc to synchronize
        var fileDesc = uploadFileList.pop();
        uploadSyncAttributesList = _.values(fileDesc.syncLocations);
        if(uploadSyncAttributesList.length === 0) {
            fileUp(callback);
            return;
        }

        // Get document title/content
        uploadContent = fileDesc.content;
        uploadContentCRC = utils.crc32(uploadContent);
        uploadTitle = fileDesc.title;
        uploadTitleCRC = utils.crc32(uploadTitle);
        locationUp(callback);
    }

    // Entry point for up synchronization (upload changes)
    var uploadCycle = false;
    function syncUp(callback) {
        if(uploadCycle === true) {
            // New upload cycle
            uploadCycle = false;
            uploadFileList = _.values(fileSystem);
            fileUp(callback);
        }
        else {
            callback();
        }
    }

    // Recursive function to download changes from multiple providers
    var providerList = [];
    function providerDown(callback) {
        if(providerList.length === 0) {
            callback();
            return;
        }
        var provider = providerList.pop();

        // Check that provider has files to sync
        if(!synchronizer.hasSync(provider)) {
            providerDown(callback);
            return;
        }

        // Perform provider's syncDown
        provider.syncDown(function(error) {
            if(error) {
                callback(error);
                return;
            }
            providerDown(callback);
        });
    }

    // Entry point for down synchronization (download changes)
    function syncDown(callback) {
        providerList = _.values(providerMap);
        providerDown(callback);
    }

    // Listen to offline status changes
    var isOffline = false;
    eventMgr.addListener("onOfflineChanged", function(isOfflineParam) {
        isOffline = isOfflineParam;
    });

    // Main entry point for synchronization
    var syncRunning = false;
    synchronizer.sync = function() {
        // If sync is already running or offline
        if(syncRunning === true || isOffline === true) {
            return false;
        }
        syncRunning = true;
        eventMgr.onSyncRunning(true);
        uploadCycle = true;

        function isError(error) {
            if(error !== undefined) {
                syncRunning = false;
                eventMgr.onSyncRunning(false);
                return true;
            }
            return false;
        }

        syncDown(function(error) {
            if(isError(error)) {
                return;
            }
            syncUp(function(error) {
                if(isError(error)) {
                    return;
                }
                syncRunning = false;
                eventMgr.onSyncRunning(false);
                eventMgr.onSyncSuccess();
            });
        });
        return true;
    };

    /***************************************************************************
     * Realtime synchronization
     **************************************************************************/

    var realtimeFileDesc;
    var realtimeSyncAttributes;
    var isOnline = true;

    // Determines if open file has real time sync location and tries to start
    // real time sync
    function onFileOpen(fileDesc) {
        realtimeFileDesc = _.some(fileDesc.syncLocations, function(syncAttributes) {
            realtimeSyncAttributes = syncAttributes;
            return syncAttributes.isRealtime;
        }) ? fileDesc : undefined;
        tryStartRealtimeSync();
    }

    // Tries to start/stop real time sync on online/offline event
    function onOfflineChanged(isOfflineParam) {
        if(isOfflineParam === false) {
            isOnline = true;
            tryStartRealtimeSync();
        }
        else {
            synchronizer.tryStopRealtimeSync();
            isOnline = false;
        }
    }

    // Starts real time synchronization if:
    // 1. current file has real time sync location
    // 2. we are online
    function tryStartRealtimeSync() {
        if(realtimeFileDesc !== undefined && isOnline === true) {
            realtimeSyncAttributes.provider.startRealtimeSync(realtimeFileDesc, realtimeSyncAttributes);
        }
    }

    // Stops previously started synchronization if any
    synchronizer.tryStopRealtimeSync = function() {
        if(realtimeFileDesc !== undefined && isOnline === true) {
            realtimeSyncAttributes.provider.stopRealtimeSync();
        }
    };

    // Triggers realtime synchronization from eventMgr events
    if(window.viewerMode === false) {
        eventMgr.addListener("onFileOpen", onFileOpen);
        eventMgr.addListener("onFileClosed", synchronizer.tryStopRealtimeSync);
        eventMgr.addListener("onOfflineChanged", onOfflineChanged);
    }

    /***************************************************************************
     * Initialize module
     **************************************************************************/

    // Initialize the export dialog
    function initExportDialog(provider) {

        // Reset fields
        utils.resetModalInputs();

        // Load preferences
        var exportPreferences = utils.retrieveIgnoreError(provider.providerId + ".exportPreferences");
        if(exportPreferences) {
            _.each(provider.exportPreferencesInputIds, function(inputId) {
                var exportPreferenceValue = exportPreferences[inputId];
                if(_.isBoolean(exportPreferenceValue)) {
                    utils.setInputChecked("#input-sync-export-" + inputId, exportPreferenceValue);
                }
                else {
                    utils.setInputValue("#input-sync-export-" + inputId, exportPreferenceValue);
                }
            });
        }

        // Open dialog
        $(".modal-upload-" + provider.providerId).modal();
    }

    eventMgr.addListener("onFileCreated", function(fileDesc) {
        if(_.size(fileDesc.syncLocations) === 0) {
            _.each(providerMap, function(provider) {
                provider.autosyncConfig.enabled && provider.autosyncFile(fileDesc.title, fileDesc.content, provider.autosyncConfig, function(error, syncAttributes) {
                    if(error) {
                        return;
                    }
                    fileDesc.addSyncLocation(syncAttributes);
                    eventMgr.onSyncExportSuccess(fileDesc, syncAttributes);
                });
            });
        }
    });

    eventMgr.addListener("onReady", function() {
        // Init each provider
        _.each(providerMap, function(provider) {
            // Provider's import button
            $(".action-sync-import-" + provider.providerId).click(function(event) {
                provider.importFiles(event);
            });
            // Provider's export action
            $(".action-sync-export-dialog-" + provider.providerId).click(function() {
                initExportDialog(provider);
            });
            // Provider's autosync action
            $(".action-autosync-dialog-" + provider.providerId).click(function() {
                // Reset fields
                utils.resetModalInputs();
                // Load config
                provider.setAutosyncDialogConfig(provider);
                // Open dialog
                $(".modal-autosync-" + provider.providerId).modal();
            });
            $(".action-sync-export-" + provider.providerId).click(function(event) {
                var isRealtime = utils.getInputChecked("#input-sync-export-" + provider.providerId + "-realtime");
                var fileDesc = fileMgr.currentFile;

                if(isRealtime) {
                    if(_.size(fileDesc.syncLocations) > 0) {
                        eventMgr.onError("Real time collaborative document can't be synchronized with multiple locations");
                        return;
                    }
                    // Perform the provider's real time export
                    provider.exportRealtimeFile(event, fileDesc.title, fileDesc.content, function(error, syncAttributes) {
                        if(error) {
                            return;
                        }
                        syncAttributes.isRealtime = true;
                        fileDesc.addSyncLocation(syncAttributes);
                        eventMgr.onSyncExportSuccess(fileDesc, syncAttributes);

                        // Start the real time sync
                        realtimeFileDesc = fileDesc;
                        realtimeSyncAttributes = syncAttributes;
                        tryStartRealtimeSync();
                    });
                }
                else {
                    if(_.size(fileDesc.syncLocations) > 0 && _.first(_.values(fileDesc.syncLocations)).isRealtime) {
                        eventMgr.onError("Real time collaborative document can't be synchronized with multiple locations");
                        return;
                    }
                    // Perform the provider's standard export
                    provider.exportFile(event, fileDesc.title, fileDesc.content, function(error, syncAttributes) {
                        if(error) {
                            return;
                        }
                        fileDesc.addSyncLocation(syncAttributes);
                        eventMgr.onSyncExportSuccess(fileDesc, syncAttributes);
                    });
                }

                // Store input values as preferences for next time we open the
                // export dialog
                var exportPreferences = {};
                _.each(provider.exportPreferencesInputIds, function(inputId) {
                    var inputElt = document.getElementById("input-sync-export-" + inputId);
                    if(inputElt.type == 'checkbox') {
                        exportPreferences[inputId] = inputElt.checked;
                    }
                    else {
                        exportPreferences[inputId] = inputElt.value;
                    }
                });
                storage[provider.providerId + ".exportPreferences"] = JSON.stringify(exportPreferences);
            });
            $(".action-autosync-" + provider.providerId).click(function(event) {
                var config = provider.getAutosyncDialogConfig(event);
                if(config !== undefined) {
                    storage[provider.providerId + ".autosyncConfig"] = JSON.stringify(config);
                    provider.autosyncConfig = config;
                }
            });
        });
    });

    eventMgr.onSynchronizerCreated(synchronizer);
    return synchronizer;
});
