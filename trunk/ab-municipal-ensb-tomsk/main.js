/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.ensb.tomsk.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	html = AnyBalance.requestPost(baseurl, {
        'backurl':'/',
        'AUTH_FORM':'Y',
        'TYPE':'AUTH',
        'USER_LOGIN': prefs.login,
        'USER_PASSWORD': prefs.password,
        'Login':'Войти'
	}, addHeaders({Referer: baseurl}));
    
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /[^>]+class="errortext"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    html = AnyBalance.requestGet(baseurl + 'profile/', g_headers);

    var department = getParam(html, null, null, /name="department" value="([^"]+)/i);
    var departmentId = getParam(html, null, null, /name="departmentId" value="([^"]+)/i);
    var actID = getParam(html, null, null, /name="actID" value="([^"]+)/i);
    
    var today = new Date();
    var monthNumber = today.getMonth()+1;
    var report_year = today.getFullYear(); 
    if(monthNumber == 1) {
        monthNumber = 12;
        report_year = report_year - 1;
    } 
    AnyBalance.trace(monthNumber);
    AnyBalance.trace(report_year);
        
	html = AnyBalance.requestPost(baseurl + 'profile/reports.php', {
        reportID: 'Invoice',
        department: department,
        departmentId: departmentId,
        actID: actID,
        monthNumber: monthNumber,
        reportType: '2',
        month: '',
        report_year: report_year
	}, addHeaders({Referer: baseurl + 'profile/'}));
	
	var result = {success: true};
	
	getParam(html, result, 'balance', />([\d\s\.]*?)<\/nobr>\s*?<\/td>\s*?<\/tr>\s*?<\/table>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /Ф\.И\.О\.([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'period', /СЧЕТ-ИЗВЕЩЕНИЕ[\s\S]*?за(?:[^>]*>)([\s\S]*?)от/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_number', /Л\/СЧЕТ(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}