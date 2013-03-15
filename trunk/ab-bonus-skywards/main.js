/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс баллов и другую информацию по бонусной программе Skywards

Operator site: https://www.skywards.com/
Личный кабинет: https://www.skywards.com/
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Cache-Control': 'max-age=0',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.172 Safari/537.22'
};

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function parseDateMoment(str){
    var mom = moment(str.replace(/i/ig, 'і'), ['DD MMM YYYY', 'HH:mm-D MMM YYYY']);
    if(!mom.isValid()){
        AnyBalance.trace('Failed to parse date from ' + str);
    }else{
        var val = mom.toDate();
        AnyBalance.trace('Parsed date ' + val + ' from ' + str);
        return val.getTime();
    }
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://www.skywards.com/";
    AnyBalance.setDefaultCharset('utf-8'); 

    moment.lang('en');

    var html = AnyBalance.requestGet(baseurl, g_headers);

    var vs = getViewState(html);
    if(!vs) //Если параметр не найден, то это, скорее всего, свидетельствует об изменении сайта или о проблемах с ним
        throw new AnyBalance.Error('Could not find login form. Is the site changed?');

    //Сайт не авторизуется без обязательной загрузки секретной картинки. Вот сволочи.
    var secret_image = getParam(html, null, null, /\w+\.setAttribute\('src','(Image\d+\.jpg)'\);/);
    if(secret_image){
        AnyBalance.setDefaultCharset('iso-8859-1'); 
        html = AnyBalance.requestGet(baseurl + secret_image);
        AnyBalance.setDefaultCharset('utf-8'); 
    }

    //Теперь, когда секретный параметр есть, можно попытаться войти
    html = AnyBalance.requestPost(baseurl + 'index.aspx', {
	__EVENTTARGET:'',
	__EVENTARGUMENT:'',
	__VIEWSTATE:vs,
	ctl00$ContentPlaceHolder1$login1$Login1$UserName:prefs.login,
	ctl00$ContentPlaceHolder1$login1$Login1$Password:prefs.password,
	'ctl00$ContentPlaceHolder1$login1$Login1$ImageButton1.x':37,
	'ctl00$ContentPlaceHolder1$login1$Login1$ImageButton1.y':11
    }, addHeaders({Referer: baseurl, Origin: baseurl.replace(/\/$/, '')})); 

    if(!/log out/i.test(html)){
        var error = getParam(html, null, null, /We are unable to process your request/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error("Make sure you have entered right Skywards number and password");
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Could not login to the personal account. Is site changed?');
    }

    var myReplaceTagsAndSpaces = [/,/g, '', replaceTagsAndSpaces]; 

    var result = {success: true};
    getParam(html, result, 'fio', /<div[^>]+id="panel_personal"[^>]*>(?:[\s\S]*?<th[^>]*>){1}([\s\S]*?)<\/th>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Current Tier:([\s\S]*?)(?:<\/td>|<\/li>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'num', /Skywards No:([\s\S]*?)(?:<\/td>|<\/li>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Skywards Miles:([\s\S]*?)(?:<\/td>|<\/li>)/i, myReplaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('burn', 'till')){
    	html = AnyBalance.requestGet(baseurl + 'acc_detail.aspx');
        getParam(html, result, 'till', /<span[^>]+clblExpSummaryDate1[^>]*>([\s\S]*?)<\/span>/ig, replaceTagsAndSpaces, parseDateMoment);
        getParam(html, result, 'burn', /<span[^>]+clblExpSummaryValue1[^>]*>([\s\S]*?)<\/span>/ig, myReplaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}
