/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для биржи ссылок Sape.

Сайт оператора: http://www.sape.ru
Личный кабинет: https://auth.sape.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var url = 'https://auth.sape.ru/login/';

    var html = AnyBalance.requestPost(url, {
    	act: 'login',
    	r: 'http://www.sape.ru',
        username:prefs.login,
        password:prefs.password,
        submit: 'Войти'
    });

   	var form = getElement(html, /<form[^>]+id="reg"[^>]*>/i);
    if(form && /Пустая капча/i.test(form)){
    	AnyBalance.trace('Черт, попали на капчу...');

		var params = AB.createFormParams(html, function(params, str, name, value) {
			if (name == 'username') 
				return prefs.login;
			else if (name == 'password')
				return prefs.password;
			else if (name == 'captcha[input]'){
				var img = getParam(form, null, null, /<dd[^>]+captcha-element[^>]*>\s*<img[^>]+src="data:image[^,"]*,([^"]*)/i, replaceHtmlEntities);
				return AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img);
			}
	    
			return value;
		});

		html = AnyBalance.requestPost(url, params);
    }

    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /<ul[^>]+class="errors?"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet('http://widget.sape.ru/balance/?alt=json&tpl=balance_main&container_id=balance_widget_src&charset=windows-1251');

    var json = getJson(html);

    var result = {success: true};

    getParam(json.balanceTotal, result, 'balance', /(.*)/, replaceTagsAndSpaces, parseBalance);
    getParam(json.balanceAvailable, result, 'available', /(.*)/, replaceTagsAndSpaces, parseBalance);
    
    AnyBalance.setResult(result);
}
