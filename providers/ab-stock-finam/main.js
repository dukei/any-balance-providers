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

    var baseurl = "http://pda.finam.ru/analysis/quoteonline00003"+number+"/default.asp";

    var html = AnyBalance.requestGet(baseurl);

    var error = getParam(html, null, null, /<\/h1>-->([\n\r\s ]+?)<\/div>/i);
    if(error)
        throw new AnyBalance.Error("Котировки с номером " + number + " отсутствуют. Проверьте номер!");

    var result = {success: true};

    getParam(html, result, 'name', /<td>Контракт<\/td><td>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /<td>Контракт<\/td><td>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'last', /<td>last<\/td><td>([\s\S]*?)<\/td>/i, replaceFloat, parseBalance);
	getParam(html, result, 'high', /<td>high<\/td><td>([\s\S]*?)<\/td>/i, replaceFloat, parseBalance);
	getParam(html, result, 'low', /<td>low<\/td><td>([\s\S]*?)<\/td>/i, replaceFloat, parseBalance);
	getParam(html, result, 'change', /<td>change<\/td><td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'volume', /<td>volume<\/td><td>([\s\S]*?)<\/td>/i, replaceFloat, parseBalance);
	getParam(html, result, 'open', /<td>open<\/td><td>([\s\S]*?)<\/td>/i, replaceFloat, parseBalance);
	getParam(html, result, 'close', /<td>close<\/td><td>([\s\S]*?)<\/td>/i, replaceFloat, parseBalance);

    AnyBalance.setResult(result);
}

