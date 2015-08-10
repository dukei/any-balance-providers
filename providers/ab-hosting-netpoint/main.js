/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'Origin':'https://billing.netpoint-dc.com',

	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://billing.netpoint-dc.com/billmgr';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var html;
    if(!prefs.__dbg){
        AnyBalance.setCookie('billing.netpoint-dc.com', 'billmgr4', 'sirius:ru:0');
        
        html = AnyBalance.requestPost(baseurl, {
            username:prefs.login,
            password:prefs.password,
            theme:'sirius',
            lang:'ru',
            func:'auth',
            project:'',
            welcomfunc:'',
            welcomparam:''
        }, g_headers);
        
        var sessval = getParam(html, null, null, /=sirius:ru:(\d+)/i);
        if(!sessval){
            var error = getParam(html, null, null, /<td[^>]*login-error-content[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces);
            if(error)
                throw new AnyBalance.Error(error);
            
            throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
        }
        
        AnyBalance.setCookie('billing.netpoint-dc.com', 'billmgr4', 'sirius:ru:' + sessval);
    }
    
    html = AnyBalance.requestGet(baseurl, addHeaders({'Referer' : baseurl}));
    html = AnyBalance.requestGet(baseurl + '?dashboard=accountinfo&func=accountinfo', addHeaders({'Referer' : baseurl + '?func=dashboard'}));
    
	var result = {success: true};
	
	getParam(html, result, 'balance', /Средств хватит на(?:[^>]*>){23}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'account', /Средств хватит на(?:[^>]*>){15}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'name', /Средств хватит на(?:[^>]*>){20}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}