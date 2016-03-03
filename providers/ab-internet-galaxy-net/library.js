/**
 AnyBalance (https://github.com/dukei/any-balance-providers/)
 library.js v0.21 от 11.12.15
 */

function getParam(html, result, param, regexp, replaces, parser) {
    if (!isset(html)) {
        AnyBalance.trace('getParam: input ' + (param ? '(' + param + ')' : '') + ' is unset! ' + new Error().stack);
        return;
    }
    if (!isAvailable(param)) {
        AnyBalance.trace(param + ' is disabled!');
        return;
    }
    var regexps = isArray(regexp) ? regexp : [regexp];
    for (var i = 0; i < regexps.length; ++i) { //Если массив регэкспов, то возвращаем первый заматченный
        regexp = regexps[i];
        var matches = regexp ? html.match(regexp) : [, html], value;
        if (matches) {
            //Если нет скобок, то значение - всё заматченное
            value = replaceAll(isset(matches[1]) ? matches[1] : matches[0], replaces);
            if (parser)
                value = parser(value);
            if (param && isset(value))
                result[__getParName(param)] = value;
            break;
        }
    }
    return value;
}

function checkEmpty(param, error, notfatal) {
    if (!param)
        throw new AnyBalance.Error(error, null, !notfatal);
}