/**
 * Pimcore
 *
 * LICENSE
 *
 * This source file is subject to the new BSD license that is bundled
 * with this package in the file LICENSE.txt.
 * It is also available through the world-wide-web at this URL:
 * http://www.pimcore.org/license
 *
 * @copyright  Copyright (c) 2009-2014 pimcore GmbH (http://www.pimcore.org)
 * @license    http://www.pimcore.org/license     New BSD License
 */

pimcore.registerNS("pimcore.settings.translations");
pimcore.settings.translations = Class.create({


    filterField: null,
    preconfiguredFilter: "",

    initialize: function (filter) {

        this.filterField = new Ext.form.TextField({
            xtype: "textfield",
            width: 200,
            style: "margin: 0 10px 0 0;",
            enableKeyEvents: true,
            value: this.preconfiguredFilter,
            listeners: {
                "keydown" : function (field, key) {
                    if (key.getKey() == key.ENTER) {
                        var input = field;
                        var proxy = this.store.getProxy();
                        proxy.extraParams.filter = input.getValue();
                        this.store.load();
                    }
                }.bind(this)
            }
        });

        this.preconfiguredFilter = filter;
        this.filterField.setValue(filter);
        this.getAvailableLanguages();
    },


    getRowEditor: function () {

        var StateFullProvider = Ext.extend(Ext.state.Provider, {
            namespace: "default",

            constructor : function(config){
                StateFullProvider.superclass.constructor.call(this);
                Ext.apply(this, config);

                var data = localStorage.getItem(this.namespace);
                if (!data) {
                    this.state = {};
                } else {
                    data = JSON.parse(data);
                    if (data.state && data.user == pimcore.currentuser.id) {
                        this.state = data.state;
                    } else {
                        this.state = {};
                    }
                }
            },

            get : function(name, defaultValue){
                try {
                    if (typeof this.state[name] == "undefined") {
                        return defaultValue
                    } else {
                        return this.decodeValue(this.state[name])
                    }
                } catch (e) {
                    this.clear(name);
                    return defaultValue;
                }
            },
            set : function(name, value){
                try {
                    if (typeof value == "undefined" || value === null) {
                        this.clear(name);
                        return;
                    }
                    this.state[name] = this.encodeValue(value)

                    var data = {
                        state: this.state,
                        user: pimcore.currentuser.id
                    };
                    var json = JSON.stringify(data);

                    localStorage.setItem(this.namespace, json);
                } catch (e) {
                    this.clear(name);
                }

                this.fireEvent("statechange", this, name, value);
            }
        });

        var provider = new StateFullProvider({
            namespace : "pimcore_ui_states"
        });


        Ext.state.Manager.setProvider(provider);

        var stateId = "tr_" + this.translationType;
        var applyInitialSettings = false;
        var showInfo = false;
        var state = provider.get(stateId, null);
        var languages = this.languages;

        var maxCols = 7;   // include creation date / modification date / action column)
        var maxLanguages = maxCols - 3;

        if (state == null) {
            applyInitialSettings = true;
            if (languages.length > maxLanguages) {
                showInfo = true;
            }
        } else {
            if (state.columns) {
                for (var i = 0; i < state.columns.length; i++) {
                    var colState = state.columns[i];
                    if (colState.hidden) {
                        showInfo = true;
                        break;
                    }
                }
            }
        }

        var readerFields = [
            {name: 'key', allowBlank: false},
            {name: 'creationDate', allowBlank: true},
            {name: 'modificationDate', allowBlank: true}
        ];

        var typesColumns = [
            {header: t("key"), sortable: true, dataIndex: 'key', editable: false}

        ];

        for (var i = 0; i < languages.length; i++) {

            readerFields.push({name: languages[i]});
            //TODO do we really need the id attribute?
            var columnConfig = {cls: "x-column-header_" + languages[i].toLowerCase() , header: pimcore.available_languages[languages[i]], sortable: false, dataIndex: languages[i],
                editor: new Ext.form.TextField({}), id: "translation_column_" + this.translationType + "_" + languages[i].toLowerCase()};
            if (applyInitialSettings) {
                var hidden = i >= maxLanguages;
                columnConfig.hidden = hidden;
            }

            typesColumns.push(columnConfig);
        }

        if (showInfo) {
            pimcore.helpers.showNotification(t("info"), t("there_are_more_columns"), null, null, 2000);
        }

        var dateRenderer = function(d) {
            var date = new Date(d * 1000);
            return Ext.Date.format(date, "Y-m-d H:i:s");
        };
        typesColumns.push({header: t("creationDate"), sortable: true, dataIndex: 'creationDate', editable: false,
            renderer: dateRenderer
        });
        typesColumns.push({header: t("modificationDate"), sortable: true, dataIndex: 'modificationDate', editable: false
            ,renderer: dateRenderer
        })
        ;

        typesColumns.push({
            xtype: 'actioncolumn',
            width: 30,
            items: [{
                tooltip: t('delete'),
                icon: "/pimcore/static/img/icon/cross.png",
                handler: function (grid, rowIndex) {
                    grid.getStore().removeAt(rowIndex);
                }.bind(this)
            }]
        });

        this.modelName = 'pimcore.model.translations.' + this.translationType;

        if (!Ext.ClassManager.get(this.modelName)) {

            var url = this.dataUrl;
            if(url.indexOf('?') === -1) {
                url = url + "?";
            } else {
                url = url + "&";
            }

            Ext.define(this.modelName, {
                extend: 'Ext.data.Model',
                idProperty: 'key',
                fields: readerFields,

                proxy: {
                    type: 'ajax',
                    api: {
                        create  : url + "xaction=create",
                        read    : url + "xaction=read",
                        update  : url + "xaction=update",
                        destroy : url + "xaction=destroy"
                    },
                    actionMethods: {
                        create : 'POST',
                        read   : 'POST',
                        update : 'POST',
                        destroy: 'POST'
                    },
                    extraParams: {
                        limit: itemsPerPage,
                        filter: this.preconfiguredFilter
                    },

                    // Reader is now on the proxy, as the message was explaining
                    reader: {
                        type: 'json',
                        rootProperty: 'data'
                        //totalProperty:'total',            // default
                        //successProperty:'success'         // default
                    }
                    ,                                     // default
                    writer: {
                        type: 'json',
                        writeAllFields: true,
                        rootProperty: 'data',
                        encode: 'true'
                    },
                    listeners: {
                        exception: function(proxy, response, operation){
                            Ext.MessageBox.show({
                                title: 'REMOTE EXCEPTION',
                                msg: operation.getError(),
                                icon: Ext.MessageBox.ERROR,
                                buttons: Ext.Msg.OK
                            });
                        }
                    }
                }
            });
        }


        var itemsPerPage = 20;
        this.store = new Ext.data.Store({
            id: 'translation_store',
            model: this.modelName,
            remoteSort: true,
            autoSync: true,
            listeners: {
                write : function(store, action, result, response, rs) {
                }
            }
        });

        this.pagingtoolbar = Ext.create('Ext.toolbar.Paging', {
            pageSize: itemsPerPage,
            store: this.store,
            displayInfo: true,
            displayMsg: '{0} - {1} / {2}',
            emptyMsg: t("no_items_found")
        });

        // add per-page selection
        this.pagingtoolbar.add("-");

        this.pagingtoolbar.add(new Ext.Toolbar.TextItem({
            text: t("items_per_page")
        }));
        this.pagingtoolbar.add(new Ext.form.ComboBox({
            store: [
                [10, "10"],
                [20, "20"],
                [40, "40"],
                [60, "60"],
                [80, "80"],
                [100, "100"]
            ],
            mode: "local",
            width: 50,
            value: 20,
            triggerAction: "all",
            listeners: {
                select: function (box, rec, index) {
                    var store = this.pagingtoolbar.getStore();
                    store.setPageSize(intval(rec.data.field1));
                    this.pagingtoolbar.moveFirst();
                }.bind(this)
            }
        }));

        //var rowEditing = Ext.create('Ext.grid.plugin.RowEditing', {
        //    clicksToMoveEditor: 1,
        //    autoCancel: false
        //});

        this.cellEditing = Ext.create('Ext.grid.plugin.CellEditing', {
            clicksToEdit: 1
        });

        this.grid = Ext.create('Ext.grid.Panel', {
            frame: false,
            autoScroll: true,
            store: this.store,
            columnLines: true,
            stripeRows: true,
            columns : {
                items: typesColumns,
                defaults: {
                    flex: 1
                }
            },
            trackMouseOver: true,
            bbar: this.pagingtoolbar,
            stateful: true,
            stateId: stateId,
            stateEvents: ['columnmove', 'columnresize', 'sortchange', 'groupchange'],
            selModel: Ext.create('Ext.selection.RowModel', {}),
            plugins: [
                this.cellEditing,
                {
                    ptype: 'datatip',
                    tpl: t('click_to_edit')
                }
            ],
            tbar: [
                {
                    text: t('add'),
                    handler: this.onAdd.bind(this),
                    iconCls: "pimcore_icon_add"
                },
                '-',{
                    text: this.getHint(),
                    xtype: "tbtext",
                    style: "margin: 0 10px 0 0;"
                },
                "->",
                {
                    text: t('cleanup'),
                    handler: this.cleanup.bind(this),
                    iconCls: "pimcore_icon_cleanup"
                },
                "-",
                {
                    text: t('merge_csv'),
                    handler: this.doMerge.bind(this),
                    iconCls: "pimcore_icon_merge"
                },
                "-",
                {
                    text: t('import_csv'),
                    handler: this.doImport.bind(this),
                    iconCls: "pimcore_icon_import"
                },
                '-',
                {
                    text: t('export_csv'),
                    handler: this.doExport.bind(this),
                    iconCls: "pimcore_icon_export"
                },'-',{
                    text: t("filter") + "/" + t("search"),
                    xtype: "tbtext",
                    style: "margin: 0 10px 0 0;"
                },this.filterField
            ],
            viewConfig: {
                forceFit: true,
                loadingText: t('loading_texts')
            }
        });

        this.store.load();

        return this.grid;
    },

    doImport:function(){
        pimcore.helpers.uploadDialog(this.importUrl, "Filedata", function() {
            this.store.reload();
        }.bind(this), function () {
            Ext.MessageBox.alert(t("error"), t("error"));
        });
    },

    doMerge:function(){
        pimcore.helpers.uploadDialog(this.mergeUrl, "Filedata", function(result) {
            var data = result.response.responseText;
            data = Ext.decode(data);

            var merger = new pimcore.settings.translation.translationmerger(this.translationType, data, this);
            this.refresh();
        }.bind(this), function () {
            Ext.MessageBox.alert(t("error"), t("error"));
        });
    },

    refresh: function() {
        this.store.reload();
    },


    doExport:function(){

        if(this.filterField.getValue()) {
            Ext.MessageBox.confirm("", t("filter_active_message"), function (buttonValue) {
                if (buttonValue == "yes") {
                    window.open(Ext.urlAppend(this.exportUrl, "filter=" + this.filterField.getValue()));
                } else {
                    window.open(this.exportUrl);
                }
            }.bind(this));
        } else {
            window.open(this.exportUrl);
        }
    },

    onAdd: function (btn, ev) {

        Ext.MessageBox.prompt("", t("please_enter_the_new_name"), function (button, value) {
            if(button == "ok") {
                this.cellEditing.cancelEdit();

                var u = Ext.create(this.modelName);
                u.set("key", value);
                this.grid.store.insert(0, [u]);

                this.cellEditing.startEditByPosition({
                    row: 0,
                    column: 1
                });


            }

        }.bind(this));
    },

    cleanup: function () {
        Ext.Ajax.request({
            url: this.cleanupUrl,
            success: function (response) {
                this.store.reload();
            }.bind(this)
        });
    }
});
