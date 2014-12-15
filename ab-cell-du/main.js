/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Retrieves balance, status and renewal date from DU personal account.

Operator site: http://www.du.ae
Personal account: https://selfcare.du.ae/selfcare-portal-web/nonLoggedInSelfcare.portal
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

/**
 *  Получает дату из строки mm/dd/yy
 */
function parseDateMy(str){
    var matches = /(?:(\d+)[^\d])?(\d+)[^\d](\d{2,4})(?:[^\d](\d+):(\d+)(?::(\d+))?)?/.exec(str);
    if(matches){
          var year = +matches[3];
          var date = new Date(year < 1000 ? 2000 + year : year, matches[1]-1, +(matches[2] || 1), matches[4] || 0, matches[5] || 0, matches[6] || 0);
	  var time = date.getTime();
          AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Failed to parse date from value: ' + str);
}

function main(){
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.login, 'Please enter username for your DU account');
    checkEmpty(prefs.password, 'Please enter password for your DU account');
    if(prefs.num && !/^\d{1,7}$/.test(prefs.num))
        throw new AnyBalance.Error('Please enter up to 7 last digits of the specific number or leave it empty to show info on the first number', null, true);

    var baseurl = "https://selfcare.du.ae/";
    AnyBalance.setDefaultCharset('iso-8859-1'); 

    var html = AnyBalance.requestPost(baseurl + 'cleartrust/ct_logon_en.html', {
        auth_mode:'basic',
        orig_url:'/selfcare-portal-web/Selfcare.portal?_nfpb=true',
        user:prefs.login,
        password:prefs.password,
        timestamp:'null'
    }, addHeaders({Referer: baseurl + 'selfcare-portal-web/nonLoggedInSelfcare.portal'})); 
    
    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /<font[^>]+color="red"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /username or password is incorrect/i.test(error));
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('The login attempt has failed. Is the site changed?');
    }
    
    var result = {success: true};

    getParam(html, result, 'fio', /Welcome(?:[\s\S]*?<span[^>]*>){1}\s*,([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    var contract = getParam(html, null, null, /<input[^>]+name="AccountOverviewController_3[^<]*value="([^"]*)/i, null, html_entity_decode);
    if(!contract){
        //Контракт не найден. Может, тут мультиномерной аккаунт?
        var num = prefs.num || '\\d+';
        var regexp = new RegExp("viewGSMDetail\\(\\s*'(\\d+)',\\s*'(\\d*" + num + ")',\\s*'([^']*)'");
        var matches = html.match(regexp);
        if(!matches){
            AnyBalance.trace(html);
            throw new AnyBalance.Error(prefs.num ? 'Could not find mobile number ending with ' + num + '!' : 'Could not find any mobile number! Is the site changed?');
        }
        
        getParam(matches[2], result, 'phone', null, [/^971/, '0', replaceTagsAndSpaces], html_entity_decode);

        html = viewGSMDetail(baseurl, matches[1], matches[2], matches[3]);
    }else{
        getParam(contract, result, 'phone', null, [/^971/, '0', replaceTagsAndSpaces], html_entity_decode);
        html = AnyBalance.requestGet(baseurl + 'selfcare-portal-web/selfcare/portal/userManagement/web/accountoverview/respondToAjaxRequests.do?tagID=AccountBalanceDiv%2C1%2C&locale=en&actionNames=getPrepaidAccountBalance%2C&contrract=' + contract + '&rndm=' + new Date().getTime());
    }

    var balances = getParam(html, null, null, /<th[^>]*>(?:\s|&nbsp;)*Balance type([\s\S]*?)<\/table>/i);
    if(!balances)
        throw new AnyBalance.Error('Can not find your account balance. Is site changed?');

    var rows = sumParam(balances, null, null, /<tr[^>]*>([\s\S]*?)<\/tr>/ig);
    for(var i=0; i<rows.length; ++i){
        var plan = getParam(rows[i], null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
        if(/More International/i.test(plan) && AnyBalance.isAvailable('balance', 'till')){
            sumParam(plan, result, '__tariff', null, null, null, aggregate_join);
            getParam(rows[i], result, 'balance', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(rows[i], result, 'till', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateMy);
        }else if(/More Data/i.test(plan) && AnyBalance.isAvailable('balance_md', 'till_md')){
            sumParam(plan, result, '__tariff', null, null, null, aggregate_join);
            getParam(rows[i], result, 'balance_md', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
            getParam(rows[i], result, 'till_md', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateMy);
        }else if(/More Time/i.test(plan) && AnyBalance.isAvailable('balance_mt', 'till_mt')){
            sumParam(plan, result, '__tariff', null, null, null, aggregate_join);
            getParam(rows[i], result, 'balance_mt', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(rows[i], result, 'till_mt', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateMy);
        }else if(/More Credit/i.test(plan) && AnyBalance.isAvailable('balance_mc', 'till_mc')){
            sumParam(plan, result, '__tariff', null, null, null, aggregate_join);
            getParam(rows[i], result, 'balance_mc', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(rows[i], result, 'till_mc', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateMy);
        }
    }
    
    //Возвращаем результат
    AnyBalance.setResult(result);
}

function viewGSMDetail(baseurl, index,mobileNo,viewPrePaidBalanceFlag) 
{ 
    var actionNames=""; 
    var tagNames=""; 
          
    if(viewPrePaidBalanceFlag == 'true'){ 
        actionNames+="getPrepaidAccountBalance,"; 
        tagNames +='AccountBalanceDiv'+index+',1,'; 
    } 
      
    if(actionNames != "" && tagNames != "") 
    { 
        return AnyBalance.requestGet(baseurl + 'selfcare-portal-web/selfcare/portal/userManagement/web/accountoverview/respondToAjaxRequests.do?tagID=' + encodeURIComponent(tagNames) + '&locale=en&actionNames=' + encodeURIComponent(actionNames) + '&contrract=' + mobileNo + '&rndm=' + new Date().getTime()); 
    } 

    AnyBalance.trace('Mobile No ' + mobileNo + ' has viewPrePaidBalanceFlag: ' + viewPrePaidBalanceFlag + '. Omitting request...');
    return '';
}