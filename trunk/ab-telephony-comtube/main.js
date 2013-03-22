 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

ComTube IP-телефония
Сайт оператора: https://www.comtube.com/
Личный кабинет: https://www.comtube.com/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');    

    var baseurl = 'https://www.comtube.com/';
    
    var info = AnyBalance.requestPost(baseurl + "index/auth_form?from=main_page_reg", {
        from:'main_page_reg',
        action:'auth',
        txtUserName:prefs.login,
        txtUserPass:prefs.password
    });

    var error = getParam(info, null, null, /"ajaxAuthFormErr"[^>]*>([\s\S]*?)<\//i, [/<.*?>/g, '', /^\s*|\s*$/g, '']);
    if(error)
        throw new AnyBalance.Error(error);
     
    var result = {
        success: true
    };

    var pset = getParam(info, null, null, /_pset\s*=\s*(\{[\s\S]*?\});/, null, getJson);

    getParam(pset.curr_balance, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(pset.currency, result, ['currency', 'balance'], null, replaceTagsAndSpaces);
    getParam(info, result, 'number', /(?:Ваш номер внутри|You number in) Comtube:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		
    AnyBalance.setResult(result);
}

