/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс в интернет и телевидение от Билайн

Сайт оператора: http://www.beeline.ru
Личный кабинет: https://lk.beeline.ru
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

var replaceTagsAndSpaces = [/&nbsp;/i, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var _text = text.replace(/\s+/, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseDate(str){
    AnyBalance.trace('Parsing date from value: ' + str);
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)\s+(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    var time;
    if(matches){
	  time = (new Date(+matches[3], matches[2]-1, +matches[1], +matches[4], +matches[5], +matches[6])).getTime();
    }
    return time;
}

function parseTrafficGb(str){
  var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
  return parseFloat((val/1000).toFixed(2));
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://lk.beeline.ru/";

    var html = AnyBalance.requestGet(baseurl); //Чтобы кука установилась

    if(!prefs.__dbg){
        html = AnyBalance.requestPost(baseurl, {
            login: prefs.login,
            password: prefs.password
        });
    }else{
        //Из-за ошибки в Хроме логин не может быть выполнен, потому что там используется переадресация с безопасного на обычное соединение.
        //Чтобы отлаживать в отладчике, зайдите в свой аккаунт вручную, и раскоментарьте эти строчки. Не забудьте закоментарить обратно потом!
        html = AnyBalance.requestGet(baseurl + 'news/'); 
    }
    
    if(!/\/logout\//.test(html)){
        var error = getParam(html, null, null, /<ul class="errorlist">([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Проблемы на сайте?");
    }

    var result = {success: true};
    
    getParam(html, result, 'balance', /Баланс:[\s\S]*?<span[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'bonus', /Бонусы:[\s\S]*?<span[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('status', 'status_internet', 'status_tv', 'userName', 'till', 'topay', 'abon')){
       html = AnyBalance.requestGet(baseurl + 'personal/');

       getParam(html, result, 'status', /usluga_name">Текущий статус[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
       getParam(html, result, 'status_internet', /usluga_name">Интернет[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
       getParam(html, result, 'status_tv', /usluga_name">Телевидение[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
       getParam(html, result, 'userName', /usluga_name">Владелец договора[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
       getParam(html, result, 'till', /Дата окончания расчетного периода[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
       getParam(html, result, 'topay', /Сумма к оплате[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, html_entity_decode);
       getParam(html, result, 'abon', /Сумма ежемесячного платежа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    html = AnyBalance.requestGet(baseurl + 'internet/');
    getParam(html, result, '__tariff', /Тарифный план[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'traffic', /Предоплаченный трафик[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);;
    
    AnyBalance.setResult(result);
}
