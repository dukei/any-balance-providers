/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://uhome.tel.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'login.aspx', g_headers);

    var __VIEWSTATE = getParam(html, null, null, /__VIEWSTATE[^>]*value="([^"]*)/i, null, html_entity_decode);
    if(!__VIEWSTATE) //Если параметр не найден, то это, скорее всего, свидетельствует об изменении сайта или о проблемах с ним
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

	html = AnyBalance.requestPost(baseurl + 'login.aspx', {
		__EVENTTARGET:'',
		__EVENTARGUMENT:'',
		'__VIEWSTATE':__VIEWSTATE,
		ASPxRoundPanel1$e_Login:prefs.login,
		ASPxRoundPanel1$e_Login$CVS:'',
		ASPxRoundPanel1$e_Pass:prefs.password,
		ASPxRoundPanel1$e_Pass$CVS:'',
		ASPxRoundPanel1$bb_Ok:'',
		DXScript:'1_142,1_80,1_98,1_105,1_135,1_91'
    }, addHeaders({Referer: baseurl + 'login.aspx'})); 

    if(!/Завершить работу в системе/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'balance', /Доступно([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	result.__tariff = getParam(html, null, null, /Интернет:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode) 
		+ ' (' + getParam(html, null, null, /Цена тарифа:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode) + ')';

	getParam(html, result, 'dogovor', /Договор:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /Фамилия, имя:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'code', /Код для оплаты услуг через терминалы:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	// Попытаемся высчитать дату отключения
	if(isAvailable('deadline')){
		var monthlyFee = getParam(html, null, null, /Цена тарифа([^<]*)/i, null, parseBalance);
		var date = new Date();
		var dayCount = 32 - new Date(date.getYear(), date.getMonth(), 32).getDate();
		// Теперь мы знаем сумму абонентской платы и количество дней в месяце, так что можем посчитать дату отключения
		var daysToDeadline = Math.round(result.balance/(monthlyFee/dayCount));
		result.deadline = date.getTime() + 86400000 * daysToDeadline;
	}
	
    AnyBalance.setResult(result);
}