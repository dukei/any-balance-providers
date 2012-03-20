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

function getTrafficGb(str){
  return parseFloat((parseFloat(str)/1000).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://lk.beeline.ru/";

    var html = AnyBalance.requestGet(baseurl); //Чтобы кука установилась

//    try{
    html = AnyBalance.requestPost(baseurl, {
        login: prefs.login,
        password: prefs.password
    });
//    }catch(e){
//        //Из-за ошибки в Хроме логин не может быть выполнен, потому что там используется переадресация с безопасного на обычное соединение.
//        //Чтобы отлаживать в отладчике, зайдите в свой аккаунт вручную, и раскоментарьте эти строчки. Не забудьте закоментарить обратно потом!
//        html = AnyBalance.requestGet(baseurl + 'news/'); 
//    }
    
    var error = getParam(html, null, null, /<ul class="errorlist">([\s\S]*?)<\/ul>/i, [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/, '']);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};
    
    getParam(html, result, 'balance', /Баланс:[\s\S]*?<span[^>]*>([\-\d\s\.,]+)/i, [/\s+/g, '', ',', '.'], parseFloat);
    getParam(html, result, 'bonus', /Бонусы:[\s\S]*?<span[^>]*>([\-\d\s\.,]+)/i, [/\s+/g, '', ',', '.'], parseFloat);

    if(AnyBalance.isAvailable('status', 'status_internet', 'status_tv', 'userName')){
       html = AnyBalance.requestGet(baseurl + 'personal/');

       getParam(html, result, 'status', /usluga_name">Текущий статус[\s\S]*?<span[^>]*>(.*?)<\/span>/i);
       getParam(html, result, 'status_internet', /usluga_name">Интернет[\s\S]*?<span[^>]*>(.*?)<\/span>/i);
       getParam(html, result, 'status_tv', /usluga_name">Телевидение[\s\S]*?<span[^>]*>(.*?)<\/span>/i);
       getParam(html, result, 'userName', /usluga_name">Владелец договора[\s\S]*?<span[^>]*>(.*?)<\/span>/i);
    }

    html = AnyBalance.requestGet(baseurl + 'internet/');
    getParam(html, result, '__tariff', /Тарифный план[\s\S]*?<td[^>]*>\s*(.*?)<\/td>/i, [/&nbsp;/g, '', /\s+$/, '']);
    getParam(html, result, 'traffic', /Предоплаченный трафик[\s\S]*?<td[^>]*>([\-\d\s\.,]+)/i, [/\s+/g, '', ',', '.'], getTrafficGb);;
    
    AnyBalance.setResult(result);
}
