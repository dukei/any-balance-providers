/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Домашний Интернет и Телевидение Акадо
Сайт оператора: http://www.akado.ru/
Личный кабинет: https://office.akado.ru/login.xml
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://office.akado.ru/';
    
    AnyBalance.setDefaultCharset('utf-8');

    var pass = hex_md5(prefs.password).toUpperCase(); //Пароль в md5
    
    // Заходим на главную страницу
    var info = AnyBalance.requestPost(baseurl + 'login.xml/login', {
        login: prefs.login,
        password: pass
    }/*, {
        'X-Requested-With':'XMLHttpRequest',
        'Origin':'https://office.akado.ru',
	'Referer': baseurl + 'login.xml',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.152 Safari/535.19'
    }*/);
	
	if(!/splash-loading/i.test(info)){
        var error = getParam(info, null, null, /<response[^>]*><message>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

	if(AnyBalance.isAvailable('balance', 'agreement', 'username'))
	{
		var status = AnyBalance.requestGet(baseurl + 'status.xml');
		getParam(status, result, 'balance', /account-balance-value[^>]*>([^<]*)/i, null, parseBalance);
		getParam(status, result, 'username', /account-fullname[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(status, result, 'agreement', /account-ID[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    }	

    if(AnyBalance.isAvailable('payhint')){
		var account = AnyBalance.requestGet(baseurl + 'account.xml');
		getParam(account, result, 'payhint', /<[^>]*"amount[^>]*>([\s\S]{1,200})<\/span>\s*<span class="description">\s*Рекомендуемая сумма оплаты услуг в следующем месяце/i, null, parseBalance);
	}

    var services = AnyBalance.requestGet(baseurl + 'services.xml');

	if(/УСЛУГИ ИНТЕРНЕТ/i.test(services)){
		var servid = getParam(services, null, null, /<a href="\?ID=([\s\S]*?)">УСЛУГИ ИНТЕРНЕТ<\/a>/i, null, html_entity_decode);
		services = AnyBalance.requestGet(baseurl + 'services.xml?ID='+servid+'&depth=1');
		var tariff = getParam(services, null, null, /<th>\s*<a href[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if(tariff){
			var res = /\(([^,]*)/.exec(tariff);
			if(res)
				tariff = res[1];
			result.__tariff = tariff;
		}
	}
    AnyBalance.setResult(result);
}

