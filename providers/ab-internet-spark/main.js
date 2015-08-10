/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора интернет СПАРК.

Сайт оператора: http://www.spark-com.ru
Личный кабинет: https://stat.spark-com.ru
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

    var baseurl = "https://stat.spark-com.ru/";


    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestPost(baseurl, {
        login: prefs.login,
        pass: prefs.password
    });

    var error = getParam(html, null, null, /<ol class="error[^>]*>([\s\S]*?)<\/ol>/i, [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/, '']);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};
    
    getParam(html, result, 'userName', /ФИО:[\s\S]*?>([^<]*)</i);
    getParam(html, result, 'licschet', /Лицевой счет:[\s\S]*?>([^<]*)</i);
    getParam(html, result, 'balance', /Текущий баланс:[\s\S]*?>([\-\d,\.\s]*)/i, [/\s+/g, '', /,/g, '.'], parseFloat);
    getParam(html, result, 'abonentka', /Текущая абонентская плата за все услуги:[\s\S]*?>([\-\d,\.\s]*)/i, [/\s+/g, '', /,/g, '.'], parseFloat);
    getParam(html, result, 'traffic', /Расход трафика в текущем месяце:[\s\S]*?>([\-\d,\.\s]*)/i, [/\s+/g, '', /,/g, '.'], parseFloat);
    getParam(html, result, 'trafficGb', /Расход трафика в текущем месяце:[\s\S]*?>([\-\d,\.\s]*)/i, [/\s+/g, '', /,/g, '.'], getTrafficGb);
    getParam(html, result, 'status', /Статус подключения:[\s\S]*?>([^<]*)/i);
    getParam(html, result, '__tariff', /Текущий тарифный план:[\s\S]*?>([^<]*)/i, null, html_entity_decode);

    if(AnyBalance.isAvailable('bonus')){
	var html = AnyBalance.requestGet(baseurl + "account_bonuses/");
    	getParam(html, result, 'bonus', /Итого<\/td><td[^>]*>[^<]*<\/td><td[^>]*>([\-\d,\.\s]*)/i, [/\s+/g, '', /,/g, '.'], parseFloat);
    }
    
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}
