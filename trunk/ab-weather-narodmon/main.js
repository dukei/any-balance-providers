/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у калининградского оператора интернет Диалог.

Сайт оператора: http://tis-dialog.ru/
Личный кабинет: https://stats.tis-dialog.ru
*/

function getParam (html, result, param, regexp, replaces, parser) {
        if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
                return;

        var value = regexp.exec (html);
        if (value) {
                value = value[1];
                if (replaces) {
                        for (var i = 0; i < replaces.length; i += 2) {
                                value = value.replace (replaces[i], replaces[i+1]);
                        }
                }
                if (parser)
                        value = parser (value);

    if(param)
      result[param] = value;
    else
      return value
        }
}

var replaceFloat = [/\s+/g, '', /,/g, '.'];
var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
        AnyBalance.setDefaultCharset('windows-1251');
    var prefs = AnyBalance.getPreferences();
    var number = prefs.number || prefs.numberList;

    var baseurl = "http://moe26.ru/projects/narodmon/?id="+number;

    var html = AnyBalance.requestGet(baseurl);

    var error = getParam(html, null, null, /<\/h1>-->([\n\r\s ]+?)<\/div>/i);
    if(error)
        throw new AnyBalance.Error("Датчик с номером " + number + " отсутствует. Проверьте номер!");

    var result = {success: true};

 
    getParam(html, result, 'temperature', /&nbsp;<b>([\s\S]*?)&deg;<\/b>/i, replaceFloat, parseBalance);
    getParam(html, result, 'humidity', /&nbsp;<b>([\s\S]*?)%<\/b>/i, replaceFloat, parseBalance);
	getParam(html, result, 'pressure', /&nbsp;<b>([\s\S]*?)mmHg<\/b>/i, replaceFloat, parseBalance);


    AnyBalance.setResult(result);
}

