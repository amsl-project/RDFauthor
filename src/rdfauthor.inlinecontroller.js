function InlineController(options) {
    // default options
    var defaultOptions = {
        useAnimations: true,
        animationTime: 250, // ms
        container: function (statement) {
            // return RDFauthor.elementForStatement(statement);
        }
    };

    // overwrite defaults if supplied
    this._options = jQuery.extend(defaultOptions, options);

    // rows by (s,p,o) key
    this._rows     = {};
    this._rowsByID = {};
    this._rowCount = 0;

    this.addWidget = function (statement, constructor, options) {
        var element  = this._options.container(statement);
        var _options = $.extend({
            container: element,
            activate: false
        }, options);

        var predicateURI = statement.predicateURI();
        var rowID        = RDFauthor.nextID();
        var rowKey       = String(Math.random());

        var row = new PredicateRow(statement.subjectURI(),
                                   statement.predicateURI(),
                                   null,
                                   _options.container,
                                   rowID);

        this._rows[rowKey] = row;
        this._rowsByID[rowID] = row;
        this._rowCount++;

        return row.addWidget(statement, constructor, _options.activate);
    }
}

InlineController.prototype = {
    reset: function () {

    },

    submit: function () {
        var submitOk = true;
        for (var index in this._rows) {
            submitOk &= this._rows[index].submit();
        }

        return submitOk;
    },

    resetToUnedit: function(values) {
        var subjectURI;
        var predicateURI;
        var predicateCount = 0;
        var liCount = 0;
        var forceReload = false;

        for (var index in this._rows) {
            var element = jQuery('#' + this._rows[index].cssID()).parent();
            if(element.length == 0 && RDFAUTHOR_START_FIX == "editSingleTerm"){
                continue;
            }
            // test if there is a value for a new predicate
            if ((predicateURI == this._rows[index]._predicateURI) && (subjectURI == this._rows[index]._subjectURI)) {
                predicateCount += 1;
            }
            predicateURI = this._rows[index]._predicateURI;
            subjectURI = this._rows[index]._subjectURI;
            predicateCount = 1;
            var updateValues = values[predicateURI];

            // This will force a reload as soon as a type is added. This might or
            // might not be desirable. On the one hand, as soon as a type is given
            // other properties will be suggested (especially with templates).
            // On the other hand, a user might not care too much about suggested
            // properties. Also reload will occur whenever the type is touched
            // which might also be annoying.
            if (predicateURI === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
                //forceReload = true;
                //$('.innercontent').append('<div class="suggestion">' + _translate('Reload suggested') + '</div>');
            }

            // make visible again and disable edit mode only necessary
            // for the first of (possibly) many equal predicates
            if (predicateCount == 1) {
                element.removeAttr('class');
                element.attr('class', 'has-contextmenu-area');
            }
            element.children('.contextmenu').removeAttr('style');
            element.children('.bullets-none').removeAttr('style');
            if (element.find('ul').length == 0) {
                var contextmenu='<div class="contextmenu"><a class="item rdfauthor-edit-property" onclick="editProperty(event)"> \
                    <span class="icon icon-edit" title="Edit Values"> \
                    <span>Show as List</span> \
                    </span> \
                </a></div>';
                element.append('<div class="has-contextmenu-area">' + contextmenu + '<ul class="bullets-none"><li></li></ul></div>');
            }
            if(RDFAUTHOR_START_FIX != "editSingleTerm") {
                liCount = 0;
            }
            var widgetCount = 0;
            for (var wid in this._rows[index]._widgets) {

                var widget = this._rows[index]._widgets[wid];
                    widgetCount += 1;
                    var widgetType;
                    try {
                        widgetType = this._rows[index]._widgets[wid].getWidgetType();
                    }
                    catch (exception) {
                        widgetType = null;
                    }

                    if (widgetCount > 1) {
                        var li = element.find('ul li:eq(' + (liCount - 1) + ')');
                        var newLi = $(li.clone([true, true]));
                        newLi.removeAttr('id');
                        li.after(newLi);
                    }
                    var li = element.find('ul li:eq(' + liCount + ')');
                    if (widget.removeOnSubmit) {
                        li.attr('rdfauthor-remove', true);
                    }
                    liCount += 1;

                    // in case of a decimal type the ending ".0" gets added automatically when editing.
                    // this needs to be removed in order to check if the value occurs in the ontowiki response
                    if (widget.statement._object !=  null && typeof widget.statement._object.datatype != 'undefined'){
                        var datatype1 = widget.statement._object.datatype._string;
                    }else{
                        if(typeof RDFAUTHOR_DATATYPES_FIX_ADDITIONAL_DATA != "undefined" &&
                        	typeof RDFAUTHOR_DATATYPES_FIX_ADDITIONAL_DATA[widget.statement._predicate.value._string] != "undefined") {
                            var datatype1 = RDFAUTHOR_DATATYPES_FIX_ADDITIONAL_DATA[widget.statement._predicate.value._string][0]['range'][0]
                        }else{
                            var datatype1 = "undefined";
                        }
                    }

                    var value1 = widget.value();
                    if(datatype1 == "http://www.w3.org/2001/XMLSchema#decimal" && value1 != null){
                        if(value1.includes(".")){
                            while(value1.endsWith("0")){
                                value1 = value1.substring(0, value1.length - 1);
                            }
                        }
                        if(value1.endsWith(".")) {
                            value1 = value1.replace(".", "");
                        }

                    }
                    if ($.inArray(value1, updateValues) != -1) {
                        var success = true;
                        updateValues = $.grep(updateValues, function (value) {
                            return value != value1
                        });
                    }
                if(value1 == null){
                    var success = true;
                }

                    switch (widgetType) {
                        case 'literal':
                        case 'resource':
                        case 'datetime':
                        case 'dropdown':
                            this._rows[index]._widgets[wid].resetMarkup(li, success);
                            break;

                        default:
                            forceReload = true;
                            console.log('Falling back to reload!');
                    }
                if (forceReload === true) {
                    $('body').append("<div class='modal-wrapper spinner-wrapper'>" + '</div>');
                    window.setTimeout(function () {
                        window.location.href = window.location.href;
                    }, 1000);
                }
            }
        }
        /*
        if (updateValues.length > 0) {
            element.find('ul').append("<li>Warning: " + updateValues.length + " more value(s)</li>");
        }
        */
        // remove data RDFauthor added
        $('.rdfauthor-statement-provider').removeAttr('id');
        $('.rdfauthor-statement-provider').removeClass('rdfauthor-statement-provider');
        // remove all widgets that RDFauthor has opened
        $('div.rdfauthor-predicate-row').remove();
        $('li[rdfauthor-remove=true]').remove();
    },

    cancel: function () {
        for (var index in this._rows) {
            result &= this._rows[index].cancel();
        }
    },

    show: function (animated) {
        for (var index in this._subjects) {
            var group = this._subjects[index];
            $(group.getElement()).parent().children().hide();
            group.show();
        }
    },

    hide: function (animated, callback) {
        for (var index in this._subjects) {
            var group = this._subjects[index];
            $(group.getElement()).parent().children().show();
            group.hide();
        }
    }
}
