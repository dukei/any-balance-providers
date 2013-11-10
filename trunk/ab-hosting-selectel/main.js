/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Информация о балансе у хостинга Selectel.

Сайт оператора: http://selectel.ru/
Личный кабинет: https://support.selectel.ru/
*/

function main(){
		var prefs = AnyBalance.getPreferences();

		AnyBalance.setDefaultCharset('utf-8');

		var baseurl = 'https://support.selectel.ru/';

		var html = AnyBalance.requestPost(baseurl + 'api/login', {
        		login:prefs.login,
        		password:prefs.password,
    	});

		html = AnyBalance.requestGet(baseurl);

		var result = {success: true};

		getParam(html, result, 'cloudBalance', /"cloud":{"balance":\d+/i, replaceTagsAndSpaces, parseBalance);
		result['cloudBalance']=result['cloudBalance']/100;

		getParam(html, result, 'storageBalance', /"storage":{"balance":\d+/i, replaceTagsAndSpaces, parseBalance);
		result['storageBalance']=result['storageBalance']/100;
		
		getParam(html, result, 'Balance', /,"balance":"\d+/i, replaceTagsAndSpaces, parseBalance);
		result['Balance']=result['Balance']/100;

		getParam(html, result, 'vkBalance', /","vk_balance":"\d+/i, replaceTagsAndSpaces, parseBalance);

		getParam(html, result, 'id', /{"id":\d+/i, replaceTagsAndSpaces, parseBalance);
	
		if(AnyBalance.isAvailable('username')) {
				getParam(html, result, 'username', /,"username":"[^"]*/i);
				a=result['username'].split("\":\"");
				result['username'] = a[a.length-1]
		}

		AnyBalance.setResult(result);
}

