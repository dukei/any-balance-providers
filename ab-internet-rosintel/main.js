/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у интернет провайдера тульского региона Росинтел.

Сайт оператора: http://rosintel.com/
Личный кабинет: https://billing.rosintel.com
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

function getTrafficGb(str){
  return parseFloat((parseFloat(str)/1000).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://billing.rosintel.com/";


    AnyBalance.setDefaultCharset('windows-1251');

    var html = AnyBalance.requestPost(baseurl + 'client/index.php', {
        login: prefs.login,
        password: prefs.password
    });

    var error = getParam(html, null, null, /<h1>Авторизация в сервере статистики<\/h1>\s*<p>([\s\S]*?)<\/p>/i, [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/, '']);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};

    getParam(html, result, 'userName', /Вы:<\/td>\s*<td>(.*?)<\/td>/i);
    //Четвертая третья колонка в таблице под заголовком баланс
    getParam(html, result, 'balance', /<td[^>]*>Баланс.*?<\/td>[\S\s]*?<td[^>]*>[\S\s]*?<\/td>[\S\s]*?<td[^>]*>[\S\s]*?<\/td>[\S\s]*?<td[^>]*>[\S\s]*?<\/td>[\S\s]*?<td[^>]*>([-\d\.,\s]+)<\/td>/i, [/\s+/g, '', /,/g, '.'], parseFloat);

    var re = new RegExp(prefs.login + '<\\/a><\\/td>\\s*<td[^>]*>(.*?)<\\/td>', 'i');
    getParam(html, result, '__tariff', re, [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/, '']);
    re = new RegExp(prefs.login + '<\\/a><\\/td>[\\S\\s]*?<td[^>]*>[\\S\\s]*?<\\/td>[\\S\\s]*?<td[^>]*>[\\S\\s]*?<\\/td>[\\S\\s]*?<td[^>]*>[\\S\\s]*?<\\/td>[\\S\\s]*?<td[^>]*>[\\S\\s]*?<\\/td>\\s*<td[^>]*>(.*?)<\\/td>', 'i');
    getParam(html, result, 'status', re, [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/, '']);

    AnyBalance.setResult(result);
}
