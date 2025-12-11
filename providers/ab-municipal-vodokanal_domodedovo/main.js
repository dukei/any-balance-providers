/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
};

var baseurl = 'https://www.dom-vodokanal.ru';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(!g_savedData)
		g_savedData = new SavedData('vodokanaldomodedovo', prefs.login);

	g_savedData.restoreCookies();

    var html = AnyBalance.requestGet(baseurl + '/kabinet', g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	if(!/logout/i.test(html)){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();

	    html = AnyBalance.requestGet(baseurl + '/login', addHeaders({
			'Referer': baseurl + '/'
		}));
		
		var form = getElement(html, /<form[^>]+class="pdform"[^>]*>/i);
        if(!form){
        	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
        }
	
	    var params = createFormParams(form, function(params, str, name, value) {
	   		if (name == 'loginusername') {
	   			return prefs.login;
    		} else if (name == 'loginpassword') {
	    		return prefs.password;
	    	}
	        
	    	return value;
	    });
		
	    var action = getParam(form, null, null, /<form[\s\S]*?action="([^"]*)/i, replaceHtmlEntities);

		html = AnyBalance.requestPost(action, params, addHeaders({
			'Content-Type': 'application/x-www-form-urlencoded',
			'Origin': baseurl,
			'Referer': baseurl + '/login'
		}));
	
	    if (!/logout/i.test(html)) {
			var error = getParam(html, null, null, /<span[^>]+style="font-weight: bold; "[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	    	if (error)
	    		throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
		
		g_savedData.setCookies();
	    g_savedData.save();
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var result = {success: true};
	
    getParam(html, result, 'balance', /Cостояние сч[её]та:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Лицевой сч[её]т:([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /№(?:\s+)?/, '']);
	getParam(html, result, 'account', /Лицевой сч[её]т:([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /№(?:\s+)?/, '']);
	getParam(html, result, 'accrued_coldwater', /Начислено вода([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accrued_sanitation', /Начислено канализация([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accrued_watering', /Начислено полив([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_start', /Состояние сч[её]та на начало периода([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'paid_sum', /Оплачено([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'calculated_sum', /Доначислено([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fine_sum', /Пени([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'total_sum', /Общая сумма к оплате([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'last_upd_date', /Дата обновления:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'counternum', /Номер сч[её]тчика:([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(html, result, 'countertype', /Марка водомера:([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(html, result, 'counter_set_date', /Дата установки:([\s\S]*?)</i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'counter_change_date', /Дата замены:([\s\S]*?)</i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'address', /Адрес:([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(html, result, 'phone', /Телефон:([\s\S]*?)</i, replaceNumber);
	getParam(html, result, 'fio', /Абонент:([\s\S]*?)</i, replaceTagsAndSpaces);
	
	if(AnyBalance.isAvailable(['countervalue', 'countervalue_date', 'countervalue_prev', 'countervalue_prev_date'])){
	    html = AnyBalance.requestGet(baseurl + '/peredat-pokazanija', addHeaders({
			'Referer': baseurl + '/kabinet'
		}));
	
	    getParam(html, result, 'countervalue', /<td>На конец периода[\s\S]*?(?:[^>]*>){10}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'countervalue_date', /<td>На конец периода[\s\S]*?(?:[^>]*>){6}([^<]*)/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'countervalue_prev', /<td>На начало периода[\s\S]*?(?:[^>]*>){10}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'countervalue_prev_date', /<td>На начало периода[\s\S]*?(?:[^>]*>){16}([^<]*)/i, replaceTagsAndSpaces, parseDate);
	}
	
	if(AnyBalance.isAvailable(['last_pay_date', 'last_pay_sum', 'last_pay_type'])){
	    html = AnyBalance.requestGet(baseurl + '/platezhi', addHeaders({
			'Referer': baseurl + '/kabinet'
		}));
		
		var table = getElement(html, /<table[^>]+class="border"[^>]*>/i);
		var tbody = getElement(table, /<tbody[^>]*>/i);
	    var hists = getElements(tbody, /<tr[^>]*>/ig);
	
	    if(hists.length && hists.length > 0){
			AnyBalance.trace('Найдено платежей: ' + hists.length);
		    for(var i=0; i<hists.length; ++i){
	    	    var hist = hists[i];
				
				getParam(hist, result, 'last_pay_date', /<tr>[\s\S]*?(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseDate);
		        getParam(hist, result, 'last_pay_sum', /<tr>[\s\S]*?(?:[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		        getParam(hist, result, 'last_pay_type', /<tr>[\s\S]*?(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces);
				
			    break;
	        }
		}else{
			AnyBalance.trace('Не удалось получить данные по платежам');
		}
	}
	
	AnyBalance.setResult(result);
}
