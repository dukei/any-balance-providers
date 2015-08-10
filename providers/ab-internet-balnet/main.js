/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс BalNet.

Сайт оператора: http://balnet.ru
Личный кабинет: https://billing.balnet.ru/lk/
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://billing.balnet.ru/lk/";
    AnyBalance.setDefaultCharset('utf-8');
   
    var html = AnyBalance.requestPost(baseurl,
	{
	  login:prefs.login,
	  password:prefs.password
	});

    if(!/Баланс<\/td>\s*[^>]+>(\d+\.?\d*)<\/td>/i.test(html)){
        var error = getParam(html, null, null, /<br>\s*<p style=["']color:red['"]>([\W\d\s]+)<\/p>/i, null, null);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

  //  html = AnyBalance.requestGet(baseurl + 'ajax/mile_balance', {'X-Requested-With':'XMLHttpRequest'});

    getParam(html, result, 'balance', /Баланс<\/td>\s*[^>]+>(\d+\.?\d*)<\/td>/i, replaceFloat, parseFloat);
    getParam(html, result, 'account', /Основной лицевой счет<\/td>\s*[^>]+>(\d+)<\/td>/i, replaceTagsAndSpaces, null);
    getParam(html, result, 'credit', /Кредит<\/td>\s*[^>]+>(\d+\.?\d*)<\/td>/i, replaceFloat, parseFloat);
    getParam(html, result, 'switch', /Состояние интернета<\/td>\s*[^>]+>(\W+) .*<\/td>/i, replaceTagsAndSpaces, null);

    AnyBalance.setResult(result);
}
