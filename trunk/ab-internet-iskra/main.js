/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для томского интернет-провайдера ИскраТелеком

Сайт оператора: http://iskratelecom.ru
Личный кабинет: https://my.istel.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
    var baseurl = 'https://stat.seven-sky.net/cgi-bin/clients/';

    var html = AnyBalance.requestPost(baseurl + 'login', {
        action:'validate',
        login:prefs.login,
        password:prefs.password,
        submit:'Войти'
    });

    if(!/exit.jsp/.test(html)){
        var error = getParam(html, null, null, /<span[^>]*style=["']color:\s*#101010[^>]*>([\s\S]*?)<\/span>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    var integer = getParam(html, null, null, /<td[^>]*class="balance"[^>]*>[^]*?<td[^>]*class="integer"[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    var frac = getParam(html, null, null, /<td[^>]*class="balance"[^>]*>[^]*?<td[^>]*class="frac"[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(+integer + ((frac || 0)/100) , result, 'balance');

    getParam(html, result, 'licschet', /<h1[^>]*>Договор([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}