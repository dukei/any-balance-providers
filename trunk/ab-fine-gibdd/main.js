/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://www.gibdd.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestGet(baseurl + 'check/fines/');

	var form = getParam(html, null, null, /(<form method="POST" id="tsdataform"[\s\S]*?<\/form>)/i);
    var params = createFormParams(form);

	if(params.captcha_code){
		if(AnyBalance.getLevel() >= 7){
			AnyBalance.trace('Пытаемся ввести капчу');
            var captcha = AnyBalance.requestGet(baseurl+ '/bitrix/tools/captcha.php?captcha_code=' + params.captcha_code);
            params.captcha_word = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
            AnyBalance.trace('Капча получена: ' + params.captcha_word);
		}else{
			throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
        }
    }
	var found = /(\W{1}\d+\W{2})(\d{2,3})/i.exec(prefs.login);
	if(!found)
		throw new AnyBalance.Error('Введеный гос. номер не соответствует формату а351со190');

	params.regnum = found[1];
    params.regreg = found[2];
	params.stsnum = prefs.password;

	//AnyBalance.trace('Отправляем данные: ' + JSON.stringify(params));
	html = AnyBalance.requestPost(baseurl + 'check/fines/', params);	

	var result = {success: true};
	var table = getParam(html, null, null, /(<table col=[\s\S]*?id='decisList'[\s\S]*?<\/table>)/i);
	// Если таблицы нет то нет и штрафов
    if(!table){
	    var error = getParam(html, null, null, /class="errormsgs info-message"><li><font color='red'>([\s\S]*?)<\/font><\/ul>/i, null, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
        //throw new AnyBalance.Error('Не удалось получить информацию по шртафам');
    }
	var fines = sumParam(html, null, null, /(<tr class='fineline'[\s\S]*?<\/tr>)/ig, null, html_entity_decode, null);

	if(fines.length > 0)
	{
		AnyBalance.trace('Штрафов: ' + fines.length);
		for(var i = 0; i< fines.length; i++)
		{
			var curr = fines[i];
			sumParam(curr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/ig, null, parseBalance, aggregate_sum);
		}
		getParam(curr, result, 'descr', /title[^\"]*\"([\s\S]*?)\"/i, null, html_entity_decode);
		getParam(curr, result, 'date', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, null, parseDate);
		getParam(curr, result, 'koap', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(curr, result, 'podrazdel', /(?:[\s\S]*?<td[^>]*>){4}[\s\S]*?regkod[\s\S]*?>([\s\S]*?)<\//i, null, html_entity_decode);
		getParam(curr, result, 'postanovlenie', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)</i, null, html_entity_decode);
		sumParam(curr, result, 'summ', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/ig, null, parseBalance, aggregate_sum);
		
		getParam(fines.length+'', result, 'count', null, replaceTagsAndSpaces, parseBalance);
	}
	// Нет штрафов
	else
	{
		getParam('0', result, 'balance', null, null, parseBalance);
		//В базе данных отсутствует информация о неуплаченных штрафах по Вашему запросу
	}
    AnyBalance.setResult(result);
}