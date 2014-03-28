/**
 * Created by Nesson on 3/26/2014.
 */

/**
 * Function to parse 'pattern' values into an object
 */
var parseExpressionToObject = function(source){

    if(!source) return null;

    var expression = new Object();

    var requiredRegx = /^(required\s*:\s*(true|false)?\s*(,)?)?/i,

        validTypeRegx = /(validType\s*:\s*(.*))$/i;

    //index number refer to regular expression pattern.
    //1.check existing
    //2.specify boolean value
    var requiredRet = requiredRegx.exec(source);
    expression.required = requiredRet ? requiredRet[2] === 'true' : false;

    //index number refer to regular expression pattern.
    //1.check existing
    //2.specify value and separate into array
    var validTypeRet = validTypeRegx.exec(source);
    var validTypeStr = validTypeRet ? validTypeRet[2] : null;

    validTypeStr = validTypeStr ? validTypeStr.replace(/(^{|}$|\s)/g, '') : null;

    //support &, &&
    var properties = !validTypeStr ? null : validTypeStr.split(/&&|&/), arr = new Array();

    if(properties){
        $.each(properties, function(index, property){
            arr[index] = property;
        })
    }

    expression.validType = arr;

    return expression;
}

//extend String's prototype
if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}

//compatible with IE 6 7 8 9
if(!String.prototype.trim){
    String.prototype.trim = function trim() {
        return this.toString().replace(/^([\s]*)|([\s]*)$/g, '');
    };
}

/**
 * Detect field context length
 * Param: form field element
 */
var fieldIsBlank = function(field){
    return $(field).val().trim().length === 0 ? true : false;
};

var execValidation = function(field, criteria){

    //replace /[\n\r]/g to support textarea stuffs.
    var val = $(field).val().replace(/[\n\r]/g, '');
    //regex
    if(typeof(criteria) != "function"){
        return criteria.test(val);
    }
    //function
    return criteria(val);
};

var showErrorMessage = function(element, errmessage){

    var errorLbl = $(element).next('label');

    if(!errorLbl.html()) {
        errorLbl = $("<label class='sugar_validation_error_message' style='color:red'>{0}</label>".format(errmessage));
    }else{
        errorLbl.html(errmessage);
    }
    errorLbl.insertAfter(element);
}

var removeErrorMessage = function(element){
    $(element).next('label').remove();
}

var markOnField = function(field){
    var $ele = $(field);
    $ele.attr('ori-border-color', $ele.css('border-color'));
    $ele.attr('ori-background-color', $ele.css('background-color'));
    $ele.css('border-color', '#DC322F')
        .css('background-color', "#FEE6E7");
    var errorInfo = $ele.attr('invalidMessage') == undefined ? "Filed is not validated!" : $ele.attr('invalidMessage');
    showErrorMessage(field, errorInfo);
    return true;
}

var markOffField = function(field){
    var $ele = $(field);
    ($ele.attr('ori-border-color') != undefined) && $ele.css('border-color', $ele.attr('ori-border-color'));
    ($ele.attr('ori-background-color') != undefined) && $ele.css('background-color', $ele.attr('ori-background-color'));
    removeErrorMessage(field);
    return true;
}


var regexs = {
    'undefined': false,
    'number' : /^\d*$/,
    'email' : /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/,
    'url' : /^(ht|f)tps?:\/\/[a-z0-9-\.]+\.[a-z]{2,4}\/?([^\s<>\#%"\,\{\}\\|\\\^\[\]`]+)?$/
}

var regexs2 = {

    'length' : function(array){
        return array.length != 1 ?
               //double params
               new RegExp('^.{{0},{1}}$'.format(array[0], array[1])) :
               //single param, default from 0
               new RegExp('^.{0,{0}}$'.format(array[0]));
    },

    'minNum' : function(array){
        return function(val){
            return !$.isNumeric(val) ?
                   false :
                   array[0] <= parseFloat(val);
        }
    },

    'maxNum' : function(array){
        return function(val){
            return !$.isNumeric(val) ?
                false :
                array[0] >= parseFloat(val);
        }
    },

    'equals' : function(array){
        return function(val){
            var target_value = $("{0}".format(array[0])).val();
            return val === target_value;
        }
    },

    'regex' : function(array){
            return new RegExp(array[0]);
    }
}

var getRestriction = function(codex){
    //check first group
    var regex = regexs[codex];
    if(regex) return regex;

    //check second group
    //[0] full str, [1] wildcard, [2] values string
    var splitCodex = /(^.+)(\[.+]$)/i.exec(codex);
    var wildCard = splitCodex[1];

    //remove '[' and ']'
    var values = splitCodex[2].replace(/^\[(.+)]$/i,'$1').split(',');

    return regexs2[wildCard](values);
}

/**
 * Form validation part
 */
var validationFun = function(form){

    var $nodes = $(form).find('input[exp], select[exp], textarea[exp]');

    //To record whether all the fields have been validated or not.
    var validateFlag = new Array(), cursor = 0;

    $nodes.each(function(index, node){

        var exp = parseExpressionToObject($(node).attr('exp'));

        if(!exp) return;

        /**
         * Required condition validation
         */
        (exp.required && !fieldIsBlank(node) && markOffField(node) && ((validateFlag[cursor]=1) || true)) || //required, validated
        (exp.required && markOnField(node) && ((validateFlag[cursor] = 0) || true)) || //required, but not validated
        (validateFlag[cursor] = 1); //not required

        /**
         * Validate type condition validation
        */
        //keep previous all passed
        //specify value never return boolean - ((validateFlag[index]=1) || true))
        if(validateFlag[cursor++]){
            $.each(exp.validType, function (index, type) {
                var criteria = getRestriction(type);
                (execValidation(node, criteria) && markOffField(node) && ((validateFlag[cursor]=1) || true)) ||
                (markOnField(node) && (validateFlag[cursor]=0));
                cursor++;
            });
        }
    });
    var has0 = /(0(,)?)+/.test(validateFlag.toString());
    return !has0;
};

$(document).ready(function(){
    //intercept form submission
    $('form:not([vOFF], [validationOFF], [validation=off])').each(function(){
        //validate from before submission
        $(this).submit(function(){
            return validationFun(this);
        });
    });

});