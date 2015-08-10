/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у ногинского интернет-провайдера Flex. Он осуществляет подключение клиентов к домовым сетям в населенных пунктах: Ногинск, Электросталь, Бахчиванджи, Электроугли, Орехово-Зуево, Ликино-Дулево, Давыдово, Демехово, Куровское, Селятино.

Сайт оператора: http://www.flex.ru/
Личный кабинет: https://www.flex.ru/stats/
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

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseTrafficGb(str){
  var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
  return parseFloat((val/1024).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://flex.ru/stats/";

    var html = AnyBalance.requestPost(baseurl + '?method=auth', {
        login:prefs.login,
        password:prefs.password,
        act:'login'
    });

    //AnyBalance.trace(html);
    if(!/\?method=logout/.test(html)){
        var error = getParam(html, null, null, /alert\('([^']*)/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    html = AnyBalance.requestGet(baseurl + '?method=show&page=traffic');

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс лицевого счета\s*:([\S\s]*?)<br[^>]*>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /Состояние учетной записи\s*:([\S\s]*?)<br[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'traffic', /Зачтенный трафик с начала месяца\s*:([\S\s]*?)<br[^>]*>/i, replaceTagsAndSpaces, parseTrafficGb);
    getParam(html, result, 'licschet', /Код пользователя\s*:([\S\s]*?)<br[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Действующий тарифный план\s*:([\S\s]*?)<br[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

