/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.103 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');    
	
    var baseurl = 'http://old.mtt.ru';
    
    var html = AnyBalance.requestGet(baseurl + "/user/login?destination=sc", g_headers);
    var form_build_id = AB.getParam(html, null, null, /<input[^>]+name="form_build_id"[^>]*value="([^"]*)"[^>]*>/i);
    if(!form_build_id)
        throw new AnyBalance.Error("Не удаётся найти идентификатор формы для входа! Свяжитесь с автором провайдера.");

    var params = {
	    name:prefs.login,
	    pass:prefs.password,
        form_build_id:form_build_id,
        form_id:'user_login',
        op:'Войти'
    };
        
    html = AnyBalance.requestPost(baseurl + "/user/login?destination=sc", params);

    if(!/logout/i.test(html)) {
        var error = AB.getParam(html, null, null, /<div[^>]*class="messages error"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);

        AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменён?");
    }

     
    var result = {success: true};

    if(prefs.num) {
        var select = getElements(html, /<div[^>]+class='balance-row'[^>]*>/ig);
        if(!select)
            throw  new AnyBalance.Error("Не удалось найти таблицу со счетами. Сайт изменён?");

        var re = new RegExp('<div[^>]+class=\'status-divider\'[\\s\\S]*?<a[^>]+href="([\\s\\S]*?)"[^>]*>л\/c\\s*\\d+'+prefs.num);
        for(var i=0; i<select.length; i++) {
            var account = AB.getParam(select[i], null, null, re);
            if(account) {
                html = AnyBalance.requestGet(baseurl+account, g_headers);
                break;
            }
        }
        if(!account)
            AnyBalance.trace('Не смогли найти л/с с номером ' + prefs.num + ' выводим данные по первому счёту');
    }
    getParam(html, result, 'licschet', /<h1[^>]+id="page-title"[^>]*>л\/c\s*(\d+)/i);
    getParam(html, result, 'balance', /<div[^>]+class="user_balance"[^>]*>([\s\S]*?)<\/div/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    getParam(html, result, 'userName', /Добрый день,[\s\S]*?>(.*?)<\/div/i, AB.replaceTagsAndSpaces);
		
    AnyBalance.setResult(result);
}