
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.6,en;q=0.4',
	'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
//  'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
};

var baseurl = 'https://lk.platon.ru';
var g_savedData;

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	if(!g_savedData)
		g_savedData = new SavedData('platon', prefs.login);

	g_savedData.restoreCookies();

    AnyBalance.trace ('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestGet(baseurl + '/accounts', g_headers);
	
	if (!html || AnyBalance.getLastStatusCode() > 400) {
	   	AnyBalance.trace(html);
	    throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}
	
	if (/Необходима авторизация/i.test(html)) {
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
		
		html = AnyBalance.requestGet(baseurl + '/sign_in', addHeaders({
	    	'Referer': baseurl + '/',
	    }));
	
	    var authToken = getParam(html, /name="authenticity_token" value="([\s\S]*?)"/i, replaceTagsAndSpaces);
	
	    AnyBalance.trace('Токен авторизации: ' + authToken);

	    if(!authToken){
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось найти форму входа! Сайт изменен?');
	    }

        var params = [
        	['utf8','✓'],
            ['authenticity_token',authToken],
            ['session[login]',prefs.login],
            ['session[password]',prefs.password],
            ['session[remember_me]','0'],
            ['session[remember_me]','1']
	    ];

        html = AnyBalance.requestPost(baseurl + '/sign_in?locale=ru/', params, AB.addHeaders({
	    	'Content-Type': 'application/x-www-form-urlencoded',
	    	'Origin': baseurl,
            'Referer': baseurl + '/sign_in',
            'Upgrade-Insecure-Requests': '1'	
	    }));
	
	    if(!/sign_out/i.test(html)){
            var error = getParam(html, null, null, /<div[^>]+class="red">([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces);
	    	if(error)
	    		throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');			
	    }
		
		var id = getParam(html, /selected="selected" value="([\s\S]*?)"/i, replaceTagsAndSpaces);	
		g_savedData.setCookies();
	    g_savedData.save();
		
	}else{
		var id = getParam(html, /id="accounts" value="([\s\S]*?)"/i, replaceTagsAndSpaces);
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var result = {success: true};
	
	if (AnyBalance.isAvailable('balance', 'grz', 'grz_status', 'bu_num', 'bu_status', 'cont_num', 'cont_date', 'cont_date_exp', 'group', '__tariff', 'payment', 'notifications', 'role', 'fio', 'last_bu_order_num', 'last_bu_order_date', 'last_bu_order_count', 'last_bu_order_status')) {
	    html = AnyBalance.requestGet(baseurl + '/accounts/' + id + '/vehicles', g_headers);

        var status = {
	    	'svp-down_q': 'Верифицировано',
	    	'svp-close_q': 'Не верифицировано',
	    	'green': 'БУ активно',
			'red': 'БУ не активно',
			'gray': 'БУ отсутствует'
	    };
	    var statGRZ = getParam(html, /<i[^>]+class="svp b-link__icon\s(?:green|red)\s([\s\S]*?)"><\/i>[\s\S]*?<\/p>/i, replaceTagsAndSpaces);
		var statBU = getParam(html, /<i[^>]+class="svp b-link__icon\s(?:svp-by|svp-broken_by)\s([\s\S]*?)"><\/i>[\s\S]*?<\/p>/i, replaceTagsAndSpaces);

        getParam(html, result, 'balance', /<span[^>]+class="tab__value balance_counter"><span>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	    getParam(html, result, 'grz', /<span[^>]+class="headtext">ГРЗ<\/span[^>]*>[\s\S]*?<\/i>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
		getParam(status[statGRZ]||statGRZ, result, 'grz_status', null, replaceTagsAndSpaces);
		getParam(html, result, 'bu_num', /<span[^>]+class="headtext">Номер и статус БУ<\/span[^>]*>[\s\S]*?<\/i>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
		getParam(status[statBU]||statBU, result, 'bu_status', null, replaceTagsAndSpaces);
		getParam(html, result, 'cont_num', /<span[^>]+class="headtext">Номер договора<\/span[^>]*>[\s\S]*?"text">([\s\S]*?)\sот.*<\/span>/i, replaceTagsAndSpaces);
		getParam(html, result, 'cont_date', /<span[^>]+class="headtext">Номер договора<\/span[^>]*>[\s\S]*?от\s([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'cont_date_exp', /<span[^>]+class="headtext">Дата окончания срока службы БУ<\/span[^>]*>[\s\S]*?"text">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'group', /<span[^>]+class="headtext">Группа<\/span[^>]*>[\s\S]*?"text">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	    getParam(html, result, '__tariff', /Расчетная запись<\/label>[\s\S]*?value="\d*?">([\s\S]*?)<\/option>/i, replaceTagsAndSpaces);
		getParam(html, result, 'payment', /Расчетная запись<\/label>[\s\S]*?value="\d*?">([\s\S]*?)<\/option>/i, replaceTagsAndSpaces);
		getParam(html, result, 'notifications', /<p[^>]+class="tab__title">Уведомления:[\s\S]*?>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	    getParam(html, result, 'role', /<p[^>]+class="tab__title">[\s\S]*?Роль:\s*([\s\S]*?)\s*<\/small>/i, replaceTagsAndSpaces);
		getParam(html, result, 'fio', /<p[^>]+class="tab__title">[\s\S]*?small">([\s\S]*?)<small>/i, replaceTagsAndSpaces);
		getParam(html, result, 'last_bu_order_num', /<p[^>]+class="b-text b-text_big b-text_inline">([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
		getParam(html, result, 'last_bu_order_date', /<p[^>]+class="b-text"><i[^>]+class="svp svp-caledar"><\/i>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'last_bu_order_count', /<p[^>]+class="b-text"><i[^>]+class="svp svp-by"><\/i>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'last_bu_order_status', /<p[^>]+class="b-text"> Статус:\s([\s\S]*?)\..*?<\/p>/i, replaceTagsAndSpaces);
	}

	AnyBalance.setResult(result);
}
