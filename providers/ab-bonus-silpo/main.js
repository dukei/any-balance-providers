/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Сільпо - Мережа супермаркетів
Сайт Сільпо: http://silpo.ua
Персональная страничка: https://my.silpo.ua/
*/

function parseDateMoment(str){
    var mom = moment(str.replace(/i/ig, 'і'), ['DD MMM YYYY', 'HH:mm-D MMM YYYY']);
    if(!mom.isValid()){
        AnyBalance.trace('Failed to parse date from ' + str);
    }else{
        var val = mom.toDate();
        AnyBalance.trace('Parsed date ' + val + ' from ' + str);
        return val.getTime();
    }
}

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
	moment.lang('uk');
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
		//ФИО
		if (matches=/<div class="user_info">\s*<strong>\s*(.*?)\s*?<br\/>\s*?(.*?)&nbsp;(.*?)\s*?<\/strong><br\/><br\/>/.exec(html)){
		result.__tariff=matches[1]+' '+matches[2]+' '+matches[3];
		}
		//Накапливаемый бонус по программе Мій «Власний Рахунок»
		if (AnyBalance.isAvailable('bonus')) {
			var matches = html.match(/<div class=[^>]*>\s*Загальна кількість\s*<div>(\d+?)<\/div>/i);
			if (matches) {
				result.bonus = parseFloat(matches[1]);
			}
		}
		//Мої Спеціальні пропозиції
		if (AnyBalance.isAvailable('baly')) {
			var matches = html.match(/Мої (?:С|c)пеціальні пропозиції п*о*н*а*д*\s*<span[^>]*>(\d+?)\s*балів[^<]*</i);
			if (matches) {
				result.baly = parseFloat(matches[1]);
			}
		}
		//Начисленные бонусы переведённые в грн.
		if (AnyBalance.isAvailable('skidka')) {
			var matches = html.match(/Всього надано (?:Б|б)онусів<[^>]*><[^>]*>\s*<[^>]*><[^>]*>(\d+?.\d+?) грн.<[^>]*>/i);
			if (matches) {
				result.skidka = parseFloat(matches[1]);
			}
		}
		//Промежуточные балы появляющиеся при переводе бонусов со счета bonus на счет skidka
		if (AnyBalance.isAvailable('bonus_perevod')) {
			var matches = html.match(/Увага! Ваші (?:<strong>|<b>)(\d+?) (?:Б|б)алів(?:<\/strong>|<\/b>),/i);
			if (matches) {
				result.bonus_perevod = parseFloat(matches[1]);
			}
		}
		//Дата перерасчета бонусов
		getParam(html, result, 'bonus_conversion', /<th[^>]*>Наступне(?:&nbsp;|\s)+перерахування(?:&nbsp;|\s)+(?:Б|б)алів(?:&nbsp;|\s)+(?:у|в)(?:&nbsp;|\s)+(?:Б|б)онус<\/th>\s*<th[^>]*>Наступна(?:&nbsp;|\s)+доставка(?:&nbsp;|\s)+(?:С|с)ертифікатів<\/th>\s*<\/tr>\s*<tr>\s*<td[^>]*>([^<]*)<\/td>/i, replaceTagsAndSpaces, parseDateMoment);

		AnyBalance.setResult(result);
	} else { 
		var error = getParam(html, null, null, /<\/script>([\s\S]*?)<br[^>]*>/i, replaceTagsAndSpaces);
		if(!error) error = 'Не удалось получить данные, неизвестная ошибка.';
		throw new AnyBalance.Error(error);
	}
}
