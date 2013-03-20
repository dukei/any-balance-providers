 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

GoBaza - виртуальная атс
Сайт оператора: http://www.gobaza.ru
Личный кабинет: https://go2baza.cnt.ru/cnt/

*/

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Origin':'https://go2baza.cnt.ru',
    'Referer':'https://go2baza.cnt.ru/cnt/login.jsp',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.172 Safari/537.22'
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');    

    var baseurl = "https://go2baza.cnt.ru/cnt/";
    
    var html = AnyBalance.requestPost(baseurl + 'login', {
        message:'',
	Name:prefs.login,
	Password:prefs.password,
        submit: 'Войти!'
    }, g_headers);

    var gt = getParam(html, null, null, /<form[^>]+id='goto'[^>]*action='([^']*)/i);
    if(gt){
        html = AnyBalance.requestPost(baseurl + gt, {
            j_username: 'user',
            j_password: ''
        }, g_headers);
    }

    if(!/report\.jsp/i.test(html)){
        var error = getParam(html, null, null, /<input[^>]+name="message"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    html = AnyBalance.requestGet(baseurl + 'report.jsp', g_headers);

    var dt = new Date();
    var today = dt.getDate() + '.' + (dt.getMonth()+1) + '.' + dt.getFullYear();
    html = AnyBalance.requestPost(baseurl + 'report', {
        begin_date:today,
        qty_on_page:30,
        offset:'',
        end_date:today,
        page_number:1,
        filter_id:1,
        make_report:'Сформировать'
    }, g_headers);
    
    var result = {
        success: true
    };

    getParam(html, result, 'balance', /Остаток на счете:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'mins_total', /Общий счетчик[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'mins_total', /В абонентскую плату включено \(минут\):([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'mins_left', /Общий счетчик(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'mins_left', /из них не использовано \(минут\):([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Здравствуйте,([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		
    AnyBalance.setResult(result);
}
