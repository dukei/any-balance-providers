/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у питерского оператора интернет SkyNet.

Сайт оператора: http://www.sknt.ru/
Личный кабинет: http://bill.sknt.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://bill.sknt.ru/";

    var html = AnyBalance.requestPost("https://abonent-auth.sknt.ru/login?project=bill.sknt.ru&ret=https%3A%2F%2Fbill.sknt.ru%2F%3Fcat%3Duser%26action%3Dregister%26token%3D", {
        login:prefs.login,
        password:prefs.password,
        submit:'Войти',
        action:'authorize'
    });

    if(!/action=logout/i.test(html)){
        var error = getParam(html, null, null, /div[^>]+class="error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces); 
        if(error){
            throw new AnyBalance.Error(error, null, /Пароль/i.test(error));
        }
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    html = AnyBalance.requestGet(baseurl + '?cat=bl_u_internet');

	getParam(html, result, '__tariff', /ВАШ ТЕКУЩИЙ ТАРИФ[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, [/<a[^>]*>[\s\S]*?<\/a>/ig, '', replaceTagsAndSpaces]);
     
    getParam(html, result, 'licschet', /Ваш ID:([\s\S]*?)<span/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Состояние лицевого счета:([\s\S]*?)<span/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
