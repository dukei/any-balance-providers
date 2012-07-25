/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Сільпо - Мережа супермаркетів
Сайт Сільпо: http://http://silpo.ua
Персональная страничка: https://my.silpo.ua/
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

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function main(){
	var baseurl = 'https://my.silpo.ua/';
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	var authPwd = prefs.pass;
	var authBarcode = prefs.login;
	if (!prefs.login || prefs.login == '')
		throw new AnyBalance.Error ('Введите № карты');
	if (!prefs.pass || prefs.pass == '')
		throw new AnyBalance.Error ('Введите пароль');

	AnyBalance.trace('Logging in...');
	var html = AnyBalance.requestPost(baseurl + 'login', {
			authBarcode: prefs.login,
			authPwd: prefs.pass,
			authRememberMe: "0"
		}
		, 
		{"X-Requested-With":"XMLHttpRequest"}
	);
	AnyBalance.trace('Got answer from authorization: "' + html + '"');
        html = html.replace(/^\s+|\s+$/g, '');
	if (html == "1"){ 
		html = AnyBalance.requestGet(baseurl + 'account');
		var result = {success: true};
		if (AnyBalance.isAvailable('bonus')) {
			var matches = html.match(/<div class="bottom">\s*Загальна кількість\s*<div>(\d+?)<\/div>/i);
			if (matches) {
				result.bonus = parseFloat(matches[1]);
			} else {
				throw new AnyBalance.Error("Не удалось проверить бонусы");
			}
		}
		if (AnyBalance.isAvailable('baly')) {
			var matches = html.match(/Мої Спеціальні пропозиції ?б?і?л?ь?ш?е? ?н?і?ж? +<span>(\d+?)<\/span>/i);
			if (matches) {
				result.baly = parseFloat(matches[1]);
			} else {
				throw new AnyBalance.Error("Не удалось проверить баллы");
			}
		}
		if (AnyBalance.isAvailable('skidka')) {
			var matches = html.match(/Всього надано Бонусів<\/b><\/td>\s*<td><b>(\d+?.\d+?) грн.<\/b><\/td>/i);
			if (matches) {
				result.skidka = parseFloat(matches[1]);
			}
		}
		if (AnyBalance.isAvailable('bonus_perevod')) {
			var matches = html.match(/Увага! Ваші <b>(\d+?) Балів<\/b>,/i);
			if (matches) {
				result.bonus_perevod = parseFloat(matches[1]);
			}
		}
		AnyBalance.setResult(result);
	} else { 
		var error = getParam(html, null, null, /<\/script>([\s\S]*?)<br[^>]*>/i, replaceTagsAndSpaces);
		if(!error) error = 'Не удалось получить данные, неизвестная ошибка.';
		throw new AnyBalance.Error(error);
	}
}
