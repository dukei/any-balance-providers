/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.101 Safari/537.36'
};

var baseurl = 'https://mrko.mos.ru/';


function performRequest(method, url, params, headers) {
    if (method == 'post')
        var html = AnyBalance.requestPost(url, params, (g_headers || headers));
    else
        var html = AnyBalance.requestGet(url, headers);

    var captcha_href = getParam(html, null, null, /(dnevnik\/services\/secpic\.php[^"]*)/i);
    if (captcha_href) {
        if(AnyBalance.getLevel() >= 7) {
            AnyBalance.trace('Пытаемся ввести капчу');
            AnyBalance.setOptions({forceCharset: 'base64'})
            var captcha = AnyBalance.requestGet(baseurl+ captcha_href);
            captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
            AnyBalance.setOptions({forceCharset: 'UTF-8'})
            AnyBalance.trace('Капча получена: ' + captchaa);
            
            html = performRequest('post', baseurl + 'dnevnik/index.php', {
                captcha_code_field: captchaa
            }, addHeaders({Referer: baseurl + 'dnevnik/index.php'}));
        } else {
            throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
        }
    }
    
    return html;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('UTF-8'); 
    
    var html = performRequest('get', baseurl + 'dnevnik/index.php');
    
    html = performRequest('post', baseurl + 'dnevnik/services/index.php', {
		login: prefs.login,
		pass: prefs.password,
		password: MD5_hexhash(prefs.password)
	}, addHeaders({Referer: baseurl + 'dnevnik/services/index.php'}));
    
  	if (!/exit/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+style="color:#ff0000"[^>]*>[\s\S]*?([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неправильный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    html = performRequest('get', baseurl + 'dnevnik/services/dnevnik.php?r=3');
    
    var table = getParam(html, null, null, /<table[^>]*class="data"[^>]*>([\s\S]*?)<\/table>/i);
    if(!table) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти таблицу с данными, сайт изменен?');
    }
    
    var result = {success: true};
    
    var lessons = [
        ['английский язык', 'Eng'],
        ['биология', 'Bio'],
        ['география', 'Geo'],
        ['изобразительное искусство', 'Izo'],
        ['история', 'Ist'],
        ['литература', 'Lit'],
        ['математика', 'Mat'],
        ['обществознание \\(включая экономику и право\\)', 'Obsch'],
        ['русский язык', 'Rus'],
        ['музыка', 'Mus'],
        ['алгебра', 'Alg'],
        ['искусство и МХК', 'Mhk'],
        ['физика', 'Fiz'],
        ['геометрия', 'Geom'],
        ['технология', 'Tech'],
        ['Литературное чтение', 'LitReading'],
        ['ОРКСЭ', 'ORKCE'],
        ['Окружающий мир', 'Okr'],
        ['Татарский язык', 'Tat'],
        ['Информатика и ИКТ', 'Infor'],
        ['Физическая культура', 'Phizik'],
        ['Ритмика', 'Ritmix'],
    ];
    
    for(var i = 0; i < lessons.length; i++) {
        var current = lessons[i];
        getMarksAndEngels(table, result, current[0], current[1]);
    }
       
    AnyBalance.setResult(result);
}

function makeManifestCounters(lessons) {
    var counters = '';
    for(var i = 0; i < lessons.length; i++) {
        var current = lessons[i];
        
        counters += '<counter id="balance' + current[1] + '" name="' + current[0] + '" type="text"/>\n';
        counters += '<counter id="balance' + current[1] + '_average" name="' + current[0] + ' - средняя"/>\n';
    }
    AnyBalance.trace(counters);
}

/** :) */
function getMarksAndEngels(table, result, subject, counterSuffix) {
    var marksLine = getParam(table, null, null, new RegExp(subject + '([\\s\\S]*?)</tr>', 'i'));
    var marksArray = sumParam(marksLine, null, null, /<span[^>]*>([\s\S]*?)<\/span>/ig);
    
    var summ = 0;
    for (var i = 0; i < marksArray.length; i++) {
        summ += marksArray[i]*1;
    }
    
    if(isArray(marksArray) && marksArray &&  marksArray[0]) {
        getParam(marksArray.join(', '), result, 'balance' + counterSuffix);
        getParam((summ/marksArray.length).toFixed(1), result, 'balance' + counterSuffix + '_average');    
    }
}