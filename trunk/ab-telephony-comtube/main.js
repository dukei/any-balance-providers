 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
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

    if(!/log_out=1/.test(info)){
        var error = getParam(info, null, null, /"ajaxAuthFormErr"[^>]*>([\s\S]*?)<\//i, [/<.*?>/g, '', /^\s*|\s*$/g, '']);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удаётся войти в личный кабинет. Сайт изменен?');
    }
	
	var result = {success: true};
	
    getParam(info, result, 'balance', /curr_balance":([\d\s".,\-]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, ['currency', 'balance'], /currency":"([^"]+)/i, replaceTagsAndSpaces);
    getParam(info, result, 'number', /(?:Ваш номер внутри|You number in) Comtube:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('invest')){
        info = AnyBalance.requestGet(baseurl + 'index/payment_invest_info');
        getParam(info, result, 'invest', /Баланс инвестиционного счета:[\s\S]*?<span[^>]+class="p-big"[^>]*>([\s\S]*?)<\/span>/i, [/,/g, '', replaceTagsAndSpaces], parseBalance);
    }
	
	AnyBalance.setResult(result);
}