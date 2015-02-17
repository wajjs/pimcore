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


/**
 * NOTE: This helper-methods are added to the classes pimcore.object.edit, pimcore.object.fieldcollection,
 * pimcore.object.tags.localizedfields
 */

pimcore.registerNS("pimcore.object.helpers.grid");
pimcore.object.helpers.grid = Class.create({

    limit: 20,
    baseParams: {},
    showSubtype: true,
    showKey: true,
    enableEditor: false,

    initialize: function(selectedClass, fields, url, baseParams, isSearch) {
        this.selectedClass = selectedClass;
        this.fields = fields;
        this.isSearch = isSearch;

        this.url = url;
        if(baseParams) {
            this.baseParams = baseParams;
        } else {
            this.baseParams = {};
        }

        if(!this.baseParams.limit) {
            this.baseParams.limit = this.limit;
        }
        if(!this.baseParams["class"]) {
            this.baseParams["class"] = this.selectedClass;
        }

        var fieldParam = [];
        for(var i = 0; i < fields.length; i++) {
            fieldParam.push(fields[i].key);
        }

        this.baseParams['fields[]'] = fieldParam;
    },

    getStore: function() {

        // the store
        var readerFields = [];
        readerFields.push({name: "id", allowBlank: true});
        readerFields.push({name: "idPath", allowBlank: true});
        readerFields.push({name: "fullpath", allowBlank: true});
        readerFields.push({name: "published", allowBlank: true});
        readerFields.push({name: "type", allowBlank: true});
        readerFields.push({name: "subtype", allowBlank: true});
        readerFields.push({name: "filename", allowBlank: true});
        readerFields.push({name: "classname", allowBlank: true});
        readerFields.push({name: "creationDate", allowBlank: true});
        readerFields.push({name: "modificationDate", allowBlank: true});
        readerFields.push({name: "inheritedFields", allowBlank: false});
        readerFields.push({name: "metadata", allowBlank: true});
        readerFields.push({name: "#kv-tr", allowBlank: true});

        for (var i = 0; i < this.fields.length; i++) {
            readerFields.push({name: this.fields[i].key, allowBlank: true});
        }


        var proxy = {
            type: 'ajax',
            url: this.url,
            reader: {
                type: 'json',
                totalProperty: 'total',
                successProperty: 'success',
                rootProperty: 'data'
            },
            api: {
                create  : this.url + "?xaction=create",
                read    : this.url + "?xaction=read",
                update  : this.url + "?xaction=update",
                destroy : this.url + "?xaction=destroy"
            },
            actionMethods: {
                create : 'GET',
                read   : 'GET',
                update : 'GET',
                destroy: 'GET'
            },
            extraParams: this.baseParams
        };

        var writer = null;
        var listeners = {};
        if(this.enableEditor) {
            proxy.writer = {
                type: 'json',
                writeAllFields: true,
                rootProperty: 'data',
                encode: 'true',
                listeners: {
                    exception: function (conn, mode, action, request, response, store) {
                        if(action == "update") {
                            Ext.MessageBox.alert(t('error'),
                                t('cannot_save_object_please_try_to_edit_the_object_in_detail_view'));
                            this.store.rejectChanges();
                        }
                    }.bind(this)
                }
            }
        };

        this.store = new Ext.data.Store({
            remoteSort: true,
            listeners: listeners,
            autoDestroy: true,
            fields: readerFields,
            proxy: proxy,
            autoSync: true
        });

        return this.store;

    },

    selectionColumn: null,
    getSelectionColumn: function() {
        if(this.selectionColumn == null) {
            this.selectionColumn = new Ext.selection.CheckboxModel();
        }
        return this.selectionColumn;
    },

    getGridColumns: function() {
        // get current class
        var classStore = pimcore.globalmanager.get("object_types_store");
        var klassIndex = classStore.findExact("text", this.selectedClass);
        var klass = classStore.getAt(klassIndex);
        var propertyVisibility = klass.get("propertyVisibility");

        if(this.isSearch) {
            propertyVisibility = propertyVisibility.search;
        } else {
            propertyVisibility = propertyVisibility.grid;
        }
        var showKey = propertyVisibility.path;
        if(this.showKey) {
            showKey = true;
        }

        // init grid-columns
        var gridColumns = [];

        if(this.enableEditor) {
            var selectionColumn = this.getSelectionColumn();
            gridColumns.push(selectionColumn);
        }


        var fields = this.fields;
        for (var i = 0; i < fields.length; i++) {

            var field = fields[i];
//            console.log(field);
            if(field.key == "subtype") {
                gridColumns.push({header: t("type"), flex: this.getColumnWidth(field, 40), sortable: true, dataIndex: 'subtype',
                    hidden: !this.showSubtype,
                    renderer: function (value, metaData, record, rowIndex, colIndex, store) {
                        return '<div style="height: 16px;" class="pimcore_icon_asset  pimcore_icon_'
                        + value + '" name="' + t(record.data.subtype) + '">&nbsp;</div>';
                    }});
            } else if(field.key == "id") {
                gridColumns.push({header: 'ID', width: this.getColumnWidth(field, this.getColumnWidth(field, 40)), sortable: true,
                    dataIndex: 'id'/*, hidden: !propertyVisibility.id*/});
            } else if(field.key == "published") {
                gridColumns.push(new Ext.grid.column.Check({
                    header: t("published"),
                    flex: 40,
                    sortable: true,
                    dataIndex: "published"
                    //,
                    //renderer: function (key, value, metaData, record, rowIndex, colIndex, store) {
                    //    metaData.css += ' x-grid-check-col-td';
                    //    return String.format('<div class="x-grid3-check-col{0}">&#160;</div>', value ? '-on' : '');
                    //}.bind(this, field.key)
                }));
            } else if(field.key == "fullpath") {
                gridColumns.push({header: t("path"), flex: this.getColumnWidth(field, 200), sortable: true,
                    dataIndex: 'fullpath'/*, hidden: !propertyVisibility.path*/});
            } else if(field.key == "filename") {
                gridColumns.push({header: t("filename"), flex: this.getColumnWidth(field, 200), sortable: true,
                    dataIndex: 'filename', hidden: !showKey});
            } else if(field.key == "classname") {
                gridColumns.push({header: t("class"), flex: this.getColumnWidth(field, 200), sortable: true,
                    dataIndex: 'classname',renderer: function(v){return ts(v);}/*, hidden: true*/});
            } else if(field.key == "creationDate") {
                gridColumns.push({header: t("creationdate") + " (System)", flex: this.getColumnWidth(field, 200), sortable: true,
                    dataIndex: "creationDate", editable: false, renderer: function(d) {
                        var date = new Date(d * 1000);
                        return Ext.Date.format(date, "Y-m-d H:i:s");
                    }/*, hidden: !propertyVisibility.creationDate*/});
            } else if(field.key == "modificationDate") {
                gridColumns.push({header: t("modificationdate") + " (System)", flex: this.getColumnWidth(field, 200), sortable: true,
                    dataIndex: "modificationDate", editable: false, renderer: function(d) {
                        var date = new Date(d * 1000);
                        return Ext.Date.format(date, "Y-m-d H:i:s");
                    }/*, hidden: !propertyVisibility.modificationDate*/});
            } else {
                var fc = pimcore.object.tags[fields[i].type].prototype.getGridColumnConfig(field);
                fc.flex = this.getColumnWidth(field, 100);
                gridColumns.push(fc);
                gridColumns[gridColumns.length-1].hidden = false;
                gridColumns[gridColumns.length-1].layout = fields[i];
            }
        }

        return gridColumns;
    },

    getColumnWidth: function(field, defaultValue) {
        if (field.width) {
            return field.width;
        } else {
            return defaultValue;
        }
    },

    getGridFilters: function() {
        var configuredFilters = [{
            type: "date",
            dataIndex: "creationDate"
        },{
            type: "date",
            dataIndex: "modificationDate"
        }
        ];

        var fields = this.fields;
        for (var i = 0; i < fields.length; i++) {

            if(fields[i].key != "id" && fields[i].key != "published"
                && fields[i].key != "filename" && fields[i].key != "classname"
                && fields[i].key != "creationDate" && fields[i].key != "modificationDate") {

                if (fields[i].key == "fullpath") {
                    configuredFilters.push({
                        type: "string",
                        dataIndex: "fullpath"
                    });
                } else {
                    var filter = pimcore.object.tags[fields[i].type].prototype.getGridColumnFilter(fields[i]);
                    if (filter) {
                        configuredFilters.push(filter);
                    }
                }
            }

        }

        // filters
        var gridfilters = {
            encode: true,
            local: false,
            filters: configuredFilters
        };

        return gridfilters;

    },

    applyGridEvents: function(grid) {
        var fields = this.fields;
        for (var i = 0; i < fields.length; i++) {

            if(fields[i].key != "id" && fields[i].key != "published" && fields[i].key != "fullpath"
                && fields[i].key != "filename" && fields[i].key != "classname"
                && fields[i].key != "creationDate" && fields[i].key != "modificationDate") {


                pimcore.object.tags[fields[i].type].prototype.applyGridEvents(grid, fields[i]);
            }

        }
    }

});